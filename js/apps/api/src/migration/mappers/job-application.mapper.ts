import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

const MAX_STAGE_MAP: Record<number, string> = {
  0: "APPLIED",
  1: "LONGLIST",
  2: "CV_SENT",
  3: "INTERVIEW",
  4: "OFFER",
  5: "PLACEMENT",
  "-1": "REJECTED",
};

@Injectable()
export class JobApplicationMapper implements GllueMapper {
  readonly sourceTable = "jobsubmission";
  readonly targetModel = "JobApplication";
  readonly prismaModel = "jobApplication";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const candidateId = row["candidate_id"]
      ? await resolveFk("candidate", row["candidate_id"] as number, tenantId)
      : null;
    const jobId = row["joborder_id"]
      ? await resolveFk("joborder", row["joborder_id"] as number, tenantId)
      : null;

    if (!candidateId || !jobId) return null;

    const createdById = row["addedBy_id"]
      ? await resolveFk("user", row["addedBy_id"] as number, tenantId)
      : null;

    return {
      tenantId,
      candidateId,
      jobId,
      source: (row["source"] as string) ?? null,
      maxStage: MAX_STAGE_MAP[row["max_status"] as number] ?? "APPLIED",
      isActive: !row.is_deleted && row["max_status"] !== -1,
      createdById,
      ownerUserId: createdById,
      deletedAt: row.is_deleted ? new Date() : null,
    };
  }
}
