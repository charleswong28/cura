import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

interface GllueCandidateExperienceRow extends GllueRow {
  candidate_id?: number;
  company?: string;
  title?: string;
  location?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  is_current?: number;
  description?: string;
  order?: number;
}

@Injectable()
export class CandidateExperienceMapper implements GllueMapper<GllueCandidateExperienceRow> {
  readonly sourceTable = "candidateexperience";
  readonly targetModel = "CandidateExperience";
  readonly prismaModel = "candidateExperience";

  async map(row: GllueCandidateExperienceRow, tenantId: string, resolveFk: FkResolver) {
    const candidateId = row.candidate_id
      ? await resolveFk("candidate", row.candidate_id, tenantId)
      : null;
    if (!candidateId) return null; // parent not yet synced

    return {
      tenantId,
      candidateId,
      company: row.company ?? "",
      title: row.title ?? "",
      location: row.location ?? null,
      startDate: row.start_date ? new Date(row.start_date as string) : null,
      endDate: row.end_date ? new Date(row.end_date as string) : null,
      isCurrent: !!row.is_current,
      description: row.description ?? null,
      displayOrder: row.order ?? 0,
    };
  }
}
