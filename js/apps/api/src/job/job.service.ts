import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GranteeType, GrantSource } from "../generated/prisma/enums";
import { AccessLevel, DataScopeType, JobPriority, JobStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { ClientService } from "../client/client.service";
import { PermissionService } from "../permissions/permission.service";
import { RequestUser } from "../auth/auth.types";
import { generateId } from "../common/ulid";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";
import { CreateJobInput } from "./dto/create-job.input";
import { UpdateJobInput } from "./dto/update-job.input";
import { JobFilterInput } from "./dto/job-filter.input";
import { JobSortField } from "./dto/job-sort";
import { SortOrder } from "../candidate/dto/candidate-sort";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const OPEN_STATUSES = new Set<JobStatus>([JobStatus.OPEN]);

// Allowed status transitions. Source of truth for the workflow guard.
// Reopen paths exist for FILLED/CLOSED so recruiters can recover from bad
// data or fell-through placements; ON_HOLD is a temporary park for open jobs.
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.OPEN]: [JobStatus.ON_HOLD, JobStatus.FILLED, JobStatus.CLOSED],
  [JobStatus.ON_HOLD]: [JobStatus.OPEN, JobStatus.FILLED, JobStatus.CLOSED],
  [JobStatus.FILLED]: [JobStatus.OPEN, JobStatus.CLOSED],
  [JobStatus.CLOSED]: [JobStatus.OPEN],
};

const TERMINAL_STATUSES = new Set<JobStatus>([JobStatus.FILLED, JobStatus.CLOSED]);

export interface FindJobsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: JobFilterInput;
  sortBy?: JobSortField;
  sortOrder?: SortOrder;
}

