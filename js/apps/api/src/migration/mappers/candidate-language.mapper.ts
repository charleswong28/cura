import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

const PROFICIENCY_MAP: Record<string, string> = {
  basic: "BASIC",
  conversational: "CONVERSATIONAL",
  professional: "PROFESSIONAL",
  native: "NATIVE",
  "1": "BASIC",
  "2": "CONVERSATIONAL",
  "3": "PROFESSIONAL",
  "4": "NATIVE",
};

@Injectable()
export class CandidateLanguageMapper implements GllueMapper {
  readonly sourceTable = "candidatelanguage";
  readonly targetModel = "CandidateLanguage";
  readonly prismaModel = "candidateLanguage";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const candidateId = row["candidate_id"]
      ? await resolveFk("candidate", row["candidate_id"] as number, tenantId)
      : null;
    if (!candidateId) return null;

    return {
      tenantId,
      candidateId,
      language: (row["language"] as string) ?? "en",
      proficiency:
        PROFICIENCY_MAP[String(row["level"] ?? row["proficiency"] ?? "1").toLowerCase()] ?? "BASIC",
    };
  }
}
