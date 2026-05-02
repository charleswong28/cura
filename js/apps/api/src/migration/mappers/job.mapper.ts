import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

const STATUS_MAP: Record<number, string> = {
  1: "OPEN",
  2: "ON_HOLD",
  3: "FILLED",
  4: "CLOSED",
};

@Injectable()
export class JobMapper implements GllueMapper {
  readonly sourceTable = "joborder";
  readonly targetModel = "Job";
  readonly prismaModel = "job";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const clientId = row["client_id"]
      ? await resolveFk("client", row["client_id"] as number, tenantId)
      : null;
    if (!clientId) return null;

    const createdById = row["addedBy_id"]
      ? await resolveFk("user", row["addedBy_id"] as number, tenantId)
      : null;

    return {
      tenantId,
      clientId,
      title: (row["title"] as string) ?? "",
      description: (row["description"] as string) ?? null,
      status: STATUS_MAP[row["status"] as number] ?? "OPEN",
      priority: "MEDIUM",
      createdById,
      ownerUserId: createdById,
      deletedAt: row.is_deleted ? new Date() : null,
    };
  }
}
