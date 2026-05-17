import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PermissionCacheService {
  /**
   * Cache structure: userId:tenantId -> { etag: string, permissions: Set<string> }
   */
  private cache = new Map<string, { etag: string; permissions: Set<string> }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches functional permissions for a user, using an ETag-based cache to avoid
   * expensive permission resolution on every request.
   */
  async getFunctionalPermissions(userId: string, tenantId: string): Promise<Set<string>> {
    const cacheKey = `${userId}:${tenantId}`;
    const currentEtag = await this.calculateEtag(userId, tenantId);

    const cached = this.cache.get(cacheKey);
    if (cached && cached.etag === currentEtag) {
      return cached.permissions;
    }

    // ETag mismatch or cache miss: perform full fetch
    const permissions = await this.performFullFetch(userId, tenantId);
    this.cache.set(cacheKey, { etag: currentEtag, permissions });

    return permissions;
  }

  /**
   * Calculates the ETag for the user's permissions.
   * Uses the maximum of (user_role.assigned_at, role.updated_at) as the ETag.
   */
  private async calculateEtag(userId: string, tenantId: string): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ etag: Date }>>`
        SELECT MAX(GREATEST(ur.assigned_at, r.updated_at)) AS etag
        FROM user_roles ur
        JOIN roles r ON ur."roleId" = r.id
        WHERE ur."userId" = ${userId} AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
      `;

      if (result.length === 0 || !result[0].etag) {
        return "no-permissions";
      }

      return result[0].etag.getTime().toString();
    } catch (error) {
      console.error("Failed to calculate permission ETag:", error);
      return `error-${Date.now()}`;
    }
  }

  private async performFullFetch(userId: string, tenantId: string): Promise<Set<string>> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { permissions: true, tenantId: true } } },
    });

    const permissions = new Set<string>();
    for (const { role } of userRoles) {
      // Include built-in roles (tenantId = null) and roles scoped to this tenant
      if (role.tenantId !== null && role.tenantId !== tenantId) continue;
      for (const perm of role.permissions as string[]) {
        if (perm === "*:*") {
          // Admin short-circuit: wildcard covers everything
          return new Set(["*:*"]);
        }
        permissions.add(perm);
      }
    }
    return permissions;
  }
}
