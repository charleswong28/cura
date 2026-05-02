import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

@Injectable()
export class InterviewMapper implements GllueMapper {
  readonly sourceTable = "clientinterview";
  readonly targetModel = "Interview";
  readonly prismaModel = "interview";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const applicationId = row["jobsubmission_id"]
      ? await resolveFk("jobsubmission", row["jobsubmission_id"] as number, tenantId)
      : null;
    if (!applicationId) return null;

    const createdById = row["addedBy_id"]
      ? await resolveFk("user", row["addedBy_id"] as number, tenantId)
      : null;

    return {
      tenantId,
      applicationId,
      round: (row["round"] as number) ?? 1,
      scheduledAt: row["interview_date"]
        ? new Date(row["interview_date"] as string)
        : new Date(row.dateAdded as string),
      completedAt: row["feedback"] ? new Date(row.lastUpdateDate as string) : null,
      feedback: (row["feedback"] as string) ?? null,
      createdById: createdById ?? "system",
    };
  }
}
