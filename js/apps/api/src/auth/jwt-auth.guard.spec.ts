import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import { JwtAuthGuard } from "./jwt-auth.guard";

const JWT_SECRET = "test-jwt-secret-of-sufficient-length-for-hs512";

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS512", expiresIn: 60 });
}

describe("JwtAuthGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { team: { findUnique: jest.Mock } };
  let redis: { getUserVer: jest.Mock };
  let permCache: { getFunctionalPermissions: jest.Mock };
  let guard: JwtAuthGuard;

  beforeAll(() => {
    process.env["JWT_SECRET"] = JWT_SECRET;
  });

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    prisma = { team: { findUnique: jest.fn() } };
    redis = { getUserVer: jest.fn().mockResolvedValue(0) };
    permCache = { getFunctionalPermissions: jest.fn().mockResolvedValue(new Set()) };
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      prisma as never,
      redis as never,
      permCache as never
    );
  });

  it("allows the request when the route is marked @Public()", async () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === IS_PUBLIC_KEY);
    const ctx = buildContext({ headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("rejects when no Authorization header is present", async () => {
    const ctx = buildContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when the Authorization header is not a Bearer token", async () => {
    const ctx = buildContext({ headers: { authorization: "Basic abc" } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unverifiable JWT (malformed or wrong secret)", async () => {
    const malformed = buildContext({ headers: { authorization: "Bearer not-a-real-jwt" } });
    await expect(guard.canActivate(malformed)).rejects.toThrow(/Invalid or expired token/);

    const wrongSecret = jwt.sign({ sub: "u1" }, "another-secret-of-sufficient-length", {
      algorithm: "HS512",
    });
    const wrongSecretCtx = buildContext({ headers: { authorization: `Bearer ${wrongSecret}` } });
    await expect(guard.canActivate(wrongSecretCtx)).rejects.toThrow(/Invalid or expired token/);
  });

  it("flags JWT_STALE when the Redis user_ver disagrees with the token", async () => {
    redis.getUserVer.mockResolvedValueOnce(5);
    const token = signToken({ sub: "u1", tid: "t1", sid: "s1", ver: 2, teams: [], roles: [] });
    const ctx = buildContext({ headers: { authorization: `Bearer ${token}` } });

    try {
      await guard.canActivate(ctx);
      fail("expected guard to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect((err as { code?: string }).code).toBe("JWT_STALE");
    }
  });

  it("hydrates RequestUser onto req.user with resolved teams, permissions, and roles", async () => {
    redis.getUserVer.mockResolvedValueOnce(2);
    prisma.team.findUnique
      .mockResolvedValueOnce({ id: "team_ulid_1" })
      .mockResolvedValueOnce({ id: "team_ulid_2" });
    permCache.getFunctionalPermissions.mockResolvedValueOnce(
      new Set(["candidate:view_all", "client:edit"])
    );
    const token = signToken({
      sub: "user_1",
      tid: "tenant_1",
      sid: "sess_1",
      ver: 2,
      teams: [
        { id: 1, r: "L" },
        { id: 2, r: "M" },
      ],
      roles: ["recruiter"],
    });

    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = buildContext(request);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(request.user).toEqual({
      userId: "user_1",
      tenantId: "tenant_1",
      sessionId: "sess_1",
      version: 2,
      teams: [
        { id: "team_ulid_1", role: "LEAD" },
        { id: "team_ulid_2", role: "MEMBER" },
      ],
      roles: ["recruiter"],
      permissions: new Set(["candidate:view_all", "client:edit"]),
    });
  });

  it("falls back to the stringified shortId when no team row exists for that shortId", async () => {
    redis.getUserVer.mockResolvedValueOnce(0);
    prisma.team.findUnique.mockResolvedValueOnce(null);
    const token = signToken({
      sub: "u1",
      tid: "t1",
      sid: "s1",
      ver: 0,
      teams: [{ id: 999, r: "M" }],
      roles: [],
    });
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    await guard.canActivate(buildContext(request));
    expect(request.user.teams).toEqual([{ id: "999", role: "MEMBER" }]);
  });

  it("treats missing teams/roles claims as empty arrays", async () => {
    redis.getUserVer.mockResolvedValueOnce(0);
    const token = signToken({ sub: "u1", tid: "t1", sid: "s1", ver: 0 });
    const request: any = { headers: { authorization: `Bearer ${token}` } };
    await guard.canActivate(buildContext(request));
    expect(request.user.teams).toEqual([]);
    expect(request.user.roles).toEqual([]);
  });
});
