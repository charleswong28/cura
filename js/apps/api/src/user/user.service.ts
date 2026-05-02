import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileInput } from "./dto/update-profile.input";

@Injectable()
export class UserService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByClerkUserId(clerkUserId: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    const user = await db.user.findFirst({
      where: { clerkUserId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.user.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findById(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    const user = await db.user.findFirst({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateProfile(clerkUserId: string, tenantId: string, input: UpdateProfileInput) {
    const user = await this.findByClerkUserId(clerkUserId, tenantId);
    const db = this.prisma.forTenant(tenantId);
    return db.user.update({
      where: { id: user.id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
      },
    });
  }

  async updateRole(userId: string, tenantId: string, role: "ADMIN" | "RECRUITER") {
    const user = await this.findById(userId, tenantId);
    const db = this.prisma.forTenant(tenantId);
    return db.user.update({
      where: { id: user.id },
      data: { legacyRole: role },
    });
  }
}
