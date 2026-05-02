import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { CreateClientInput } from "./dto/create-client.input";
import { UpdateClientInput } from "./dto/update-client.input";

@Injectable()
export class ClientService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const client = await this.prisma.forTenant(tenantId).client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async create(tenantId: string, userId: string, input: CreateClientInput) {
    const client = await this.prisma.forTenant(tenantId).client.create({
      data: {
        id: generateId(),
        tenantId,
        name: input.name,
        industry: input.industry ?? null,
        website: input.website ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        parentId: input.parentId ?? null,
        bdUserId: input.bdUserId ?? null,
        createdById: userId,
      },
    });

    // Update totalJobCount is 0 on create; activeJobCount maintained by job service
    return client;
  }

  async update(id: string, tenantId: string, userId: string, input: UpdateClientInput) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).client.update({
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
        updatedById: userId,
      },
    });
  }

  async softDelete(id: string, tenantId: string, userId: string) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).client.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
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

  /** Increment/decrement activeJobCount when a job status changes */
  async adjustActiveJobCount(clientId: string, tenantId: string, delta: 1 | -1) {
    await this.prisma.forTenant(tenantId).client.update({
      where: { id: clientId },
      data: {
        activeJobCount: { increment: delta },
        ...(delta === 1 && { totalJobCount: { increment: 1 } }),
      },
    });
  }
}
