import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccessLevel, DataScopeType } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService } from "../permissions/permission.service";
import { RequestUser } from "../auth/auth.types";
import { generateId } from "../common/ulid";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";
import { CandidateFilterInput } from "./dto/candidate-filter.input";
import { CandidateSortField, SortOrder } from "./dto/candidate-sort";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface FindCandidatesArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: CandidateFilterInput;
  sortBy?: CandidateSortField;
  sortOrder?: SortOrder;
}

@Injectable()
export class CandidateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionService) private readonly permissionService: PermissionService
  ) {}

  async findAll(user: RequestUser, args: FindCandidatesArgs = {}) {
    const db = this.prisma.forTenant(user.tenantId);

    const whereClause = await this.buildWhereClause(user, args.filter);
    const orderBy = this.buildOrderBy(args.sortBy, args.sortOrder) as unknown as Array<
      Record<string, "asc" | "desc">
    >;
    const { take, cursor, isBackward } = this.resolveCursorPaging(args);

    const totalCount = await db.candidate.count({ where: whereClause });

    // Fetch one extra row to determine hasNextPage / hasPreviousPage cheaply.
    const rows = await db.candidate.findMany({
      where: whereClause,
      orderBy: isBackward ? this.invertOrderBy(orderBy) : orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasExtra = rows.length > take;
    const pageRows = hasExtra ? rows.slice(0, take) : rows;
    const orderedRows = isBackward ? [...pageRows].reverse() : pageRows;

    const edges = orderedRows.map((node) => ({ cursor: encodeCursor(node.id), node }));

    return {
      edges,
      pageInfo: {
        hasNextPage: isBackward ? Boolean(cursor) : hasExtra,
        hasPreviousPage: isBackward ? hasExtra : Boolean(cursor),
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount,
    };
  }

  private async buildWhereClause(user: RequestUser, filter?: CandidateFilterInput) {
    const scope = await this.permissionService.getDataScope(user, "Candidate");
    const scopeWhere: Record<string, unknown> = { deletedAt: null };

    if (scope === DataScopeType.ALL) {
      // no extra filter
    } else if (scope === DataScopeType.TEAM_TREE || scope === DataScopeType.MY_TEAMS) {
      const teamIds = user.teams.map((t) => t.id);
      const orClauses: unknown[] = [
        { ownerUserId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Candidate") } },
      ];
      if (teamIds.length > 0) {
        orClauses.push({
          ownerUser: { teamMemberships: { some: { teamId: { in: teamIds } } } },
        });
      }
      scopeWhere["OR"] = orClauses;
    } else if (scope === DataScopeType.MINE) {
      scopeWhere["OR"] = [
        { ownerUserId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Candidate") } },
      ];
    } else {
      // EXPLICIT
      const grantedIds = await this.permissionService.getExplicitlyGrantedIds(user, "Candidate");
      scopeWhere["id"] = { in: grantedIds };
    }

    const filterAnd: Record<string, unknown>[] = [];
    if (filter?.status) filterAnd.push({ status: filter.status });
    if (filter?.currentCompany)
      filterAnd.push({ currentCompany: { contains: filter.currentCompany, mode: "insensitive" } });
    if (filter?.currentTitle)
      filterAnd.push({ currentTitle: { contains: filter.currentTitle, mode: "insensitive" } });
    if (filter?.location)
      filterAnd.push({ location: { contains: filter.location, mode: "insensitive" } });

    if (filter?.search) {
      const term = filter.search;
      filterAnd.push({
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { currentCompany: { contains: term, mode: "insensitive" } },
          { currentTitle: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    if (filterAnd.length === 0) return scopeWhere;
    return { AND: [scopeWhere, ...filterAnd] };
  }

  private buildOrderBy(sortBy?: CandidateSortField, sortOrder?: SortOrder) {
    const direction: "asc" | "desc" = sortOrder === SortOrder.ASC ? "asc" : "desc";
    switch (sortBy) {
      case CandidateSortField.NAME:
        // Stable secondary on id so duplicate names paginate deterministically.
        return [{ lastName: direction }, { firstName: direction }, { id: direction }];
      case CandidateSortField.CREATED_AT:
        return [{ createdAt: direction }, { id: direction }];
      case CandidateSortField.UPDATED_AT:
      default:
        return [{ updatedAt: direction }, { id: direction }];
    }
  }

  private invertOrderBy(
    orderBy: Array<Record<string, "asc" | "desc">>
  ): Array<Record<string, "asc" | "desc">> {
    return orderBy.map((clause) => {
      const entries = Object.entries(clause) as Array<[string, "asc" | "desc"]>;
      const flipped: Record<string, "asc" | "desc"> = {};
      for (const [k, v] of entries) flipped[k] = v === "asc" ? "desc" : "asc";
      return flipped;
    });
  }

  private resolveCursorPaging(args: FindCandidatesArgs) {
    if (args.first != null && args.last != null) {
      throw new BadRequestException("Pass either `first` or `last`, not both");
    }
    if (args.after && args.before) {
      throw new BadRequestException("Pass either `after` or `before`, not both");
    }

    const isBackward = args.last != null || args.before != null;
    const requested = isBackward
      ? (args.last ?? DEFAULT_PAGE_SIZE)
      : (args.first ?? DEFAULT_PAGE_SIZE);
    if (requested < 1) throw new BadRequestException("Page size must be >= 1");
    const take = Math.min(requested, MAX_PAGE_SIZE);

    const rawCursor = isBackward ? args.before : args.after;
    let cursor: string | undefined;
    if (rawCursor) {
      try {
        cursor = decodeCursor(rawCursor);
      } catch {
        throw new BadRequestException("Invalid cursor");
      }
      if (!cursor) throw new BadRequestException("Invalid cursor");
    }

    return { take, cursor, isBackward };
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
        where: { email: { equals: input.email, mode: "insensitive" }, deletedAt: null },
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
        where: {
          email: { equals: input.email, mode: "insensitive" },
          deletedAt: null,
          NOT: { id },
        },
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
