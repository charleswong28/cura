import { scopeArgsForTenant, TENANT_SCOPED_MODELS } from './tenant.extension';

const TENANT = 'tenant_abc';

// Helper: run scopeArgsForTenant and assert it is not null
function scope(model: string, operation: string, args: Record<string, unknown>) {
  const result = scopeArgsForTenant(model, operation, args, TENANT);
  if (result === null) throw new Error(`Expected non-null result for ${model}.${operation}`);
  return result;
}

describe('scopeArgsForTenant', () => {
  // ── Tenant model bypass ───────────────────────────────────────────────────

  describe('Tenant model (not scoped)', () => {
    it('passes args through unchanged for any operation', () => {
      const args = { where: { clerkOrgId: 'org_1' } };
      expect(scopeArgsForTenant('Tenant', 'findMany', args, TENANT)).toBe(args);
      expect(scopeArgsForTenant('Tenant', 'create', args, TENANT)).toBe(args);
    });
  });

  // ── Tenant-scoped models ──────────────────────────────────────────────────

  describe('scoped models list', () => {
    it('includes User, Candidate, Client, Job', () => {
      for (const m of ['User', 'Candidate', 'Client', 'Job']) {
        expect(TENANT_SCOPED_MODELS.has(m)).toBe(true);
      }
    });

    it('does not include Tenant', () => {
      expect(TENANT_SCOPED_MODELS.has('Tenant')).toBe(false);
    });
  });

  // ── Read operations ───────────────────────────────────────────────────────

  describe('read operations', () => {
    const READ_OPS = ['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'];

    for (const op of READ_OPS) {
      it(`injects tenantId into where for ${op}`, () => {
        const result = scope('Candidate', op, { where: { firstName: 'Alice' } });
        expect(result.where).toEqual({ firstName: 'Alice', tenantId: TENANT });
      });
    }

    it('adds where clause when none was present', () => {
      const result = scope('Candidate', 'findMany', {});
      expect(result.where).toEqual({ tenantId: TENANT });
    });

    it('does not mutate the original args', () => {
      const original = { where: { firstName: 'Bob' } };
      scope('Candidate', 'findMany', original);
      expect(original.where).toEqual({ firstName: 'Bob' });
    });
  });

  // ── findUnique / findUniqueOrThrow ────────────────────────────────────────

  describe('findUnique / findUniqueOrThrow', () => {
    it('returns null for findUnique (signals caller to rewrite to findFirst)', () => {
      expect(scopeArgsForTenant('Candidate', 'findUnique', { where: { id: '1' } }, TENANT)).toBeNull();
    });

    it('returns null for findUniqueOrThrow', () => {
      expect(scopeArgsForTenant('Job', 'findUniqueOrThrow', { where: { id: '1' } }, TENANT)).toBeNull();
    });
  });

  // ── Write-with-where operations ───────────────────────────────────────────

  describe('write-with-where operations', () => {
    const WRITE_WHERE_OPS = ['update', 'updateMany', 'delete', 'deleteMany'];

    for (const op of WRITE_WHERE_OPS) {
      it(`injects tenantId into where for ${op}`, () => {
        const result = scope('Client', op, { where: { id: 'client_1' }, data: { name: 'Acme' } });
        expect(result.where).toEqual({ id: 'client_1', tenantId: TENANT });
      });
    }
  });

  // ── Create operations ─────────────────────────────────────────────────────

  describe('create', () => {
    it('injects tenantId into data', () => {
      const result = scope('Candidate', 'create', { data: { firstName: 'Alice', lastName: 'Smith' } });
      expect(result.data).toEqual({ firstName: 'Alice', lastName: 'Smith', tenantId: TENANT });
    });
  });

  describe('createManyAndReturn', () => {
    it('injects tenantId into data', () => {
      const result = scope('User', 'createManyAndReturn', { data: { email: 'a@b.com' } });
      expect(result.data).toEqual({ email: 'a@b.com', tenantId: TENANT });
    });
  });

  describe('createMany', () => {
    it('injects tenantId into each item when data is an array', () => {
      const result = scope('Candidate', 'createMany', {
        data: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
      });
      expect(result.data).toEqual([
        { firstName: 'Alice', tenantId: TENANT },
        { firstName: 'Bob', tenantId: TENANT },
      ]);
    });

    it('injects tenantId when data is a single object', () => {
      const result = scope('Candidate', 'createMany', { data: { firstName: 'Carol' } });
      expect(result.data).toEqual({ firstName: 'Carol', tenantId: TENANT });
    });
  });

  // ── Upsert ────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    it('injects tenantId into both where and create', () => {
      const result = scope('Client', 'upsert', {
        where: { id: 'c1' },
        create: { name: 'Acme' },
        update: { name: 'Acme Corp' },
      });
      expect(result.where).toEqual({ id: 'c1', tenantId: TENANT });
      expect(result.create).toEqual({ name: 'Acme', tenantId: TENANT });
      // update is left alone — tenantId is already guaranteed by where
      expect(result.update).toEqual({ name: 'Acme Corp' });
    });
  });

  // ── Cross-model consistency ───────────────────────────────────────────────

  describe('all scoped models behave consistently', () => {
    for (const model of ['User', 'Candidate', 'Client', 'Job']) {
      it(`scopes findMany for ${model}`, () => {
        const result = scope(model, 'findMany', {});
        expect((result.where as any).tenantId).toBe(TENANT);
      });

      it(`scopes create for ${model}`, () => {
        const result = scope(model, 'create', { data: {} });
        expect((result.data as any).tenantId).toBe(TENANT);
      });
    }
  });
});
