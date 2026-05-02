import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { MigrationService } from "./migration.service";
import type { RequestUser } from "../auth";

@Injectable()
export class MigrationReadOnlyGuard implements CanActivate {
  constructor(private readonly migrationService: MigrationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext<{ req: { user?: RequestUser } }>().req;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return true; // JwtAuthGuard handles missing token

    const config = await this.migrationService.getConfig(tenantId);
    if (config?.readOnly) {
      throw new ForbiddenException(
        "MIGRATION_READ_ONLY: Cura is in read-only mode during the Gllue parallel-run window. Contact your administrator to initiate cutover."
      );
    }
    return true;
  }
}
