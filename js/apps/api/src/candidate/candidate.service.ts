import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AccessLevel, DataScopeType } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService } from "../permissions/permission.service";
import { RequestUser } from "../auth/auth.types";
import { generateId } from "../common/ulid";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";

@Injectable()
export class CandidateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionService) private readonly permissionService: PermissionService
  ) {}

  async findAll(user: RequestUser) {
    const scope = await this.permissionService.getDataScope(user, "Candidate");
    const db = this.prisma.forTenant(user.tenantId);

    let whereClause: Record<string, unknown> = { deletedAt: null };

    if (scope === DataScopeType.ALL) {
      // no extra filter
    } else if (scope === DataScopeType.TEAM_TREE || scope === DataScopeType.MY_TEAMS) {
      const teamIds = user.teams.map((t) => t.id);
      whereClause = {
        deletedAt: null,
        OR: [
          { ownerUserId: user.userId },
          { createdById: user.userId },
          // explicit grants cover team-scoped access via the permission table
          { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Candidate") } },
        ],
      };
      // If the user is a team lead/member, ownerUserId of anyone in their teams
      if (teamIds.length > 0) {
        (whereClause["OR"] as unknown[]).push({
          ownerUser: { teamMemberships: { some: { teamId: { in: teamIds } } } },
        });
      }
    } else if (scope === DataScopeType.MINE) {
      whereClause = {
        deletedAt: null,
        OR: [
          { ownerUserId: user.userId },
          { createdById: user.userId },
          { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Candidate") } },
        ],
      };
    } else {
      // EXPLICIT
      const grantedIds = await this.permissionService.getExplicitlyGrantedIds(user, "Candidate");
      whereClause = { deletedAt: null, id: { in: grantedIds } };
    }

    return db.candidate.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: RequestUser) {
    const db = this.prisma.forTenant(user.tenantId);
    const candidate = await db.candidate.findFirst({ where: { id, deletedAt: null } });
    if (!candidate) throw new NotFoundException("Candidate not found");
    await this.permissionService.assertCan(user, "Candidate", id, AccessLevel.VIEW);
    return candidate;
  }

  async create(user: RequestUser, input: CreateCandidateInput) {
    const db = this.prisma.forTenant(user.tenantId);

    if (input.email) {
      const existing = await db.candidate.findFirst({
        where: { email: input.email, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new ConflictException("A candidate with this email already exists");
    }

    const candidate = await db.candidate.create({
      data: {
        id: generateId(),
        tenantId: user.tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        currentCompany: input.currentCompany ?? null,
        currentTitle: input.currentTitle ?? null,
        location: input.location ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        githubUrl: input.githubUrl ?? null,
        notes: input.notes ?? null,
        status: input.status,
        ownerUserId: input.ownerUserId ?? user.userId,
        createdById: user.userId,
      },
    });

    await this.permissionService.autoGrantOnCandidateCreate(
      user.tenantId,
      user.userId,
      candidate.id,
      user.teams.map((t) => t.id)
    );

    return candidate;
  }

  async update(id: string, user: RequestUser, input: UpdateCandidateInput) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Candidate", id, AccessLevel.EDIT);

    if (input.email !== undefined && input.email !== null) {
      const conflict = await this.prisma.forTenant(user.tenantId).candidate.findFirst({
        where: { email: input.email, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new ConflictException("A candidate with this email already exists");
    }

    return this.prisma.forTenant(user.tenantId).candidate.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.currentCompany !== undefined && { currentCompany: input.currentCompany }),
        ...(input.currentTitle !== undefined && { currentTitle: input.currentTitle }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
        ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
        updatedById: user.userId,
      },
    });
  }

  async softDelete(id: string, user: RequestUser) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Candidate", id, AccessLevel.EDIT);
    return this.prisma.forTenant(user.tenantId).candidate.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.userId },
    });
  }

  async findExperiences(candidateId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).candidateExperience.findMany({
      where: { candidateId },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    });
  }

  async findEducations(candidateId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).candidateEducation.findMany({
      where: { candidateId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async findLanguages(candidateId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).candidateLanguage.findMany({
      where: { candidateId },
    });
  }
}
