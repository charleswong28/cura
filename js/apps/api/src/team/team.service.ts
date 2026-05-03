import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../auth/redis.service";
import { generateId } from "../common/ulid";
import { CreateTeamInput } from "./dto/create-team.input";
import { UpdateTeamInput } from "./dto/update-team.input";
import { AddTeamMemberInput } from "./dto/add-team-member.input";
import { UpdateTeamMemberInput } from "./dto/update-team-member.input";

@Injectable()
export class TeamService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).team.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const team = await this.prisma.forTenant(tenantId).team.findFirst({
      where: { id, deletedAt: null },
    });
    if (!team) throw new NotFoundException("Team not found");
    return team;
  }

  async create(tenantId: string, input: CreateTeamInput) {
    if (input.parentId) {
      await this.findById(input.parentId, tenantId);
    }
    return this.prisma.forTenant(tenantId).team.create({
      data: {
        id: generateId(),
        tenantId,
        name: input.name,
        kind: input.kind,
        parentId: input.parentId ?? null,
      },
    });
  }

  async update(id: string, tenantId: string, input: UpdateTeamInput) {
    await this.findById(id, tenantId);
    if (input.parentId) {
      await this.findById(input.parentId, tenantId);
      // Prevent cycles: new parent must not be a descendant of this team
      const descendants = await this.expandTeamTree([id], tenantId);
      if (descendants.includes(input.parentId)) {
        throw new ConflictException("Cannot set a descendant team as parent (cycle detected)");
      }
    }
    return this.prisma.forTenant(tenantId).team.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
      },
    });
  }

  async softDelete(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findMembers(teamId: string, tenantId: string) {
    await this.findById(teamId, tenantId);
    return this.prisma.teamMember.findMany({ where: { teamId } });
  }

  async addMember(teamId: string, tenantId: string, input: AddTeamMemberInput) {
    await this.findById(teamId, tenantId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: input.userId } },
    });
    if (existing) {
      throw new ConflictException("User is already a member of this team");
    }

    const member = await this.prisma.teamMember.create({
      data: { teamId, userId: input.userId, role: input.role },
    });

    // TASK-095: bump user_ver so the next token refresh picks up the new team membership
    await this.redis.incrUserVer(input.userId);

    return member;
  }

  async removeMember(teamId: string, userId: string, tenantId: string) {
    await this.findById(teamId, tenantId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) throw new NotFoundException("Team member not found");

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    // TASK-095: bump user_ver so the next token refresh drops the removed team
    await this.redis.incrUserVer(userId);

    return existing;
  }

  async updateMemberRole(teamId: string, userId: string, tenantId: string, input: UpdateTeamMemberInput) {
    await this.findById(teamId, tenantId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) throw new NotFoundException("Team member not found");

    const updated = await this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { role: input.role },
    });

    // TASK-095: role change affects permission resolution — bump user_ver
    await this.redis.incrUserVer(userId);

    return updated;
  }

  /**
   * Expands a set of team IDs to include all their descendants via recursive CTE.
   * Used by PermissionService to resolve team-based grants transitively.
   */
  async expandTeamTree(teamIds: string[], tenantId: string): Promise<string[]> {
    if (teamIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        WITH RECURSIVE team_tree AS (
          SELECT id FROM teams
          WHERE id = ANY(${teamIds}::text[])
            AND tenant_id = ${tenantId}
            AND deleted_at IS NULL
          UNION ALL
          SELECT t.id FROM teams t
          INNER JOIN team_tree tt ON t.parent_id = tt.id
          WHERE t.deleted_at IS NULL AND t.tenant_id = ${tenantId}
        )
        SELECT id FROM team_tree
      `
    );

    return rows.map((r) => r.id);
  }

  /**
   * Returns all user IDs who are members of any of the given team IDs.
   * Used by PermissionService for team grant → member access resolution.
   */
  async getMemberIds(teamIds: string[]): Promise<string[]> {
    if (teamIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<{ user_id: string }[]>(
      Prisma.sql`
        SELECT user_id FROM team_members
        WHERE team_id = ANY(${teamIds}::text[])
      `
    );

    return rows.map((r) => r.user_id);
  }
}
