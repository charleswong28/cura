// Avoid loading mfa.service (and its transitive ESM otplib/@scure/base imports)
// when we're only testing AuthService — we mock MfaService below.
jest.mock("./mfa.service", () => ({
  MfaService: class {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { AuthService } from "./auth.service";

const JWT_SECRET = "test-jwt-secret-of-sufficient-length-for-hs512";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildPrismaMock() {
  return {
    authIdentity: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    teamMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    passwordResetToken: {
      create: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
}

function buildPasswordServiceMock() {
  return {
    verify: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue("$argon2id$new-hash"),
    validateComplexity: jest.fn().mockResolvedValue(undefined),
    isPasswordReused: jest.fn().mockResolvedValue(false),
    saveToHistory: jest.fn().mockResolvedValue(undefined),
  };
}

function buildRedisMock() {
  return {
    getUserVer: jest.fn().mockResolvedValue(0),
    initUserVer: jest.fn().mockResolvedValue(undefined),
    incrUserVer: jest.fn().mockResolvedValue(1),
    incrementRateLimit: jest.fn().mockResolvedValue(1),
    setChallenge: jest.fn().mockResolvedValue(undefined),
    getChallenge: jest.fn().mockResolvedValue(null),
    updateChallenge: jest.fn().mockResolvedValue(undefined),
    deleteChallenge: jest.fn().mockResolvedValue(undefined),
  };
}

function buildMfaMock() {
  return {
    createChallengeToken: jest.fn().mockResolvedValue("mfa_challenge_xyz"),
    getChallengeData: jest.fn(),
    verifyChallenge: jest.fn(),
  };
}

function makeIdentity(overrides: Record<string, unknown> = {}) {
  return {
    id: "ai_1",
    email: "user@example.com",
    passwordHash: "$argon2id$current",
    failedLoginCount: 0,
    lockedUntil: null,
    mfaEnrolled: false,
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    tenantId: "tenant_1",
    firstName: "Ada",
    lastName: "Lovelace",
    loginable: true,
    deletedAt: null,
    ...overrides,
  };
}

describe("AuthService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let passwordService: ReturnType<typeof buildPasswordServiceMock>;
  let redis: ReturnType<typeof buildRedisMock>;
  let mfa: ReturnType<typeof buildMfaMock>;
  let service: AuthService;

  beforeAll(() => {
    process.env["JWT_SECRET"] = JWT_SECRET;
  });

  beforeEach(() => {
    prisma = buildPrismaMock();
    passwordService = buildPasswordServiceMock();
    redis = buildRedisMock();
    mfa = buildMfaMock();
    service = new AuthService(
      prisma as never,
      passwordService as never,
      redis as never,
      mfa as never
    );
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("throws UnauthorizedException when the email does not exist", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(null);
      await expect(service.login("missing@x.com", "p", undefined)).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("throws when the account is currently locked", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(
        makeIdentity({ lockedUntil: new Date(Date.now() + 60_000) })
      );
      await expect(service.login("u@x.com", "p", undefined)).rejects.toThrow(/Account locked/);
    });

    it("increments failedLoginCount on a wrong password", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity({ failedLoginCount: 2 }));
      passwordService.verify.mockResolvedValueOnce(false);

      await expect(service.login("u@x.com", "wrong", undefined)).rejects.toBeInstanceOf(
        UnauthorizedException
      );
      expect(prisma.authIdentity.update).toHaveBeenCalledWith({
        where: { id: "ai_1" },
        data: { failedLoginCount: 3 },
      });
    });

    it("locks the account once failedLoginCount reaches the threshold", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity({ failedLoginCount: 4 }));
      passwordService.verify.mockResolvedValueOnce(false);

      await expect(service.login("u@x.com", "wrong", undefined)).rejects.toBeInstanceOf(
        UnauthorizedException
      );

      const updateArgs = prisma.authIdentity.update.mock.calls[0]![0]!;
      expect(updateArgs.data.failedLoginCount).toBe(5);
      expect(updateArgs.data.lockedUntil).toBeInstanceOf(Date);
    });

    it("returns an MFA challenge instead of a session when MFA is enrolled", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity({ mfaEnrolled: true }));

      const result = await service.login("u@x.com", "p", "acme");

      expect(result).toEqual({ mfaRequired: true, mfaChallengeToken: "mfa_challenge_xyz" });
      expect(mfa.createChallengeToken).toHaveBeenCalledWith("ai_1", "acme");
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it("rejects login when the user is not loginable", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.user.findFirst.mockResolvedValueOnce(makeUser({ loginable: false }));

      await expect(service.login("u@x.com", "p", undefined)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("scopes the user lookup by tenant when tenantSlug is provided", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: "tenant_acme", slug: "acme" });
      prisma.user.findFirst.mockResolvedValueOnce(makeUser({ tenantId: "tenant_acme" }));

      await service.login("u@x.com", "p", "acme");

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: "acme" } });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { authIdentityId: "ai_1", tenantId: "tenant_acme", deletedAt: null },
      });
    });

    it("throws when the requested tenant slug does not exist", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(service.login("u@x.com", "p", "missing-tenant")).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it("issues a session, resets the lockout counter, and signs an HS512 access token", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity({ failedLoginCount: 2 }));
      prisma.user.findFirst.mockResolvedValueOnce(makeUser());
      redis.getUserVer.mockResolvedValueOnce(7);
      prisma.teamMember.findMany.mockResolvedValueOnce([
        { team: { shortId: 11 }, role: "LEAD" },
        { team: { shortId: 22 }, role: "MEMBER" },
      ]);
      prisma.userRole.findMany.mockResolvedValueOnce([
        { role: { name: "recruiter" } },
        { role: { name: "viewer" } },
      ]);

      const result = await service.login("u@x.com", "p", undefined, "10.0.0.1", "jest");

      // Lockout reset
      expect(prisma.authIdentity.update).toHaveBeenCalledWith({
        where: { id: "ai_1" },
        data: { failedLoginCount: 0, lockedUntil: null },
      });

      // Session row written
      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      const sessionData = prisma.session.create.mock.calls[0]![0]!.data;
      expect(sessionData.authIdentityId).toBe("ai_1");
      expect(sessionData.userId).toBe("user_1");
      expect(sessionData.ip).toBe("10.0.0.1");
      expect(sessionData.userAgent).toBe("jest");
      expect(sessionData.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);

      // Tokens
      expect("accessToken" in result).toBe(true);
      const session = result as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; displayName: string; tenantId: string };
      };
      expect(session.refreshToken).toMatch(/^[a-f0-9]{96}$/);

      const decoded = jwt.verify(session.accessToken, JWT_SECRET, {
        algorithms: ["HS512"],
      }) as Record<string, unknown>;
      expect(decoded.sub).toBe("user_1");
      expect(decoded.tid).toBe("tenant_1");
      expect(decoded.ver).toBe(7);
      expect(decoded.teams).toEqual([
        { id: 11, r: "L" },
        { id: 22, r: "M" },
      ]);
      expect(decoded.roles).toEqual(["recruiter", "viewer"]);

      // Side effects
      expect(redis.initUserVer).toHaveBeenCalledWith("user_1");
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: "user_1", firstLogin: null },
        data: { firstLogin: expect.any(Date) },
      });

      expect(session.user).toEqual({
        id: "user_1",
        displayName: "Ada Lovelace",
        tenantId: "tenant_1",
      });
    });
  });

  // ── completeMfaLogin ───────────────────────────────────────────────────────

  describe("completeMfaLogin", () => {
    it("throws when the challenge token is unknown", async () => {
      mfa.getChallengeData.mockResolvedValueOnce(null);
      await expect(service.completeMfaLogin("bad", "123456")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("issues a session after a verified MFA challenge", async () => {
      mfa.getChallengeData.mockResolvedValueOnce({ authIdentityId: "ai_1" });
      mfa.verifyChallenge.mockResolvedValueOnce("ai_1");
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.user.findFirst.mockResolvedValueOnce(makeUser());

      const result = await service.completeMfaLogin("token_1", "123456");

      expect(mfa.verifyChallenge).toHaveBeenCalledWith("token_1", "123456");
      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe("refresh", () => {
    const RAW = "abc".repeat(20);

    function makeSession(overrides: Record<string, unknown> = {}) {
      return {
        id: "sess_1",
        userId: "user_1",
        refreshTokenHash: sha256(RAW),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86_400_000),
        user: makeUser(),
        authIdentity: makeIdentity(),
        ...overrides,
      };
    }

    it("rejects when the refresh token is unknown", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await expect(service.refresh(RAW)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("detects token reuse — revokes all sessions and bumps user_ver", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(makeSession({ revokedAt: new Date() }));

      await expect(service.refresh(RAW)).rejects.toThrow(/reuse detected/);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(redis.incrUserVer).toHaveBeenCalledWith("user_1");
    });

    it("rejects expired refresh tokens", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(
        makeSession({ expiresAt: new Date(Date.now() - 1000) })
      );
      await expect(service.refresh(RAW)).rejects.toThrow(/expired/);
    });

    it("rejects when the user has been deactivated", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(
        makeSession({ user: makeUser({ loginable: false }) })
      );
      await expect(service.refresh(RAW)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rotates the refresh token and issues a new access token", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(makeSession());

      const result = await service.refresh(RAW);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "sess_1" },
        data: {
          refreshTokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          lastUsedAt: expect.any(Date),
        },
      });
      const updatedHash = prisma.session.update.mock.calls[0]![0]!.data.refreshTokenHash;
      expect(updatedHash).not.toBe(sha256(RAW));
      expect(result.refreshToken).not.toBe(RAW);

      const decoded = jwt.verify(result.accessToken, JWT_SECRET, {
        algorithms: ["HS512"],
      }) as Record<string, unknown>;
      expect(decoded.sub).toBe("user_1");
    });
  });

  // ── logout / logoutAll ────────────────────────────────────────────────────

  describe("logout", () => {
    const RAW = "logout-token";

    it("is a no-op when the refresh token is unknown", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await service.logout(RAW);
      expect(prisma.session.update).not.toHaveBeenCalled();
      expect(redis.incrUserVer).not.toHaveBeenCalled();
    });

    it("is a no-op when the session is already revoked", async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: "s",
        userId: "u",
        revokedAt: new Date(),
      });
      await service.logout(RAW);
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    it("revokes the session and bumps user_ver", async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: "s",
        userId: "user_1",
        revokedAt: null,
      });

      await service.logout(RAW);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "s" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(redis.incrUserVer).toHaveBeenCalledWith("user_1");
    });
  });

  describe("logoutAll", () => {
    it("revokes every active session for the user", async () => {
      prisma.session.findUnique.mockResolvedValueOnce({
        id: "s",
        userId: "user_1",
        revokedAt: null,
      });

      await service.logoutAll("token");

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: "user_1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(redis.incrUserVer).toHaveBeenCalledWith("user_1");
    });

    it("is a no-op when the refresh token is unknown", async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null);
      await service.logoutAll("token");
      expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── requestPasswordReset ───────────────────────────────────────────────────

  describe("requestPasswordReset", () => {
    it("rate-limits and silently drops once the per-hour limit is exceeded", async () => {
      redis.incrementRateLimit.mockResolvedValueOnce(4);
      await service.requestPasswordReset("u@x.com");
      expect(prisma.authIdentity.findUnique).not.toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("silently returns when the email is unknown (no enumeration leak)", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(null);
      await service.requestPasswordReset("u@x.com");
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it("creates a hashed reset token row with a one-hour expiry", async () => {
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());

      await service.requestPasswordReset("u@x.com");

      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const data = prisma.passwordResetToken.create.mock.calls[0]![0]!.data;
      expect(data.authIdentityId).toBe("ai_1");
      expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      const ttlMs = data.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(59 * 60_000);
      expect(ttlMs).toBeLessThan(61 * 60_000);
    });
  });

  // ── confirmPasswordReset ───────────────────────────────────────────────────

  describe("confirmPasswordReset", () => {
    function makeToken(overrides: Record<string, unknown> = {}) {
      return {
        id: "tok_1",
        authIdentityId: "ai_1",
        tokenHash: sha256("raw"),
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        ...overrides,
      };
    }

    it("rejects an unknown token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(null);
      await expect(service.confirmPasswordReset("raw", "NewPass1!")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rejects a token that has already been used", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(makeToken({ usedAt: new Date() }));
      await expect(service.confirmPasswordReset("raw", "NewPass1!")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rejects an expired token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(
        makeToken({ expiresAt: new Date(Date.now() - 60_000) })
      );
      await expect(service.confirmPasswordReset("raw", "NewPass1!")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws NotFound when the identity referenced by the token is gone", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(makeToken());
      prisma.authIdentity.findUnique.mockResolvedValueOnce(null);
      await expect(service.confirmPasswordReset("raw", "NewPass1!")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("rejects passwords that fail policy validation", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(makeToken());
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.user.findFirst.mockResolvedValueOnce(makeUser());
      passwordService.validateComplexity.mockRejectedValueOnce(
        new BadRequestException("Too short.")
      );
      await expect(service.confirmPasswordReset("raw", "weak")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("rejects passwords reused from history", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(makeToken());
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.user.findFirst.mockResolvedValueOnce(makeUser());
      passwordService.isPasswordReused.mockResolvedValueOnce(true);
      await expect(service.confirmPasswordReset("raw", "NewPass1!")).rejects.toThrow(
        /used recently/
      );
    });

    it("hashes, saves history, marks token used, and revokes all sessions across tenants", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(makeToken());
      prisma.authIdentity.findUnique.mockResolvedValueOnce(makeIdentity());
      prisma.user.findFirst.mockResolvedValueOnce(makeUser());
      prisma.user.findMany.mockResolvedValueOnce([{ id: "user_1" }, { id: "user_2" }]);

      await service.confirmPasswordReset("raw", "NewPass1!");

      expect(passwordService.saveToHistory).toHaveBeenCalledWith(
        "ai_1",
        "$argon2id$current",
        "tenant_1"
      );
      expect(prisma.authIdentity.update).toHaveBeenCalledWith({
        where: { id: "ai_1" },
        data: { passwordHash: "$argon2id$new-hash" },
      });
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: "tok_1" },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledTimes(2);
      expect(redis.incrUserVer).toHaveBeenCalledWith("user_1");
      expect(redis.incrUserVer).toHaveBeenCalledWith("user_2");
    });
  });
});
