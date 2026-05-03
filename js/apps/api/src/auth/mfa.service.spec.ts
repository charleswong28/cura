// otplib transitively imports @scure/base which ships ESM and crashes Jest's CJS
// loader. We mock otplib with deterministic stubs so we can drive the TOTP and
// challenge logic without touching the real library.
jest.mock("otplib", () => {
  const codes = new Map<string, string>();
  return {
    __codes: codes,
    generateSecret: jest.fn(() => "JBSWY3DPEHPK3PXP"),
    generateURI: jest.fn(
      ({ issuer, label, secret }: { issuer: string; label: string; secret: string }) =>
        `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`
    ),
    verifySync: jest.fn(({ token, secret }: { token: string; secret: string }) => ({
      valid: codes.get(secret) === token,
    })),
  };
});

import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import * as otplib from "otplib";
import { MfaService } from "./mfa.service";

const otplibCodes = (otplib as unknown as { __codes: Map<string, string> }).__codes;

const MFA_SECRET = "test-mfa-secret-with-good-entropy";

function buildPrismaMock() {
  return {
    mfaDevice: {
      create: jest.fn().mockResolvedValue(undefined),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    authIdentity: {
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
}

function buildRedisMock() {
  return {
    setChallenge: jest.fn().mockResolvedValue(undefined),
    getChallenge: jest.fn().mockResolvedValue(null),
    updateChallenge: jest.fn().mockResolvedValue(undefined),
    deleteChallenge: jest.fn().mockResolvedValue(undefined),
  };
}

describe("MfaService", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let redis: ReturnType<typeof buildRedisMock>;
  let service: MfaService;

  beforeAll(() => {
    process.env["MFA_SECRET"] = MFA_SECRET;
  });

  beforeEach(() => {
    prisma = buildPrismaMock();
    redis = buildRedisMock();
    service = new MfaService(prisma as never, redis as never);
    otplibCodes.clear();
  });

  // ── Enrolment ──────────────────────────────────────────────────────────────

  describe("startEnrol", () => {
    it("returns an otpauth URL and stores an encrypted secret in Redis for 5 min", async () => {
      const result = await service.startEnrol("ai_1", "u@x.com");

      expect(result.otpauthUrl).toContain("otpauth://totp/Cura:u@x.com");
      expect(result.secret).toBe("JBSWY3DPEHPK3PXP");

      expect(redis.setChallenge).toHaveBeenCalledTimes(1);
      const [key, payload, ttl] = redis.setChallenge.mock.calls[0]!;
      expect(key).toBe("enrol:ai_1");
      expect(ttl).toBe(300);
      expect((payload as { secretEncrypted: string }).secretEncrypted).toMatch(
        /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/
      );
    });

    it("encrypts secrets uniquely per call (random IV)", async () => {
      await service.startEnrol("ai_1", "u@x.com");
      await service.startEnrol("ai_1", "u@x.com");
      const first = (redis.setChallenge.mock.calls[0]![1] as { secretEncrypted: string })
        .secretEncrypted;
      const second = (redis.setChallenge.mock.calls[1]![1] as { secretEncrypted: string })
        .secretEncrypted;
      expect(first).not.toBe(second);
    });
  });

  describe("confirmEnrol", () => {
    it("throws when there is no pending enrolment", async () => {
      redis.getChallenge.mockResolvedValueOnce(null);
      await expect(service.confirmEnrol("ai_1", "123456")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it("throws on an invalid TOTP code", async () => {
      // Run startEnrol so we get a valid encrypted secret to round-trip
      await service.startEnrol("ai_1", "u@x.com");
      const { secretEncrypted } = redis.setChallenge.mock.calls[0]![1] as {
        secretEncrypted: string;
      };
      redis.getChallenge.mockResolvedValueOnce({ secretEncrypted });

      // No matching code registered → verifySync returns invalid
      await expect(service.confirmEnrol("ai_1", "wrong")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
      expect(prisma.mfaDevice.create).not.toHaveBeenCalled();
    });

    it("on success: creates MfaDevice, marks identity enrolled, returns 10 backup codes", async () => {
      await service.startEnrol("ai_1", "u@x.com");
      const { secretEncrypted } = redis.setChallenge.mock.calls[0]![1] as {
        secretEncrypted: string;
      };
      redis.getChallenge.mockResolvedValueOnce({ secretEncrypted });
      otplibCodes.set("JBSWY3DPEHPK3PXP", "999111");

      const codes = await service.confirmEnrol("ai_1", "999111");

      expect(codes).toHaveLength(10);
      // each backup code is 5 random bytes -> 10 hex chars
      for (const code of codes) {
        expect(code).toMatch(/^[a-f0-9]{10}$/);
      }

      expect(prisma.mfaDevice.create).toHaveBeenCalledTimes(1);
      const created = prisma.mfaDevice.create.mock.calls[0]![0]!.data;
      expect(created.authIdentityId).toBe("ai_1");
      expect(created.secretEncrypted).toBe(secretEncrypted);
      expect(created.backupCodesHashed).toHaveLength(10);
      for (const hash of created.backupCodesHashed) {
        expect(hash.startsWith("$argon2id$")).toBe(true);
      }

      expect(prisma.authIdentity.update).toHaveBeenCalledWith({
        where: { id: "ai_1" },
        data: { mfaEnrolled: true },
      });
      expect(redis.deleteChallenge).toHaveBeenCalledWith("enrol:ai_1");
    });
  });

  // ── Challenge token ────────────────────────────────────────────────────────

  describe("createChallengeToken", () => {
    it("stores the challenge in Redis and returns a token containing a ULID and random suffix", async () => {
      const token = await service.createChallengeToken("ai_1", "acme");
      expect(token).toMatch(/^[A-Z0-9]{26}_[a-f0-9]{32}$/);
      expect(redis.setChallenge).toHaveBeenCalledWith(
        token,
        { authIdentityId: "ai_1", tenantSlug: "acme", fails: 0 },
        300
      );
    });
  });

  describe("getChallengeData", () => {
    it("returns the stored challenge payload", async () => {
      redis.getChallenge.mockResolvedValueOnce({
        authIdentityId: "ai_1",
        tenantSlug: undefined,
        fails: 0,
      });
      const data = await service.getChallengeData("tok");
      expect(data).toEqual({ authIdentityId: "ai_1", tenantSlug: undefined, fails: 0 });
    });
  });

  // ── verifyChallenge ────────────────────────────────────────────────────────

  describe("verifyChallenge", () => {
    async function setupDevice(opts: { backupCodes?: string[] } = {}) {
      // Use startEnrol to get a valid encrypted secret payload
      await service.startEnrol("ai_1", "u@x.com");
      const { secretEncrypted } = redis.setChallenge.mock.calls[0]![1] as {
        secretEncrypted: string;
      };
      const backupCodesHashed = await Promise.all(
        (opts.backupCodes ?? []).map((c) => argon2.hash(c, { type: argon2.argon2id }))
      );
      const device = {
        id: "dev_1",
        authIdentityId: "ai_1",
        secretEncrypted,
        backupCodesHashed,
      };
      prisma.mfaDevice.findFirst.mockResolvedValue(device);
      return { device, secretEncrypted };
    }

    it("rejects when the challenge is missing/expired", async () => {
      redis.getChallenge.mockResolvedValueOnce(null);
      await expect(service.verifyChallenge("tok", "123456")).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });

    it("locks the challenge if fails has already reached 3", async () => {
      redis.getChallenge.mockResolvedValueOnce({
        authIdentityId: "ai_1",
        fails: 3,
      });
      await expect(service.verifyChallenge("tok", "111111")).rejects.toThrow(
        /Too many failed attempts/
      );
      expect(redis.deleteChallenge).toHaveBeenCalledWith("tok");
    });

    it("throws NotFound when the user has no MFA device", async () => {
      redis.getChallenge.mockResolvedValueOnce({ authIdentityId: "ai_1", fails: 0 });
      prisma.mfaDevice.findFirst.mockResolvedValueOnce(null);
      await expect(service.verifyChallenge("tok", "111111")).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it("on a valid TOTP: updates lastVerifiedAt, deletes challenge, returns identity id", async () => {
      await setupDevice();
      otplibCodes.set("JBSWY3DPEHPK3PXP", "424242");
      redis.getChallenge.mockResolvedValueOnce({ authIdentityId: "ai_1", fails: 0 });

      const id = await service.verifyChallenge("tok", "424242");

      expect(id).toBe("ai_1");
      expect(prisma.mfaDevice.update).toHaveBeenCalledWith({
        where: { id: "dev_1" },
        data: { lastVerifiedAt: expect.any(Date) },
      });
      expect(redis.deleteChallenge).toHaveBeenCalledWith("tok");
    });

    it("on a valid backup code: removes it from device and returns identity id", async () => {
      await setupDevice({ backupCodes: ["abcd1234ef", "ffeeddccbb"] });
      redis.getChallenge.mockResolvedValueOnce({ authIdentityId: "ai_1", fails: 0 });

      const id = await service.verifyChallenge("tok", "abcd1234ef");

      expect(id).toBe("ai_1");
      const updateData = prisma.mfaDevice.update.mock.calls[0]![0]!.data;
      expect(updateData.backupCodesHashed).toHaveLength(1);
      expect(redis.deleteChallenge).toHaveBeenCalledWith("tok");
    });

    it("on an invalid code: increments fails and returns remaining attempts", async () => {
      await setupDevice();
      redis.getChallenge.mockResolvedValueOnce({ authIdentityId: "ai_1", fails: 0 });

      await expect(service.verifyChallenge("tok", "wrong")).rejects.toThrow(/2 attempt/);
      expect(redis.updateChallenge).toHaveBeenCalledWith(
        "tok",
        { authIdentityId: "ai_1", fails: 1 },
        300
      );
    });

    it("on the third invalid attempt: deletes the challenge and locks", async () => {
      await setupDevice();
      redis.getChallenge.mockResolvedValueOnce({ authIdentityId: "ai_1", fails: 2 });

      await expect(service.verifyChallenge("tok", "wrong")).rejects.toThrow(
        /Too many failed attempts/
      );
      expect(redis.deleteChallenge).toHaveBeenCalledWith("tok");
      expect(redis.updateChallenge).not.toHaveBeenCalled();
    });
  });
});
