import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../auth/redis.service";
import { PasswordService } from "../auth/password.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { InviteUserInput } from "./dto/invite-user.input";
import { AssignRoleInput } from "./dto/assign-role.input";
import { RemoveRoleInput } from "./dto/remove-role.input";
import { generateId } from "../common/ulid";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class UserService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(PasswordService) private readonly passwordService: PasswordService
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const user = await this.prisma.forTenant(tenantId).user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, tenantId: string, input: UpdateProfileInput) {
    await this.findById(userId, tenantId);
    return this.prisma.forTenant(tenantId).user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
      },
    });
  }

  // ── TASK-096: User Invite ────────────────────────────────────────────────

  /**
   * Invites a user to the tenant:
   * - Reuses an existing AuthIdentity if the email is known, otherwise creates one.
   * - Creates a User row for the tenant.
   * - Optionally assigns roles.
   * - Issues a PasswordResetToken so the invitee can set their password.
   * Returns the new User and the invite URL (logged; email sending is a later story).
   */
  async invite(tenantId: string, actorId: string, input: InviteUserInput) {
    const db = this.prisma.forTenant(tenantId);

    // Reject if email already belongs to a user in this tenant
    const existing = await db.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (existing) throw new ConflictException("A user with this email already exists in this tenant");

    // Resolve or create AuthIdentity.
    // Phase 1 note: authIdentityId is @unique on User, so one AuthIdentity can link to at most
    // one User. If the email already has a linked User we cannot reuse it — the invitee must
    // use a different email or contact support for multi-tenant access (future story).
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: { email: input.email },
      include: { users: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (existingIdentity?.users && existingIdentity.users.length > 0) {
      throw new ConflictException(
        "An account with this email already exists. Ask them to log in directly."
      );
    }

    let identityId: string;
    if (existingIdentity) {
      identityId = existingIdentity.id;
    } else {
      // Random unusable password — user must set their own via the invite link
      const placeholderHash = await this.passwordService.hash(
        crypto.randomBytes(32).toString("hex")
      );
      const created = await this.prisma.authIdentity.create({
        data: { id: generateId(), email: input.email, passwordHash: placeholderHash },
      });
      identityId = created.id;
    }

    // Create User in this tenant
    const userId = generateId();
    const user = await db.user.create({
      data: {
        id: userId,
        tenantId,
        authIdentityId: identityId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    // Assign roles if specified
    if (input.roleNames && input.roleNames.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: {
          name: { in: input.roleNames },
          OR: [{ tenantId: null }, { tenantId }],
        },
        select: { id: true, name: true },
      });

      const foundNames = roles.map((r) => r.name);
      const missing = input.roleNames.filter((n) => !foundNames.includes(n));
      if (missing.length > 0) {
        throw new BadRequestException(`Unknown roles: ${missing.join(", ")}`);
      }

      await this.prisma.userRole.createMany({
        data: roles.map((r) => ({
          userId,
          roleId: r.id,
          assignedById: actorId,
        })),
        skipDuplicates: true,
      });
    }

    // Create invite link using a PasswordResetToken (single-use, 7-day expiry)
    const rawToken = `${generateId()}_${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        id: generateId(),
        authIdentityId: identityId,
        tokenHash,
        expiresAt,
      },
    });

    // Seed user_ver so the invited user can log in after setting their password
    await this.redis.initUserVer(userId);

    const appUrl = process.env["APP_URL"] ?? "http://localhost:3001";
    const inviteUrl = `${appUrl}/reset-password?token=${rawToken}`;
    // TODO(email-service): send invite email in a later story
    console.log(`[UserInvite] Invite link for ${input.email}: ${inviteUrl}`);

    return user;
  }

  // ── TASK-097: UserRole Assignment ────────────────────────────────────────

  async assignRole(tenantId: string, actorId: string, input: AssignRoleInput) {
    await this.findById(input.userId, tenantId);

    // Verify the role is accessible to this tenant
    const role = await this.prisma.role.findFirst({
      where: { id: input.roleId, OR: [{ tenantId: null }, { tenantId }] },
    });
    if (!role) throw new NotFoundException("Role not found");

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
    });
    if (existing) throw new ConflictException("User already has this role");

    await this.prisma.userRole.create({
      data: { userId: input.userId, roleId: input.roleId, assignedById: actorId },
    });

    await this.redis.incrUserVer(input.userId);

    return this.findById(input.userId, tenantId);
  }

  async removeRole(tenantId: string, input: RemoveRoleInput) {
    await this.findById(input.userId, tenantId);

    const existing = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
    });
    if (!existing) throw new NotFoundException("User does not have this role");

    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId: input.userId, roleId: input.roleId } },
    });

    await this.redis.incrUserVer(input.userId);

    return this.findById(input.userId, tenantId);
  }

  // ── TASK-098: User Deactivation ──────────────────────────────────────────

  async deactivate(userId: string, actorId: string, tenantId: string) {
    const user = await this.findById(userId, tenantId);
    if (!user.loginable) throw new BadRequestException("User is already deactivated");
    if (userId === actorId) throw new ForbiddenException("Cannot deactivate your own account");

    await this.prisma.forTenant(tenantId).user.update({
      where: { id: userId },
      data: { loginable: false, lastInactiveAt: new Date() },
    });

    // Revoke all active sessions for the user
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Stale current JWT — next request gets JWT_STALE, refresh fails on loginable=false
    await this.redis.incrUserVer(userId);

    return this.prisma.forTenant(tenantId).user.findFirst({ where: { id: userId } });
  }

  async reactivate(userId: string, tenantId: string) {
    const user = await this.findById(userId, tenantId);
    if (user.loginable) throw new BadRequestException("User is already active");

    const updated = await this.prisma.forTenant(tenantId).user.update({
      where: { id: userId },
      data: { loginable: true },
    });

    await this.redis.incrUserVer(userId);

    return updated;
  }
}
