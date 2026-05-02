import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { JobStatus, JobPriority } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { ClientService } from "../client/client.service";
import { generateId } from "../common/ulid";
import { CreateJobInput } from "./dto/create-job.input";
import { UpdateJobInput } from "./dto/update-job.input";

const OPEN_STATUSES = new Set<JobStatus>([JobStatus.OPEN]);

@Injectable()
export class JobService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ClientService) private readonly clientService: ClientService
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).job.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const job = await this.prisma.forTenant(tenantId).job.findFirst({
      where: { id, deletedAt: null },
    });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  async create(tenantId: string, userId: string, input: CreateJobInput) {
    const isOpen = !input.status || input.status === JobStatus.OPEN;
    const job = await this.prisma.forTenant(tenantId).job.create({
      data: {
        id: generateId(),
        tenantId,
        clientId: input.clientId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? JobStatus.OPEN,
        priority: input.priority ?? JobPriority.MEDIUM,
        ownerUserId: input.ownerUserId ?? userId,
        assignedToId: input.assignedToId ?? null,
        openDate: input.openDate ?? null,
        closeDate: input.closeDate ?? null,
        createdById: userId,
      },
    });

    // Increment client rollup counters
    await this.clientService.adjustActiveJobCount(input.clientId, tenantId, isOpen ? 1 : 1);
    if (!isOpen) {
      // totalJobCount only (activeJobCount unchanged for non-open jobs)
      await this.prisma.forTenant(tenantId).client.update({
        where: { id: input.clientId },
        data: { totalJobCount: { increment: 1 }, activeJobCount: { decrement: 1 } },
      });
    }

    return job;
  }

  async update(id: string, tenantId: string, userId: string, input: UpdateJobInput) {
    const existing = await this.findById(id, tenantId);
    const job = await this.prisma.forTenant(tenantId).job.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
        ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
        ...(input.openDate !== undefined && { openDate: input.openDate }),
        ...(input.closeDate !== undefined && { closeDate: input.closeDate }),
        updatedById: userId,
      },
    });

    // Adjust activeJobCount when status changes
    if (input.status && input.status !== existing.status) {
      const wasOpen = OPEN_STATUSES.has(existing.status);
      const isNowOpen = OPEN_STATUSES.has(input.status);
      if (wasOpen && !isNowOpen) {
        await this.clientService.adjustActiveJobCount(existing.clientId, tenantId, -1);
      } else if (!wasOpen && isNowOpen) {
        await this.clientService.adjustActiveJobCount(existing.clientId, tenantId, 1);
      }
    }

    return job;
  }

  async softDelete(id: string, tenantId: string, userId: string) {
    const existing = await this.findById(id, tenantId);
    const job = await this.prisma.forTenant(tenantId).job.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
    if (OPEN_STATUSES.has(existing.status)) {
      await this.clientService.adjustActiveJobCount(existing.clientId, tenantId, -1);
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
