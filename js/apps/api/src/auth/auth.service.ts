import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { generateId } from "../common/ulid";
import { PrismaService } from "../prisma/prisma.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { RedisService } from "./redis.service";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ACCESS_TOKEN_TTL_SECS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 90;
const PW_RESET_RATE_LIMIT = 3; // requests per hour per email

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; displayName: string; tenantId: string };
}

export type LoginResult = { mfaRequired: true; mfaChallengeToken: string } | SessionResult;

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly redis: RedisService,
    private readonly mfa: MfaService
  ) {}

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    tenantSlug: string | undefined,
    ip?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    // 1. Lookup AuthIdentity
    const identity = await this.prisma.authIdentity.findUnique({ where: { email } });
    if (!identity) throw new UnauthorizedException("Invalid email or password.");

    // 2. Lockout check
    if (identity.lockedUntil && identity.lockedUntil > new Date()) {
      const secsLeft = Math.ceil((identity.lockedUntil.getTime() - Date.now()) / 1000);
      throw new UnauthorizedException(`Account locked. Try again in ${secsLeft}s.`);
    }

    // 3. Argon2id verify
    const valid = await this.passwordService.verify(identity.passwordHash, password);
    if (!valid) {
      const newFails = identity.failedLoginCount + 1;
      const shouldLock = newFails >= LOCKOUT_THRESHOLD;
      await this.prisma.authIdentity.update({
        where: { id: identity.id },
        data: {
          failedLoginCount: newFails,
          ...(shouldLock && { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) }),
        },
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    // 4. MFA check — issue challenge token instead of a full session
    if (identity.mfaEnrolled) {
      const mfaChallengeToken = await this.mfa.createChallengeToken(identity.id, tenantSlug);
      return { mfaRequired: true, mfaChallengeToken };
    }

    // 5–6. Resolve User and check loginable / deletedAt
    const user = await this.resolveUser(identity.id, tenantSlug);
    if (!user.loginable || user.deletedAt)
      throw new ForbiddenException("Account has been deactivated.");

    // 7. Reset lockout counter and create session
    await this.prisma.authIdentity.update({
      where: { id: identity.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    return this.createSession(identity.id, user, ip, userAgent);
  }

  /** Called from POST /auth/mfa/verify — completes login after successful MFA. */
  async completeMfaLogin(
    challengeToken: string,
    code: string,
    ip?: string,
    userAgent?: string
  ): Promise<SessionResult> {
    const challengeData = await this.mfa.getChallengeData(challengeToken);
    if (!challengeData) throw new UnauthorizedException("MFA challenge expired or invalid.");

    // Verify throws on failure; on success deletes the challenge token
    await this.mfa.verifyChallenge(challengeToken, code);

    const identity = await this.prisma.authIdentity.findUnique({
      where: { id: challengeData.authIdentityId },
    });
    if (!identity) throw new NotFoundException("Identity not found.");

    const user = await this.resolveUser(identity.id, challengeData.tenantSlug);
    if (!user.loginable || user.deletedAt)
      throw new ForbiddenException("Account has been deactivated.");

    return this.createSession(identity.id, user, ip, userAgent);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string, ip?: string): Promise<SessionResult> {
    const tokenHash = hashToken(rawRefreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true, authIdentity: true },
    });

    if (!session) throw new UnauthorizedException("Invalid refresh token.");

    // Reuse detection: if already revoked, invalidate ALL active sessions for this user
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.redis.incrUserVer(session.userId);
      throw new UnauthorizedException(
        "Refresh token reuse detected. All sessions have been revoked."
      );
    }

    if (session.expiresAt < new Date())
      throw new UnauthorizedException("Refresh token has expired.");

    if (!session.authIdentity.lockedUntil || session.authIdentity.lockedUntil < new Date()) {
      // still ok — lockedUntil check is advisory here; we rely on user.loginable for deactivation
    }

    if (!session.user.loginable || session.user.deletedAt)
      throw new ForbiddenException("Account has been deactivated.");

    // Atomic rotation: update hash + extend expiry
    const newRaw = generateRefreshToken();
    const newHash = hashToken(newRaw);
    const newExpiry = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: newHash, expiresAt: newExpiry, lastUsedAt: new Date() },
    });

    const accessToken = await this.signAccessToken(session.user, session.id);

    return {
      accessToken,
      refreshToken: newRaw,
      user: {
        id: session.user.id,
        displayName: `${session.user.firstName} ${session.user.lastName}`,
        tenantId: session.user.tenantId,
      },
    };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  /** Revokes the session identified by the raw refresh token. */
  async logout(rawRefreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(rawRefreshToken) },
    });
    if (!session || session.revokedAt) return;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.redis.incrUserVer(session.userId);
  }

  /** Revokes every active session for the user identified by the raw refresh token. */
  async logoutAll(rawRefreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(rawRefreshToken) },
    });
    if (!session) return;

    await this.prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.redis.incrUserVer(session.userId);
  }

  // ── Password Reset Request ─────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const count = await this.redis.incrementRateLimit(`pw_reset:${email}`);
    if (count > PW_RESET_RATE_LIMIT) {
      // Silently drop — don't reveal the rate-limit window to the caller
      return;
    }

    const identity = await this.prisma.authIdentity.findUnique({ where: { email } });
    if (!identity) return; // silent — don't reveal whether the email exists

    // Token: ULID + 32-byte random suffix
    const rawToken = `${generateId()}_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 hour

    await this.prisma.passwordResetToken.create({
      data: { id: generateId(), authIdentityId: identity.id, tokenHash, expiresAt },
    });

    const appUrl = process.env["APP_URL"] ?? "http://localhost:3001";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // TODO(email-service): Replace with real transactional email in a later story
    console.log(`[PasswordReset] Reset link for ${email}: ${resetUrl}`);
  }

  // ── Password Reset Confirm ─────────────────────────────────────────────────

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const tokenRow = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token.");
    }

    const identity = await this.prisma.authIdentity.findUnique({
      where: { id: tokenRow.authIdentityId },
    });
    if (!identity) throw new NotFoundException("Identity not found.");

    // Resolve tenant for policy lookup (use first user record)
    const user = await this.prisma.user.findFirst({
      where: { authIdentityId: identity.id, deletedAt: null },
    });

    await this.passwordService.validateComplexity(newPassword, user?.tenantId);

    if (await this.passwordService.isPasswordReused(identity.id, newPassword, user?.tenantId)) {
      throw new BadRequestException(
        "Password has been used recently. Choose a different password."
      );
    }

    const newHash = await this.passwordService.hash(newPassword);
    await this.passwordService.saveToHistory(identity.id, identity.passwordHash, user?.tenantId);

    await this.prisma.authIdentity.update({
      where: { id: identity.id },
      data: { passwordHash: newHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    });

    // Force re-login: revoke all sessions and bump user_ver for every tenant user
    const users = await this.prisma.user.findMany({ where: { authIdentityId: identity.id } });
    for (const u of users) {
      await this.prisma.session.updateMany({
        where: { userId: u.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.redis.incrUserVer(u.id);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async resolveUser(authIdentityId: string, tenantSlug?: string) {
    let user;
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) throw new ForbiddenException(`Tenant '${tenantSlug}' not found.`);
      user = await this.prisma.user.findFirst({
        where: { authIdentityId, tenantId: tenant.id, deletedAt: null },
      });
    } else {
      // Default: the earliest active user for this identity (single-tenant common case)
      user = await this.prisma.user.findFirst({
        where: { authIdentityId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
    }
    if (!user) throw new ForbiddenException("Not a member of this tenant.");
    return user;
  }

  private async createSession(
    authIdentityId: string,
    user: { id: string; firstName: string; lastName: string; tenantId: string },
    ip?: string,
    userAgent?: string
  ): Promise<SessionResult> {
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        authIdentityId,
        userId: user.id,
        refreshTokenHash,
        ip,
        userAgent,
        expiresAt,
      },
    });

    // SET NX — init user_ver to 0 on very first login
    await this.redis.initUserVer(user.id);

    // Track first login timestamp (only if not already set)
    await this.prisma.user.updateMany({
      where: { id: user.id, firstLogin: null },
      data: { firstLogin: new Date() },
    });

    const accessToken = await this.signAccessToken(user, sessionId);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        displayName: `${user.firstName} ${user.lastName}`,
        tenantId: user.tenantId,
      },
    };
  }

  private async signAccessToken(
    user: { id: string; tenantId: string },
    sessionId: string
  ): Promise<string> {
    const secret = process.env["JWT_SECRET"];
    if (!secret) throw new Error("JWT_SECRET env var is not set");

    const userVer = await this.redis.getUserVer(user.id);

    const [teamMembers, userRoles] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { userId: user.id },
        include: { team: { select: { shortId: true } } },
      }),
      this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: { role: { select: { name: true } } },
      }),
    ]);

    const payload = {
      sub: user.id,
      tid: user.tenantId,
      sid: sessionId,
      ver: userVer,
      teams: teamMembers.map((tm) => ({ id: tm.team.shortId, r: tm.role === "LEAD" ? "L" : "M" })),
      roles: userRoles.map((ur) => ur.role.name),
    };

    return jwt.sign(payload, secret, { algorithm: "HS512", expiresIn: ACCESS_TOKEN_TTL_SECS });
  }
}
