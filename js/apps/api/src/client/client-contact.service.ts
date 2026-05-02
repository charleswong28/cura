import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { CreateClientContactInput } from "./dto/create-client-contact.input";

@Injectable()
export class ClientContactService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string) {
    const contact = await this.prisma.forTenant(tenantId).clientContact.findFirst({
      where: { id, deletedAt: null },
    });
    if (!contact) throw new NotFoundException("ClientContact not found");
    return contact;
  }

  async create(tenantId: string, userId: string, input: CreateClientContactInput) {
    if (input.isPrimary) {
      // Clear existing primary flag for this client
      await this.prisma.forTenant(tenantId).clientContact.updateMany({
        where: { clientId: input.clientId, isPrimary: true, deletedAt: null },
        data: { isPrimary: false },
      });
    }
    return this.prisma.forTenant(tenantId).clientContact.create({
      data: {
        id: generateId(),
        tenantId,
        clientId: input.clientId,
        firstName: input.firstName,
        lastName: input.lastName,
        title: input.title ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        isPrimary: input.isPrimary ?? false,
        createdById: userId,
      },
    });
  }

  async softDelete(id: string, tenantId: string, userId: string) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).clientContact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
