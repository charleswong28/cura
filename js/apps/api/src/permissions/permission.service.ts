import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { AccessLevel, DataScopeType, GrantAction, GranteeType, GrantSource } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../auth/auth.types";
import { generateId } from "../common/ulid";
import type { GrantInput } from "./permission.types";

// ---------------------------------------------------------------------------
// Ordering helpers
// ---------------------------------------------------------------------------

const LEVEL_ORDER: Record<AccessLevel, number> = {
  VIEW: 0,
  EDIT: 1,
  OWNER: 2,
};

const SCOPE_ORDER: Record<DataScopeType, number> = {
  EXPLICIT: 0,
  MINE: 1,
  MY_TEAMS: 2,
  TEAM_TREE: 3,
  ALL: 4,
};

function atLeast(actual: AccessLevel, min: AccessLevel): boolean {
  return LEVEL_ORDER[actual] >= LEVEL_ORDER[min];
}

function maxLevel(levels: AccessLevel[]): AccessLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((best, lvl) => (LEVEL_ORDER[lvl] > LEVEL_ORDER[best] ? lvl : best));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PermissionService {
  // Permanent in-process cache: roleNames key → role ULIDs (immutable once roles are set up)
  private readonly roleIdCache = new Map<string, string[]>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // =========================================================================
  // TASK-087: can() — row-level check with team-role adjustment
  // =========================================================================

  async can(
    user: RequestUser,
    resourceType: string,
    resourceId: string,
    minLevel: AccessLevel
  ): Promise<boolean> {
    const level = await this.effectiveLevel(user, resourceType, resourceId);
    return level !== null && atLeast(level, minLevel);
  }

  // =========================================================================
  // TASK-088: assertCan() + effectiveLevel()
  // =========================================================================

  async assertCan(
    user: RequestUser,
    resourceType: string,
    resourceId: string,
    minLevel: AccessLevel
  ): Promise<void> {
    const allowed = await this.can(user, resourceType, resourceId, minLevel);
    if (!allowed) {
      throw new ForbiddenException(`Access denied: ${minLevel} on ${resourceType}/${resourceId}`);
    }
  }

  async effectiveLevel(
    user: RequestUser,
    resourceType: string,
    resourceId: string
  ): Promise<AccessLevel | null> {
    const roleIds = await this.getRoleIds(user);
    const teamRoleMap = new Map(user.teams.map((t) => [t.id, t.role]));

    const granteeConditions = [
      { granteeType: GranteeType.USER, granteeId: user.userId },
      ...user.teams.map((t) => ({ granteeType: GranteeType.TEAM, granteeId: t.id })),
      ...roleIds.map((id) => ({ granteeType: GranteeType.ROLE, granteeId: id })),
    ];

    const grants = await this.prisma.forTenant(user.tenantId).permission.findMany({
      where: {
        resourceType,
        resourceId,
        AND: [
          { OR: granteeConditions },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      select: { granteeType: true, granteeId: true, accessLevel: true },
    });

    // Apply team-role adjustment: MEMBER cannot hold OWNER through a team grant
    const effectiveLevels = grants.map((grant) => {
      if (grant.granteeType === GranteeType.TEAM) {
        const teamRole = teamRoleMap.get(grant.granteeId);
        if (teamRole === "MEMBER" && grant.accessLevel === AccessLevel.OWNER) {
          return AccessLevel.EDIT;
        }
      }
      return grant.accessLevel;
    });

    const direct = maxLevel(effectiveLevels);
    if (direct !== null) return direct;

    // TASK-089: fall through to cascade rule check
    return this.checkCascade(user, resourceType, resourceId);
  }

  // =========================================================================
  // TASK-089: cascade rule resolution
  // =========================================================================

  private async checkCascade(
    user: RequestUser,
    resourceType: string,
    resourceId: string
  ): Promise<AccessLevel | null> {
    // Rules where this resourceType is the destination (to)
    const rules = await this.prisma.permissionCascadeRule.findMany({
      where: { toResourceType: resourceType },
    });

    for (const rule of rules) {
      const fromIds = await this.findFromResourceIds(
        rule.fromResourceType,
        resourceType,
        resourceId,
        user.tenantId
      );
      for (const fromId of fromIds) {
        const fromLevel = await this.effectiveLevel(user, rule.fromResourceType, fromId);
        if (fromLevel !== null && atLeast(fromLevel, rule.minAccessLevel)) {
          return rule.grantLevel;
        }
      }
    }

    return null;
  }

  // Returns the IDs of "from" resources related to the given "to" resource.
  // Covers the five built-in cascade rules seeded in TASK-072.
  private async findFromResourceIds(
    fromType: string,
    toType: string,
    toId: string,
    tenantId: string
  ): Promise<string[]> {
    const db = this.prisma.forTenant(tenantId);
    const key = `${fromType}→${toType}`;

    switch (key) {
      case "JobApplication→Candidate":
        return (
          await db.jobApplication.findMany({
            where: { candidateId: toId, deletedAt: null },
            select: { id: true },
          })
        ).map((r) => r.id);

      case "JobApplication→Job":
        return (
          await db.jobApplication.findMany({
            where: { jobId: toId, deletedAt: null },
            select: { id: true },
          })
        ).map((r) => r.id);

      case "Offer→JobApplication":
        return (
          await db.offer.findMany({
            where: { applicationId: toId },
            select: { id: true },
          })
        ).map((r) => r.id);

      case "Interview→JobApplication":
        return (
          await db.interview.findMany({
            where: { applicationId: toId },
            select: { id: true },
          })
        ).map((r) => r.id);

      case "Client→Job": {
        const job = await db.job.findFirst({
          where: { id: toId },
          select: { clientId: true },
        });
        return job ? [job.clientId] : [];
      }

      default:
        return [];
    }
  }

  // =========================================================================
  // TASK-090: grant() + revoke() + adjustLevel()
  // =========================================================================

  async grant(input: GrantInput): Promise<void> {
    const db = this.prisma.forTenant(input.tenantId);

    const existing = await db.permission.findFirst({
      where: {
        granteeType: input.granteeType,
        granteeId: input.granteeId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
    });

    if (existing) {
      if (existing.accessLevel !== input.accessLevel) {
        await this.adjustLevel(
          existing.id,
          input.accessLevel,
          input.actorId,
          input.tenantId,
          input.reason
        );
      }
      return;
    }

    const permId = generateId();
    await db.permission.create({
      data: {
        id: permId,
        tenantId: input.tenantId,
        granteeType: input.granteeType,
        granteeId: input.granteeId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        accessLevel: input.accessLevel,
        grantSource: input.grantSource,
        expiresAt: input.expiresAt ?? null,
        createdById: input.actorId,
      },
    });

    await db.permissionGrant.create({
      data: {
        id: generateId(),
        tenantId: input.tenantId,
        permissionId: permId,
        granteeType: input.granteeType,
        granteeId: input.granteeId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        action: GrantAction.GRANT,
        fromLevel: null,
        toLevel: input.accessLevel,
        reason: input.reason ?? null,
        actorId: input.actorId,
      },
    });
  }

  async revoke(permissionId: string, tenantId: string, actorId: string, reason?: string): Promise<void> {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.permission.findFirst({ where: { id: permissionId } });
    if (!existing) return;

    await db.permissionGrant.create({
      data: {
        id: generateId(),
        tenantId,
        permissionId: existing.id,
        granteeType: existing.granteeType,
        granteeId: existing.granteeId,
        resourceType: existing.resourceType,
        resourceId: existing.resourceId,
        action: GrantAction.REVOKE,
        fromLevel: existing.accessLevel,
        toLevel: null,
        reason: reason ?? null,
        actorId,
      },
    });

    await db.permission.delete({ where: { id: permissionId } });
  }

  private async adjustLevel(
    permissionId: string,
    newLevel: AccessLevel,
    actorId: string,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.permission.findFirst({ where: { id: permissionId } });
    if (!existing) return;

    const action =
      LEVEL_ORDER[newLevel] > LEVEL_ORDER[existing.accessLevel]
        ? GrantAction.UPGRADE
        : GrantAction.DOWNGRADE;

    await db.permission.update({
      where: { id: permissionId },
      data: { accessLevel: newLevel },
    });

    await db.permissionGrant.create({
      data: {
        id: generateId(),
        tenantId,
        permissionId,
        granteeType: existing.granteeType,
        granteeId: existing.granteeId,
        resourceType: existing.resourceType,
        resourceId: existing.resourceId,
        action,
        fromLevel: existing.accessLevel,
        toLevel: newLevel,
        reason: reason ?? null,
        actorId,
      },
    });
  }

  // =========================================================================
  // TASK-091: getDataScope() + getExplicitlyGrantedIds()
  // =========================================================================

  async getDataScope(user: RequestUser, resourceType: string): Promise<DataScopeType> {
    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: user.roles },
        OR: [{ tenantId: user.tenantId }, { tenantId: null }],
      },
      include: {
        dataScopes: { where: { resourceType } },
      },
    });

    let highest: DataScopeType = DataScopeType.MINE;

    for (const role of roles) {
      for (const ds of role.dataScopes) {
        if (SCOPE_ORDER[ds.dataScope] > SCOPE_ORDER[highest]) {
          highest = ds.dataScope;
        }
      }
    }

    return highest;
  }

  async getExplicitlyGrantedIds(user: RequestUser, resourceType: string): Promise<string[]> {
    const roleIds = await this.getRoleIds(user);

    const granteeConditions = [
      { granteeType: GranteeType.USER, granteeId: user.userId },
      ...user.teams.map((t) => ({ granteeType: GranteeType.TEAM, granteeId: t.id })),
      ...roleIds.map((id) => ({ granteeType: GranteeType.ROLE, granteeId: id })),
    ];

    const grants = await this.prisma.forTenant(user.tenantId).permission.findMany({
      where: {
        resourceType,
        AND: [
          { OR: granteeConditions },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      select: { resourceId: true },
    });

    return [...new Set(grants.map((g) => g.resourceId))];
  }

  // =========================================================================
  // TASK-092: system auto-grants on record creation
  // =========================================================================

  async autoGrantOnCandidateCreate(
    tenantId: string,
    createdById: string,
    resourceId: string,
    teamIds: string[]
  ): Promise<void> {
    const grants: GrantInput[] = [
      {
        tenantId,
        granteeType: GranteeType.USER,
        granteeId: createdById,
        resourceType: "Candidate",
        resourceId,
        accessLevel: AccessLevel.OWNER,
        grantSource: GrantSource.RULE,
        actorId: createdById,
      },
      ...teamIds.map((teamId) => ({
        tenantId,
        granteeType: GranteeType.TEAM,
        granteeId: teamId,
        resourceType: "Candidate",
        resourceId,
        accessLevel: AccessLevel.VIEW,
        grantSource: GrantSource.RULE,
        actorId: createdById,
      })),
    ];

    await Promise.all(grants.map((g) => this.grant(g)));
  }

  async autoGrantOnJobCreate(
    tenantId: string,
    createdById: string,
    resourceId: string,
    ownerUserId: string,
    clientId: string
  ): Promise<void> {
    const grants: GrantInput[] = [
      {
        tenantId,
        granteeType: GranteeType.USER,
        granteeId: createdById,
        resourceType: "Job",
        resourceId,
        accessLevel: AccessLevel.OWNER,
        grantSource: GrantSource.RULE,
        actorId: createdById,
      },
    ];

    if (ownerUserId !== createdById) {
      grants.push({
        tenantId,
        granteeType: GranteeType.USER,
        granteeId: ownerUserId,
        resourceType: "Job",
        resourceId,
        accessLevel: AccessLevel.EDIT,
        grantSource: GrantSource.RULE,
        actorId: createdById,
      });
    }

    // VIEW for the client's BD owner
    const client = await this.prisma.forTenant(tenantId).client.findFirst({
      where: { id: clientId },
      select: { bdUserId: true },
    });

    if (client?.bdUserId && client.bdUserId !== createdById && client.bdUserId !== ownerUserId) {
      grants.push({
        tenantId,
        granteeType: GranteeType.USER,
        granteeId: client.bdUserId,
        resourceType: "Job",
        resourceId,
        accessLevel: AccessLevel.VIEW,
        grantSource: GrantSource.RULE,
        actorId: createdById,
      });
    }

    await Promise.all(grants.map((g) => this.grant(g)));
  }

  async autoGrantOnClientCreate(
    tenantId: string,
    createdById: string,
    resourceId: string,
    bdUserId: string | null
  ): Promise<void> {
    if (!bdUserId) return;

    await this.grant({
      tenantId,
      granteeType: GranteeType.USER,
      granteeId: bdUserId,
      resourceType: "Client",
      resourceId,
      accessLevel: AccessLevel.OWNER,
      grantSource: GrantSource.RULE,
      actorId: createdById,
    });
  }

  async autoGrantOnJobApplicationCreate(
    tenantId: string,
    createdById: string,
    resourceId: string,
    ownerUserId: string
  ): Promise<void> {
    await this.grant({
      tenantId,
      granteeType: GranteeType.USER,
      granteeId: ownerUserId,
      resourceType: "JobApplication",
      resourceId,
      accessLevel: AccessLevel.EDIT,
      grantSource: GrantSource.RULE,
      actorId: createdById,
    });
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  // Resolves role names (from JWT) to role ULIDs (for Permission granteeId lookup).
  // Cached permanently — role name→ULID mapping is immutable.
  private async getRoleIds(user: RequestUser): Promise<string[]> {
    if (user.roles.length === 0) return [];

    const cacheKey = `${user.tenantId}:${[...user.roles].sort().join(",")}`;
    const cached = this.roleIdCache.get(cacheKey);
    if (cached) return cached;

    const roles = await this.prisma.role.findMany({
      where: {
        name: { in: user.roles },
        OR: [{ tenantId: user.tenantId }, { tenantId: null }],
      },
      select: { id: true },
    });

    const ids = roles.map((r) => r.id);
    this.roleIdCache.set(cacheKey, ids);
    return ids;
  }
}
