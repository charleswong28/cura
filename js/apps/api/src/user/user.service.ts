import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileInput } from "./dto/update-profile.input";

@Injectable()
export class UserService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId).user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string, tenantId: string) {
    const user = await this.prisma.forTenant(tenantId).user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, tenantId: string, input: UpdateProfileInput) {
    await this.findById(userId, tenantId);
    return this.prisma.forTenant(tenantId).user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
      },
    });
  }
}
