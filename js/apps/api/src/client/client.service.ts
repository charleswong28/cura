import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AccessLevel, DataScopeType } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { PermissionService } from "../permissions/permission.service";
import { RequestUser } from "../auth/auth.types";
import { generateId } from "../common/ulid";
import { decodeCursor, encodeCursor } from "../common/pagination/cursor";
import { CreateClientInput } from "./dto/create-client.input";
import { UpdateClientInput } from "./dto/update-client.input";
import { ClientFilterInput } from "./dto/client-filter.input";
import { ClientSortField } from "./dto/client-sort";
import { SortOrder } from "../candidate/dto/candidate-sort";
import {
  ClientTimelineEntry,
  ClientTimelineEventType,
} from "../common/graphql/models/client-timeline.model";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface FindClientsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: ClientFilterInput;
  sortBy?: ClientSortField;
  sortOrder?: SortOrder;
}

@Injectable()
export class ClientService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PermissionService) private readonly permissionService: PermissionService
  ) {}

  async findAll(user: RequestUser, args: FindClientsArgs = {}) {
    const db = this.prisma.forTenant(user.tenantId);

    const whereClause = await this.buildWhereClause(user, args.filter);
    const orderBy = this.buildOrderBy(args.sortBy, args.sortOrder) as unknown as Array<
      Record<string, "asc" | "desc">
    >;
    const { take, cursor, isBackward } = this.resolveCursorPaging(args);

    const totalCount = await db.client.count({ where: whereClause });

    const rows = await db.client.findMany({
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

  private async buildWhereClause(user: RequestUser, filter?: ClientFilterInput) {
    const scope = await this.permissionService.getDataScope(user, "Client");
    const scopeWhere: Record<string, unknown> = { deletedAt: null };

    if (scope === DataScopeType.ALL) {
      // no extra filter
    } else if (scope === DataScopeType.TEAM_TREE || scope === DataScopeType.MY_TEAMS) {
      const teamIds = user.teams.map((t) => t.id);
      const orClauses: unknown[] = [
        { bdUserId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Client") } },
      ];
      if (teamIds.length > 0) {
        orClauses.push({
          bdUser: { teamMemberships: { some: { teamId: { in: teamIds } } } },
        });
      }
      scopeWhere["OR"] = orClauses;
    } else if (scope === DataScopeType.MINE) {
      scopeWhere["OR"] = [
        { bdUserId: user.userId },
        { createdById: user.userId },
        { id: { in: await this.permissionService.getExplicitlyGrantedIds(user, "Client") } },
      ];
    } else {
      // EXPLICIT
      const grantedIds = await this.permissionService.getExplicitlyGrantedIds(user, "Client");
      scopeWhere["id"] = { in: grantedIds };
    }

    const filterAnd: Record<string, unknown>[] = [];
    if (filter?.status) filterAnd.push({ status: filter.status });
    if (filter?.industry)
      filterAnd.push({ industry: { contains: filter.industry, mode: "insensitive" } });

    if (filter?.search) {
      const term = filter.search;
      filterAnd.push({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { industry: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    if (filterAnd.length === 0) return scopeWhere;
    return { AND: [scopeWhere, ...filterAnd] };
  }

  private buildOrderBy(sortBy?: ClientSortField, sortOrder?: SortOrder) {
    const direction: "asc" | "desc" = sortOrder === SortOrder.ASC ? "asc" : "desc";
    switch (sortBy) {
      case ClientSortField.NAME:
        return [{ name: direction }, { id: direction }];
      case ClientSortField.CREATED_AT:
        return [{ createdAt: direction }, { id: direction }];
      case ClientSortField.UPDATED_AT:
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

  private resolveCursorPaging(args: FindClientsArgs) {
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
    const client = await db.client.findFirst({ where: { id, deletedAt: null } });
    if (!client) throw new NotFoundException("Client not found");
    await this.permissionService.assertCan(user, "Client", id, AccessLevel.VIEW);
    return client;
  }

  async create(user: RequestUser, input: CreateClientInput) {
    const db = this.prisma.forTenant(user.tenantId);

    // Default BD owner to creator so they get the OWNER auto-grant (§5.5).
    const bdUserId = input.bdUserId ?? user.userId;

    const client = await db.client.create({
      data: {
        id: generateId(),
        tenantId: user.tenantId,
        name: input.name,
        industry: input.industry ?? null,
        website: input.website ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        parentId: input.parentId ?? null,
        bdUserId,
        status: input.status,
        notes: input.notes ?? null,
        createdById: user.userId,
      },
    });

    await this.permissionService.autoGrantOnClientCreate(
      user.tenantId,
      user.userId,
      client.id,
      bdUserId
    );

    return client;
  }

  async update(id: string, user: RequestUser, input: UpdateClientInput) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Client", id, AccessLevel.EDIT);

    return this.prisma.forTenant(user.tenantId).client.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.industry !== undefined && { industry: input.industry }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.bdUserId !== undefined && { bdUserId: input.bdUserId }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
        updatedById: user.userId,
      },
    });
  }

  async softDelete(id: string, user: RequestUser) {
    await this.findById(id, user);
    await this.permissionService.assertCan(user, "Client", id, AccessLevel.EDIT);

    // Cascade: soft-delete all non-deleted linked jobs.
    await this.prisma.forTenant(user.tenantId).job.updateMany({
      where: { clientId: id, deletedAt: null },
      data: { deletedAt: new Date(), updatedById: user.userId },
    });

    return this.prisma.forTenant(user.tenantId).client.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.userId },
    });
  }

  async findJobs(clientId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).job.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findContacts(clientId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).clientContact.findMany({
      where: { clientId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
    });
  }

  async getTimeline(id: string, user: RequestUser): Promise<ClientTimelineEntry[]> {
    const client = await this.findById(id, user);
    const db = this.prisma.forTenant(user.tenantId);

    const [contacts, jobs] = await Promise.all([
      db.clientContact.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          createdAt: true,
          createdById: true,
        },
      }),
      db.job.findMany({
        where: { clientId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, createdAt: true, createdById: true },
      }),
    ]);

    const entries: ClientTimelineEntry[] = [
      {
        id: `${id}:created`,
        type: ClientTimelineEventType.CLIENT_CREATED,
        title: "Client added",
        description: client.name,
        occurredAt: client.createdAt,
        userId: (client as { createdById?: string | null }).createdById ?? null,
      },
      ...(
        contacts as Array<{
          id: string;
          firstName: string;
          lastName: string;
          title: string | null;
          createdAt: Date;
          createdById: string | null;
        }>
      ).map((c) => ({
        id: `contact:${c.id}`,
        type: ClientTimelineEventType.CONTACT_ADDED,
        title: "Contact added",
        description: [c.firstName, c.lastName, c.title ? `(${c.title})` : null]
          .filter(Boolean)
          .join(" "),
        occurredAt: c.createdAt,
        userId: c.createdById ?? null,
      })),
      ...(
        jobs as Array<{ id: string; title: string; createdAt: Date; createdById: string | null }>
      ).map((j) => ({
        id: `job:${j.id}`,
        type: ClientTimelineEventType.JOB_OPENED,
        title: "Job opened",
        description: j.title,
        occurredAt: j.createdAt,
        userId: j.createdById ?? null,
      })),
    ];

    return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
}
