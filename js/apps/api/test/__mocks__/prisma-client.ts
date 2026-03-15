/**
 * Jest mock for the Prisma generated client.
 *
 * The real generated client uses ESM (import.meta.url) which Jest/ts-jest
 * cannot parse in CJS mode. This provides just enough of the Prisma namespace
 * for unit tests that don't need a live database connection.
 */
export const Prisma = {
  defineExtension: (fn: any) => fn,
};

export class PrismaClient {}
