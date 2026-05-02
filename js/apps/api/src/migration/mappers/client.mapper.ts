import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

@Injectable()
export class ClientMapper implements GllueMapper {
  readonly sourceTable = "client";
  readonly targetModel = "Client";
  readonly prismaModel = "client";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const bdUserId = row["bd_id"]
      ? await resolveFk("user", row["bd_id"] as number, tenantId)
      : null;
    const parentId = row["parent_id"]
      ? await resolveFk("client", row["parent_id"] as number, tenantId)
      : null;

    return {
      tenantId,
      name: (row["name"] as string) ?? "",
      industry: (row["industry"] as string) ?? null,
      website: (row["website"] as string) ?? null,
      phone: (row["phone"] as string) ?? null,
      address: (row["address"] as string) ?? null,
      bdUserId,
      parentId,
      deletedAt: row.is_deleted ? new Date() : null,
    };
  }
}
