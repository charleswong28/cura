import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import { generateId } from "../common/ulid";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "./redis.service";

// AES-256-GCM constants
const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV

interface MfaChallengeData {
  authIdentityId: string;
  tenantSlug?: string;
  fails: number;
}

interface EnrolPendingData {
  secretEncrypted: string;
}

function getMfaKey(): Buffer {
  const secret = process.env["MFA_SECRET"];
  if (!secret) throw new Error("MFA_SECRET env var is not set");
  // Derive a 32-byte key via SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSecret(plaintext: string): string {
  const key = getMfaKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Encoding: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSecret(ciphertext: string): string {
  const key = getMfaKey();
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  const data = Buffer.from(dataHex!, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  // ── Enrolment ───────────────────────────────────────────────────────────

  /** Step 1 of enrolment: generate a TOTP secret, return the otpauth URI. */
  async startEnrol(
    authIdentityId: string,
    email: string
  ): Promise<{ otpauthUrl: string; secret: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: "Cura", label: email, secret });
    const secretEncrypted = encryptSecret(secret);

    // Store pending enrolment in Redis for 5 minutes
    await this.redis.setChallenge(
      `enrol:${authIdentityId}`,
      { secretEncrypted } satisfies EnrolPendingData,
      300
    );

    return { otpauthUrl, secret };
  }

  /**
   * Step 2 of enrolment: confirm a valid TOTP code, persist MfaDevice, return one-time backup codes.
   * Generates 10 single-use backup codes stored as argon2id hashes.
   */
  async confirmEnrol(authIdentityId: string, totpCode: string): Promise<string[]> {
    const pending = await this.redis.getChallenge<EnrolPendingData>(`enrol:${authIdentityId}`);
    if (!pending) {
      throw new BadRequestException("No pending MFA enrolment. Please restart the flow.");
    }

    const secret = decryptSecret(pending.secretEncrypted);
    if (!verifySync({ token: totpCode, secret }).valid) {
      throw new UnauthorizedException("Invalid TOTP code.");
    }

    // 10 single-use backup codes: 5 random bytes → 10-char hex string
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString("hex"));
    const backupCodesHashed = await Promise.all(
      backupCodes.map((code) => argon2.hash(code, { type: argon2.argon2id }))
    );

    await this.prisma.mfaDevice.create({
      data: {
        id: generateId(),
        authIdentityId,
        secretEncrypted: pending.secretEncrypted,
        backupCodesHashed,
      },
    });

    await this.prisma.authIdentity.update({
      where: { id: authIdentityId },
      data: { mfaEnrolled: true },
    });

    await this.redis.deleteChallenge(`enrol:${authIdentityId}`);

    return backupCodes;
  }

  // ── Challenge flow ─────────────────────────────────────────────────────

  /** Creates a short-lived MFA challenge token after password verification. TTL: 5 min. */
  async createChallengeToken(authIdentityId: string, tenantSlug?: string): Promise<string> {
    const token = `${generateId()}_${crypto.randomBytes(16).toString("hex")}`;
    await this.redis.setChallenge(
      token,
      { authIdentityId, tenantSlug, fails: 0 } satisfies MfaChallengeData,
      300
    );
    return token;
  }

  async getChallengeData(token: string): Promise<MfaChallengeData | null> {
    return this.redis.getChallenge<MfaChallengeData>(token);
  }

  /**
   * Verifies a TOTP code or backup code against the challenge token.
   * Locks after 3 failed attempts. Returns authIdentityId on success.
   * Deletes the matching backup code hash on use.
   */
  async verifyChallenge(challengeToken: string, code: string): Promise<string> {
    const challenge = await this.redis.getChallenge<MfaChallengeData>(challengeToken);
    if (!challenge) throw new UnauthorizedException("MFA challenge expired or invalid.");

    if (challenge.fails >= 3) {
      await this.redis.deleteChallenge(challengeToken);
      throw new UnauthorizedException("Too many failed attempts. Please log in again.");
    }

    const device = await this.prisma.mfaDevice.findFirst({
      where: { authIdentityId: challenge.authIdentityId },
    });
    if (!device) throw new NotFoundException("MFA device not found.");

    const secret = decryptSecret(device.secretEncrypted);

    // Try TOTP
    if (verifySync({ token: code, secret }).valid) {
      await this.prisma.mfaDevice.update({
        where: { id: device.id },
        data: { lastVerifiedAt: new Date() },
      });
      await this.redis.deleteChallenge(challengeToken);
      return challenge.authIdentityId;
    }

    // Try backup codes (single-use — delete the matching hash)
    for (const hash of device.backupCodesHashed) {
      if (await argon2.verify(hash, code)) {
        const remaining = device.backupCodesHashed.filter((h) => h !== hash);
        await this.prisma.mfaDevice.update({
          where: { id: device.id },
          data: { backupCodesHashed: remaining, lastVerifiedAt: new Date() },
        });
        await this.redis.deleteChallenge(challengeToken);
        return challenge.authIdentityId;
      }
    }

    // All checks failed — increment attempt counter
    const newFails = challenge.fails + 1;
    if (newFails >= 3) {
      await this.redis.deleteChallenge(challengeToken);
      throw new UnauthorizedException("Too many failed attempts. Please log in again.");
    }
    await this.redis.updateChallenge(challengeToken, { ...challenge, fails: newFails }, 300);
    throw new UnauthorizedException(`Invalid code. ${3 - newFails} attempt(s) remaining.`);
  }
}