@Injectable()
export class JobService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ClientService) private readonly clientService: ClientService,
    @Inject(PermissionService) private readonly permissionService: PermissionService
  ) {}

  async findAll(user: RequestUser, args: FindJobsArgs = {}) {
    const db = this.prisma.forTenant(user.tenantId);

    const whereClause = await this.buildWhereClause(user, args.filter);
    const orderBy = this.buildOrderBy(args.sortBy, args.sortOrder) as unknown as Array<
      Record<string, "asc" | "desc">
    >;
    const { take, cursor, isBackward } = this.resolveCursorPaging(args);

    const totalCount = await db.job.count({ where: whereClause });

    const rows = await db.job.findMany({
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

  private async buildWhereClause(user: RequestUser, filter?: JobFilterInput) {
    const scope = await this.permissionService.getDataScope(user, "Job");
    const scopeWhere: Record<string, unknown> = { deletedAt: null };

    if (scope === DataScopeType.ALL) {
      // no extra filter
    } else if (scope === DataScopeType.TEAM_TREE || scope === DataScopeType.MY_TEAMS) {
      const teamIds = user.teams.map((t) => t.id);
      const orClauses: unknown[] = [
        { ownerUserId: user.userId },
        { assignedToId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Job") } },
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
        { assignedToId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Job") } },
      ];
    } else {
      // EXPLICIT
      const grantedIds = await this.permissionService.getExplicitlyGrantedIds(user, "Job");
      scopeWhere["id"] = { in: grantedIds };
    }

    const filterAnd: Record<string, unknown>[] = [];
    if (filter?.status) filterAnd.push({ status: filter.status });
    if (filter?.priority) filterAnd.push({ priority: filter.priority });
    if (filter?.clientId) filterAnd.push({ clientId: filter.clientId });
    if (filter?.assignedToId) filterAnd.push({ assignedToId: filter.assignedToId });

    if (filter?.search) {
      const term = filter.search;
      filterAnd.push({
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    if (filterAnd.length === 0) return scopeWhere;
    return { AND: [scopeWhere, ...filterAnd] };
  }

  private buildOrderBy(sortBy?: JobSortField, sortOrder?: SortOrder) {
    const direction: "asc" | "desc" = sortOrder === SortOrder.ASC ? "asc" : "desc";
    switch (sortBy) {
      case JobSortField.TITLE:
        return [{ title: direction }, { id: direction }];
      case JobSortField.CREATED_AT:
        return [{ createdAt: direction }, { id: direction }];
      case JobSortField.PRIORITY:
        return [{ priority: direction }, { id: direction }];
      case JobSortField.UPDATED_AT:
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

  private resolveCursorPaging(args: FindJobsArgs) {
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
    const job = await db.job.findFirst({ where: { id, deletedAt: null } });
    if (!job) throw new NotFoundException("Job not found");
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.VIEW);
    return job;
  }

  async create(user: RequestUser, input: CreateJobInput) {
    const db = this.prisma.forTenant(user.tenantId);

    // Validate clientId exists in the same tenant and is not soft-deleted.
    const client = await db.client.findFirst({
      where: { id: input.clientId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new BadRequestException("Client not found");

    const status = input.status ?? JobStatus.OPEN;
    const isOpen = OPEN_STATUSES.has(status);

    const job = await db.job.create({
      data: {
        id: generateId(),
        tenantId: user.tenantId,
        clientId: input.clientId,
        title: input.title,
        description: input.description ?? null,
        requirements: input.requirements ?? null,
        status,
        priority: input.priority ?? JobPriority.MEDIUM,
        ownerUserId: input.ownerUserId ?? user.userId,
        assignedToId: input.assignedToId ?? null,
        openDate: input.openDate ?? null,
        closeDate: input.closeDate ?? null,
        createdById: user.userId,
      },
    });

    // Roll up client counters: totalJobCount always; activeJobCount only when OPEN.
    await db.client.update({
      where: { id: input.clientId },
      data: {
        totalJobCount: { increment: 1 },
        ...(isOpen && { activeJobCount: { increment: 1 } }),
      },
    });

    await this.permissionService.autoGrantOnJobCreate(
      user.tenantId,
      user.userId,
      job.id,
      job.ownerUserId ?? user.userId,
      input.clientId
    );

    return job;
  }

  async update(id: string, user: RequestUser, input: UpdateJobInput) {
    const existing = await this.findById(id, user);
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.EDIT);

    const db = this.prisma.forTenant(user.tenantId);

    // If clientId is being changed, validate the new one.
    if (input.clientId !== undefined && input.clientId !== existing.clientId) {
      const client = await db.client.findFirst({
        where: { id: input.clientId, deletedAt: null },
        select: { id: true },
      });
      if (!client) throw new BadRequestException("Client not found");
    }

    const job = await db.job.update({
      where: { id },
      data: {
        ...(input.clientId !== undefined && { clientId: input.clientId }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.requirements !== undefined && { requirements: input.requirements }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
        ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
        ...(input.openDate !== undefined && { openDate: input.openDate }),
        ...(input.closeDate !== undefined && { closeDate: input.closeDate }),
        updatedById: user.userId,
      },
    });

    // Adjust activeJobCount when open/closed status flips.
    if (input.status && input.status !== existing.status) {
      const wasOpen = OPEN_STATUSES.has(existing.status);
      const isNowOpen = OPEN_STATUSES.has(input.status);
      if (wasOpen && !isNowOpen) {
        await db.client.update({
          where: { id: existing.clientId },
          data: { activeJobCount: { decrement: 1 } },
        });
      } else if (!wasOpen && isNowOpen) {
        await db.client.update({
          where: { id: existing.clientId },
          data: { activeJobCount: { increment: 1 } },
        });
      }
    }

    return job;
  }

  async softDelete(id: string, user: RequestUser) {
    const existing = await this.findById(id, user);
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.EDIT);

    const db = this.prisma.forTenant(user.tenantId);
    const job = await db.job.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.userId },
    });

    if (OPEN_STATUSES.has(existing.status)) {
      await db.client.update({
        where: { id: existing.clientId },
        data: { activeJobCount: { decrement: 1 } },
      });
    }

    return job;
  }

  async changeStatus(id: string, user: RequestUser, status: JobStatus) {
    const existing = await this.findById(id, user);
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.EDIT);

    if (existing.status === status) return existing;

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition job from ${existing.status} to ${status}`);
    }

    const db = this.prisma.forTenant(user.tenantId);
    const wasOpen = OPEN_STATUSES.has(existing.status);
    const isNowOpen = OPEN_STATUSES.has(status);

    // Auto-manage closeDate: set when entering a terminal status, clear when reopening.
    const enteringTerminal =
      TERMINAL_STATUSES.has(status) && !TERMINAL_STATUSES.has(existing.status);
    const leavingTerminal =
      !TERMINAL_STATUSES.has(status) && TERMINAL_STATUSES.has(existing.status);

    const job = await db.job.update({
      where: { id },
      data: {
        status,
        ...(enteringTerminal && existing.closeDate === null && { closeDate: new Date() }),
        ...(leavingTerminal && { closeDate: null }),
        updatedById: user.userId,
      },
    });

    if (wasOpen && !isNowOpen) {
      await db.client.update({
        where: { id: existing.clientId },
        data: { activeJobCount: { decrement: 1 } },
      });
    } else if (!wasOpen && isNowOpen) {
      await db.client.update({
        where: { id: existing.clientId },
        data: { activeJobCount: { increment: 1 } },
      });
    }

    return job;
  }

  async changePriority(id: string, user: RequestUser, priority: JobPriority) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.EDIT);

    return this.prisma.forTenant(user.tenantId).job.update({
      where: { id },
      data: { priority, updatedById: user.userId },
    });
  }

  async assign(id: string, user: RequestUser, assignedToId: string | null) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Job", id, AccessLevel.EDIT);

    const db = this.prisma.forTenant(user.tenantId);

    if (assignedToId) {
      const target = await db.user.findFirst({
        where: { id: assignedToId, deletedAt: null, loginable: true },
        select: { id: true },
      });
      if (!target) {
        throw new BadRequestException("Assignee not found or not active in this tenant");
      }
    }

    const job = await db.job.update({
      where: { id },
      data: { assignedToId, updatedById: user.userId },
    });

    // Auto-grant EDIT to the assignee so they can work the job. Skip if unassigning.
    if (assignedToId) {
      await this.permissionService.grant({
        tenantId: user.tenantId,
        granteeType: GranteeType.USER,
        granteeId: assignedToId,
        resourceType: "Job",
        resourceId: id,
        accessLevel: AccessLevel.EDIT,
        grantSource: GrantSource.RULE,
        actorId: user.userId,
      });
    }

    return job;
  }

  async incrementCounter(
    jobId: string,
    tenantId: string,
    field: "applicationCount" | "interviewCount" | "offerCount" | "placementCount"
  ) {
    await this.prisma.forTenant(tenantId).job.update({
      where: { id: jobId },
      data: { [field]: { increment: 1 } },
    });
  }
}
