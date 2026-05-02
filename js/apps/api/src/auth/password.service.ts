import { BadRequestException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { generateId } from "../common/ulid";
import { PrismaService } from "../prisma/prisma.service";

// OWASP 2023-recommended Argon2id parameters
const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

@Injectable()
export class PasswordService {
  constructor(private readonly prisma: PrismaService) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Validates against the tenant's (or global) PasswordPolicy. Throws on violation. */
  async validateComplexity(password: string, tenantId?: string): Promise<void> {
    const policy = await this.prisma.passwordPolicy.findFirst({
      where: tenantId ? { tenantId } : { tenantId: null },
    });

    const minLength = policy?.minLength ?? 8;
    const requireUpper = policy?.requireUpper ?? true;
    const requireLower = policy?.requireLower ?? true;
    const requireDigit = policy?.requireDigit ?? true;
    const requireSymbol = policy?.requireSymbol ?? false;

    const errors: string[] = [];
    if (password.length < minLength) errors.push(`At least ${minLength} characters required.`);
    if (requireUpper && !/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter.");
    if (requireLower && !/[a-z]/.test(password)) errors.push("Must contain a lowercase letter.");
    if (requireDigit && !/\d/.test(password)) errors.push("Must contain a digit.");
    if (requireSymbol && !/[^A-Za-z0-9]/.test(password)) errors.push("Must contain a symbol.");

    if (errors.length > 0) throw new BadRequestException(errors.join(" "));
  }

  /** Returns true if newPassword matches any of the last N saved hashes. */
  async isPasswordReused(
    authIdentityId: string,
    newPassword: string,
    tenantId?: string
  ): Promise<boolean> {
    const policy = await this.prisma.passwordPolicy.findFirst({
      where: tenantId ? { tenantId } : { tenantId: null },
    });
    const historySize = policy?.historySize ?? 5;

    const history = await this.prisma.passwordHistory.findMany({
      where: { authIdentityId },
      orderBy: { createdAt: "desc" },
      take: historySize,
    });

    for (const entry of history) {
      if (await this.verify(entry.passwordHash, newPassword)) return true;
    }
    return false;
  }

  /** Prepends currentHash to PasswordHistory, trimming to historySize oldest entries. */
  async saveToHistory(
    authIdentityId: string,
    currentHash: string,
    tenantId?: string
  ): Promise<void> {
    const policy = await this.prisma.passwordPolicy.findFirst({
      where: tenantId ? { tenantId } : { tenantId: null },
    });
    const historySize = policy?.historySize ?? 5;

    await this.prisma.passwordHistory.create({
      data: { id: generateId(), authIdentityId, passwordHash: currentHash },
    });

    // Trim: keep the newest historySize rows, delete the rest
    const overflow = await this.prisma.passwordHistory.findMany({
      where: { authIdentityId },
      orderBy: { createdAt: "desc" },
      skip: historySize,
    });
    if (overflow.length > 0) {
      await this.prisma.passwordHistory.deleteMany({
        where: { id: { in: overflow.map((h) => h.id) } },
      });
    }
  }
}
