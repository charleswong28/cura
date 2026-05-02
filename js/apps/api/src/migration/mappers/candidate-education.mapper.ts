import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

interface GllueCandidateEducationRow extends GllueRow {
  candidate_id?: number;
  school?: string;
  degree?: string;
  major?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  order?: number;
}

@Injectable()
export class CandidateEducationMapper implements GllueMapper<GllueCandidateEducationRow> {
  readonly sourceTable = "candidateeducation";
  readonly targetModel = "CandidateEducation";
  readonly prismaModel = "candidateEducation";

  async map(row: GllueCandidateEducationRow, tenantId: string, resolveFk: FkResolver) {
    const candidateId = row.candidate_id
      ? await resolveFk("candidate", row.candidate_id, tenantId)
      : null;
    if (!candidateId) return null;

    return {
      tenantId,
      candidateId,
      institution: row.school ?? "",
      degree: row.degree ?? null,
      field: row.major ?? null,
      startDate: row.start_date ? new Date(row.start_date as string) : null,
      endDate: row.end_date ? new Date(row.end_date as string) : null,
      displayOrder: row.order ?? 0,
    };
  }
}
