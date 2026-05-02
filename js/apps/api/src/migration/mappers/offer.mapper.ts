import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

@Injectable()
export class OfferMapper implements GllueMapper {
  readonly sourceTable = "offersign";
  readonly targetModel = "Offer";
  readonly prismaModel = "offer";

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
      amount: row["salary"] ? Number(row["salary"]) : null,
      currency: (row["currency"] as string) ?? "USD",
      signedAt: row["sign_date"] ? new Date(row["sign_date"] as string) : null,
      startDate: row["start_date"] ? new Date(row["start_date"] as string) : null,
      createdById: createdById ?? "system",
    };
  }
}
