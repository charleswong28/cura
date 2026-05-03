import { PermissionCacheService } from "./permission-cache.service";

function buildPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    userRole: { findMany: jest.fn() },
  };
}

describe("PermissionCacheService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PermissionCacheService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PermissionCacheService(prisma as never);
  });

  describe("getFunctionalPermissions", () => {
    it("returns the union of permissions across all of the user's roles", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ etag: new Date(1700000000000) }]);
      prisma.userRole.findMany.mockResolvedValueOnce([
        {
          role: {
            tenantId: null,
            permissions: ["candidate:view_all", "candidate:edit"],
          },
        },
        { role: { tenantId: "tenant_1", permissions: ["client:view_all"] } },
      ]);

      const perms = await service.getFunctionalPermissions("user_1", "tenant_1");
      expect(perms).toEqual(new Set(["candidate:view_all", "candidate:edit", "client:view_all"]));
    });

    it("filters out roles scoped to a different tenant", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ etag: new Date(1) }]);
      prisma.userRole.findMany.mockResolvedValueOnce([
        { role: { tenantId: "tenant_other", permissions: ["candidate:view_all"] } },
      ]);

      const perms = await service.getFunctionalPermissions("user_1", "tenant_1");
      expect(perms.size).toBe(0);
    });

    it("short-circuits to ['*:*'] when the user has the admin wildcard", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ etag: new Date(1) }]);
      prisma.userRole.findMany.mockResolvedValueOnce([
        { role: { tenantId: null, permissions: ["candidate:view_all", "*:*"] } },
        { role: { tenantId: "tenant_1", permissions: ["client:edit"] } },
      ]);

      const perms = await service.getFunctionalPermissions("user_1", "tenant_1");
      expect(perms).toEqual(new Set(["*:*"]));
    });

    it("returns an empty set when the user has no roles", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      prisma.userRole.findMany.mockResolvedValueOnce([]);
      const perms = await service.getFunctionalPermissions("user_1", "tenant_1");
      expect(perms.size).toBe(0);
    });

    it("returns the cached set when the ETag is unchanged (no second DB fetch)", async () => {
      const etag = new Date(1700000000000);
      prisma.$queryRaw.mockResolvedValue([{ etag }]);
      prisma.userRole.findMany.mockResolvedValueOnce([
        { role: { tenantId: null, permissions: ["candidate:view_all"] } },
      ]);

      const first = await service.getFunctionalPermissions("user_1", "tenant_1");
      const second = await service.getFunctionalPermissions("user_1", "tenant_1");

      expect(second).toBe(first); // identity check — same Set instance
      expect(prisma.userRole.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("re-fetches when the ETag changes (e.g. role updated_at advances)", async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ etag: new Date(1000) }])
        .mockResolvedValueOnce([{ etag: new Date(2000) }]);
      prisma.userRole.findMany
        .mockResolvedValueOnce([{ role: { tenantId: null, permissions: ["candidate:view"] } }])
        .mockResolvedValueOnce([{ role: { tenantId: null, permissions: ["candidate:edit"] } }]);

      const first = await service.getFunctionalPermissions("u1", "t1");
      const second = await service.getFunctionalPermissions("u1", "t1");

      expect(first).toEqual(new Set(["candidate:view"]));
      expect(second).toEqual(new Set(["candidate:edit"]));
      expect(prisma.userRole.findMany).toHaveBeenCalledTimes(2);
    });

    it("keeps separate cache entries per (userId, tenantId)", async () => {
      prisma.$queryRaw.mockResolvedValue([{ etag: new Date(1) }]);
      prisma.userRole.findMany
        .mockResolvedValueOnce([{ role: { tenantId: "t1", permissions: ["a"] } }])
        .mockResolvedValueOnce([{ role: { tenantId: "t2", permissions: ["b"] } }]);

      const t1 = await service.getFunctionalPermissions("user_1", "t1");
      const t2 = await service.getFunctionalPermissions("user_1", "t2");

      expect(t1).toEqual(new Set(["a"]));
      expect(t2).toEqual(new Set(["b"]));
      expect(prisma.userRole.findMany).toHaveBeenCalledTimes(2);
    });

    it("does not cache when the ETag query throws (each error produces a unique etag)", async () => {
      prisma.$queryRaw.mockRejectedValue(new Error("db down"));
      prisma.userRole.findMany.mockResolvedValue([]);
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
      // Force Date.now to advance between calls so the error etag is unique.
      const nowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      await service.getFunctionalPermissions("u1", "t1");
      await service.getFunctionalPermissions("u1", "t1");

      expect(prisma.userRole.findMany).toHaveBeenCalledTimes(2);
      nowSpy.mockRestore();
      errSpy.mockRestore();
    });
  });
});
