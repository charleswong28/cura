import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../auth/redis.service";
import { generateId } from "../common/ulid";
import { CreateRoleInput } from "./dto/create-role.input";
import { UpdateRoleInput } from "./dto/update-role.input";

@Injectable()
export class RoleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  /** List all roles visible to this tenant (built-ins + tenant-specific). */
  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ tenantId: null }, { tenantId }] },
      orderBy: [{ builtin: "desc" }, { name: "asc" }],
    });
  }

  async findById(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, OR: [{ tenantId: null }, { tenantId }] },
    });
    if (!role) throw new NotFoundException("Role not found");
    return role;
  }

  /** Create a tenant-scoped custom role. */
  async create(tenantId: string, input: CreateRoleInput) {
    const existing = await this.prisma.role.findFirst({
      where: { tenantId, name: input.name },
    });
    if (existing) throw new ConflictException(`Role '${input.name}' already exists`);

    this.validatePermissionStrings(input.permissions);

    return this.prisma.role.create({
      data: {
        id: generateId(),
        tenantId,
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissions,
        builtin: false,
      },
    });
  }

  /** Update a tenant-scoped custom role. Built-in roles are read-only. */
  async update(id: string, tenantId: string, input: UpdateRoleInput) {
    const role = await this.findById(id, tenantId);
    if (role.builtin) throw new ForbiddenException("Built-in roles cannot be modified");
    if (role.tenantId !== tenantId)
      throw new ForbiddenException("Cannot modify a role belonging to another tenant");

    if (input.name && input.name !== role.name) {
      const nameConflict = await this.prisma.role.findFirst({
        where: { tenantId, name: input.name, id: { not: id } },
      });
      if (nameConflict) throw new ConflictException(`Role '${input.name}' already exists`);
    }

    if (input.permissions) this.validatePermissionStrings(input.permissions);

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.permissions !== undefined && { permissions: input.permissions }),
      },
    });

    // Bump user_ver for all holders so the permission cache is invalidated on next request
    await this.bumpAllHolders(id);

    return updated;
  }

  /** Delete a tenant-scoped custom role. Built-in roles cannot be deleted. */
  async delete(id: string, tenantId: string) {
    const role = await this.findById(id, tenantId);
    if (role.builtin) throw new ForbiddenException("Built-in roles cannot be deleted");
    if (role.tenantId !== tenantId)
      throw new ForbiddenException("Cannot delete a role belonging to another tenant");

    // Bump all holders before removing the role so they refresh their JWT
    await this.bumpAllHolders(id);

    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.roleDataScope.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });

    return role;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async bumpAllHolders(roleId: string): Promise<void> {
    const holders = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });
    await Promise.all(holders.map((h) => this.redis.incrUserVer(h.userId)));
  }

  private validatePermissionStrings(permissions: string[]): void {
    const valid = /^[a-z_]+:[a-z_*]+$/;
    const invalid = permissions.filter((p) => !valid.test(p));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid permission strings: ${invalid.join(", ")}. Expected format: resource:action`
      );
    }
  }
}
