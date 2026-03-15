import { Injectable } from "@nestjs/common";
import DataLoader from "dataloader";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Request-scoped DataLoader factory for preventing N+1 queries in GraphQL.
 *
 * Each DataLoader instance caches and batches lookups within a single request.
 * Because this service is request-scoped, loaders are automatically created
 * fresh for each incoming GraphQL request — no cross-request cache leakage.
 *
 * Usage in a resolver:
 *   @ResolveField()
 *   async client(@Parent() job: JobModel) {
 *     return this.loaders.clientById.load(job.clientId);
 *   }
 */
@Injectable({ scope: 2 /* Scope.REQUEST */ })
export class DataLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Load a single Client by id */
  readonly clientById = new DataLoader<string, any>(async (ids) => {
    const clients = await this.prisma.client.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(clients.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) ?? null);
  });

  /** Load a single User by id */
  readonly userById = new DataLoader<string, any>(async (ids) => {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => map.get(id) ?? null);
  });

  /** Load a single Candidate by id */
  readonly candidateById = new DataLoader<string, any>(async (ids) => {
    const candidates = await this.prisma.candidate.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(candidates.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id) ?? null);
  });

  /** Load Jobs belonging to a Client (one-to-many) */
  readonly jobsByClientId = new DataLoader<string, any[]>(async (clientIds) => {
    const jobs = await this.prisma.job.findMany({
      where: { clientId: { in: [...clientIds] } },
    });
    const map = new Map<string, any[]>();
    for (const job of jobs) {
      const list = map.get(job.clientId) ?? [];
      list.push(job);
      map.set(job.clientId, list);
    }
    return clientIds.map((id) => map.get(id) ?? []);
  });
}
