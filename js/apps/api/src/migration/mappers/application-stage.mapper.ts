import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

// Maps each Gllue stage table to the ApplicationStageType enum value
// Used by sub-mappers below; each Gllue table = one stage type
@Injectable()
export class ApplicationStageMapper implements GllueMapper {
  // `apply` table = APPLIED stage events
  readonly sourceTable = "apply";
  readonly targetModel = "ApplicationStage";
  readonly prismaModel = "applicationStage";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const applicationId = row["jobsubmission_id"]
      ? await resolveFk("jobsubmission", row["jobsubmission_id"] as number, tenantId)
      : null;
    if (!applicationId) return null;

    const enteredById = row["addedBy_id"]
      ? await resolveFk("user", row["addedBy_id"] as number, tenantId)
      : null;

    return {
      tenantId,
      applicationId,
      stage: "APPLIED",
      enteredAt: row.dateAdded ? new Date(row.dateAdded as string) : new Date(),
      enteredById: enteredById ?? "system",
      note: null,
    };
  }
}
