import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";

@Injectable()
export class CandidateService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).candidate.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const candidate = await this.prisma.forTenant(tenantId).candidate.findFirst({
      where: { id, deletedAt: null },
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    return candidate;
  }

  async create(tenantId: string, userId: string, input: CreateCandidateInput) {
    return this.prisma.forTenant(tenantId).candidate.create({
      data: {
        id: generateId(),
        tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        currentCompany: input.currentCompany ?? null,
        currentTitle: input.currentTitle ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        ownerUserId: input.ownerUserId ?? userId,
        createdById: userId,
      },
    });
  }

  async update(id: string, tenantId: string, userId: string, input: UpdateCandidateInput) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).candidate.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.currentCompany !== undefined && { currentCompany: input.currentCompany }),
        ...(input.currentTitle !== undefined && { currentTitle: input.currentTitle }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
        updatedById: userId,
      },
    });
  }

  async softDelete(id: string, tenantId: string, userId: string) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).candidate.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
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
