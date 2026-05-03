import { BadRequestException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PasswordService } from "./password.service";

type PrismaMock = {
  passwordPolicy: { findFirst: jest.Mock };
  passwordHistory: { findMany: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    passwordPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
    passwordHistory: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("PasswordService", () => {
  let prisma: PrismaMock;
  let service: PasswordService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PasswordService(prisma as unknown as never);
  });

  describe("hash + verify", () => {
    it("hash returns an argon2id string and verify accepts the original password", async () => {
      const hash = await service.hash("Sup3rSecret!");
      expect(hash.startsWith("$argon2id$")).toBe(true);
      expect(await service.verify(hash, "Sup3rSecret!")).toBe(true);
    });

    it("verify returns false on a wrong password", async () => {
      const hash = await service.hash("Sup3rSecret!");
      expect(await service.verify(hash, "wrong")).toBe(false);
    });

    it("verify returns false on a malformed hash instead of throwing", async () => {
      expect(await service.verify("not-a-real-hash", "anything")).toBe(false);
    });
  });

  describe("validateComplexity — default policy (no row in DB)", () => {
    it("accepts a password meeting all defaults (>=8 chars, upper, lower, digit)", async () => {
      await expect(service.validateComplexity("Abcdef12")).resolves.toBeUndefined();
    });

    it("rejects a password shorter than 8 chars", async () => {
      await expect(service.validateComplexity("Ab1cd")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a password with no uppercase", async () => {
      await expect(service.validateComplexity("abcdef12")).rejects.toThrow(/uppercase/);
    });

    it("rejects a password with no lowercase", async () => {
      await expect(service.validateComplexity("ABCDEF12")).rejects.toThrow(/lowercase/);
    });

    it("rejects a password with no digit", async () => {
      await expect(service.validateComplexity("Abcdefgh")).rejects.toThrow(/digit/);
    });

    it("aggregates multiple violations in one error message", async () => {
      try {
        await service.validateComplexity("abc");
        fail("expected BadRequestException");
      } catch (err) {
        const e = err as BadRequestException;
        const msg = (e.getResponse() as { message: string }).message;
        expect(msg).toMatch(/At least 8/);
        expect(msg).toMatch(/uppercase/);
        expect(msg).toMatch(/digit/);
      }
    });
  });

  describe("validateComplexity — tenant policy override", () => {
    it("uses tenant minLength and requireSymbol when present", async () => {
      prisma.passwordPolicy.findFirst.mockResolvedValueOnce({
        minLength: 12,
        requireUpper: true,
        requireLower: true,
        requireDigit: true,
        requireSymbol: true,
      });
      await expect(service.validateComplexity("Abcdef12!xyz", "tenant_1")).resolves.toBeUndefined();
      expect(prisma.passwordPolicy.findFirst).toHaveBeenCalledWith({
        where: { tenantId: "tenant_1" },
      });
    });

    it("rejects when tenant policy requires symbol and password has none", async () => {
      prisma.passwordPolicy.findFirst.mockResolvedValueOnce({
        minLength: 8,
        requireUpper: true,
        requireLower: true,
        requireDigit: true,
        requireSymbol: true,
      });
      await expect(service.validateComplexity("Abcdef12", "tenant_1")).rejects.toThrow(/symbol/);
    });

    it("falls back to global policy (tenantId: null) when no tenantId is provided", async () => {
      await service.validateComplexity("Abcdef12");
      expect(prisma.passwordPolicy.findFirst).toHaveBeenCalledWith({ where: { tenantId: null } });
    });
  });

  describe("isPasswordReused", () => {
    it("returns false when there is no password history", async () => {
      prisma.passwordHistory.findMany.mockResolvedValueOnce([]);
      expect(await service.isPasswordReused("ai_1", "NewPass123!")).toBe(false);
    });

    it("returns true when the new password matches a previous hash", async () => {
      const prevHash = await argon2.hash("OldPass123!", { type: argon2.argon2id });
      prisma.passwordHistory.findMany.mockResolvedValueOnce([{ passwordHash: prevHash }]);
      expect(await service.isPasswordReused("ai_1", "OldPass123!")).toBe(true);
    });

    it("returns false when none of the historical hashes match", async () => {
      const prevHash = await argon2.hash("OldPass123!", { type: argon2.argon2id });
      prisma.passwordHistory.findMany.mockResolvedValueOnce([{ passwordHash: prevHash }]);
      expect(await service.isPasswordReused("ai_1", "DifferentPass!1")).toBe(false);
    });

    it("respects the policy historySize when querying history rows", async () => {
      prisma.passwordPolicy.findFirst.mockResolvedValueOnce({ historySize: 3 });
      await service.isPasswordReused("ai_1", "NewPass1!");
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { authIdentityId: "ai_1" },
        orderBy: { createdAt: "desc" },
        take: 3,
      });
    });
  });

  describe("saveToHistory", () => {
    it("creates a new history row containing the previous password hash", async () => {
      await service.saveToHistory("ai_1", "$argon2id$prev");
      expect(prisma.passwordHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authIdentityId: "ai_1",
          passwordHash: "$argon2id$prev",
        }),
      });
    });

    it("does not delete anything when history is below the cap", async () => {
      prisma.passwordHistory.findMany.mockResolvedValueOnce([]);
      await service.saveToHistory("ai_1", "$argon2id$prev");
      expect(prisma.passwordHistory.deleteMany).not.toHaveBeenCalled();
    });

    it("deletes overflow history rows beyond the policy size", async () => {
      prisma.passwordPolicy.findFirst.mockResolvedValueOnce({ historySize: 2 });
      prisma.passwordHistory.findMany.mockResolvedValueOnce([{ id: "old_1" }, { id: "old_2" }]);
      await service.saveToHistory("ai_1", "$argon2id$prev");
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { authIdentityId: "ai_1" },
        orderBy: { createdAt: "desc" },
        skip: 2,
      });
      expect(prisma.passwordHistory.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["old_1", "old_2"] } },
      });
    });
  });
});
