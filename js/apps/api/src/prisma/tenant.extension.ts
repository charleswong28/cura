import { Prisma } from '../generated/prisma/client';

/**
 * Models that carry a tenantId column.
 * Tenant itself is the root entity — it IS the tenant, so it is never scoped.
 */
export const TENANT_SCOPED_MODELS = new Set(['User', 'Candidate', 'Client', 'Job']);

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_WHERE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

type Args = Record<string, unknown>;

/**
 * Pure function: returns a modified args object with tenantId applied for the
 * given model + operation.
 *
 * Returns `null` for `findUnique` / `findUniqueOrThrow` because those ops must
 * be rewritten to `findFirst` / `findFirstOrThrow` (Prisma validates the where
 * clause against the unique constraint and would reject an extra tenantId field).
 * The caller is responsible for handling the null case.
 *
 * Returns the original args unchanged when the model is not tenant-scoped.
 *
 * Exported so it can be unit-tested independently of the Prisma extension machinery.
 */
export function scopeArgsForTenant(
  model: string,
  operation: string,
  args: Args,
  tenantId: string,
): Args | null {
  if (!TENANT_SCOPED_MODELS.has(model)) return args;

  // findUnique / findUniqueOrThrow must be rewritten by the caller
  if (operation === 'findUnique' || operation === 'findUniqueOrThrow') return null;

  if (READ_OPS.has(operation) || WRITE_WHERE_OPS.has(operation)) {
    return { ...args, where: { ...(args.where as object), tenantId } };
  }

  if (operation === 'create' || operation === 'createManyAndReturn') {
    return { ...args, data: { ...(args.data as object), tenantId } };
  }

  if (operation === 'createMany') {
    return {
      ...args,
      data: Array.isArray(args.data)
        ? (args.data as object[]).map((d) => ({ ...d, tenantId }))
        : { ...(args.data as object), tenantId },
    };
  }

  if (operation === 'upsert') {
    return {
      ...args,
      where: { ...(args.where as object), tenantId },
      create: { ...(args.create as object), tenantId },
    };
  }

  // Unrecognised operation — no scoping applied
  return args;
}

/**
 * Returns a Prisma client extension that transparently scopes every query to
 * the given tenant.  Apply it via `prismaService.forTenant(tenantId)`.
 *
 * Usage:
 *   const db = prismaService.forTenant(tenantId);
 *   const candidates = await db.candidate.findMany(); // tenantId injected automatically
 */
export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // findUnique / findUniqueOrThrow: rewrite to findFirst / findFirstOrThrow
            // so the extra tenantId filter doesn't violate Prisma's unique-key validation.
            if (
              TENANT_SCOPED_MODELS.has(model) &&
              (operation === 'findUnique' || operation === 'findUniqueOrThrow')
            ) {
              const accessor = (model.charAt(0).toLowerCase() +
                model.slice(1)) as keyof typeof client;
              const scopedWhere = { ...(args as Args).where as object, tenantId };
              return operation === 'findUnique'
                ? (client[accessor] as any).findFirst({ ...(args as Args), where: scopedWhere })
                : (client[accessor] as any).findFirstOrThrow({
                    ...(args as Args),
                    where: scopedWhere,
                  });
            }

            const scoped = scopeArgsForTenant(model, operation, args as Args, tenantId);
            return query(scoped ?? args);
          },
        },
      },
    }),
  );
}
