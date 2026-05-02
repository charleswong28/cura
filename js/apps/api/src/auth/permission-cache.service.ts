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
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${userId} AND (r.tenant_id = ${tenantId} OR r.tenant_id IS NULL)
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

  /**
   * Performs the full fetch of permissions.
   * For now, this is a placeholder that will be implemented in TASK-087.
   */
  private async performFullFetch(userId: string, tenantId: string): Promise<Set<string>> {
    // In a real implementation, this would resolve all roles, teams, and direct permissions.
    // For TASK-084, we just need the mechanism to be in place.
    return new Set<string>();
  }
}
