import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

interface GllueCandidateRow extends GllueRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  current_company?: string;
  current_title?: string;
  location?: string;
  type?: string;
  status?: number;
  addedBy_id?: number;
  dateAdded?: string | Date;
}

const STATUS_MAP: Record<number, string> = {
  1: "ACTIVE",
  2: "INACTIVE",
  3: "PLACED",
  4: "BLACKLISTED",
};

@Injectable()
export class CandidateMapper implements GllueMapper<GllueCandidateRow> {
  readonly sourceTable = "candidate";
  readonly targetModel = "Candidate";
  readonly prismaModel = "candidate";

  async map(row: GllueCandidateRow, tenantId: string, resolveFk: FkResolver) {
    // Skip clientcontact type — handled by ClientContactMapper
    if (row.type === "clientcontact") return null;

    const createdById = row.addedBy_id ? await resolveFk("user", row.addedBy_id, tenantId) : null;

    return {
      tenantId,
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      email: row.email ?? null,
      phone: row.phone_number ?? null,
      currentCompany: row.current_company ?? null,
      currentTitle: row.current_title ?? null,
      location: row.location ?? null,
      status: STATUS_MAP[row.status ?? 1] ?? "ACTIVE",
      createdById,
      ownerUserId: createdById,
      deletedAt: row.is_deleted ? new Date(row.dateAdded as string) : null,
    };
  }
}
