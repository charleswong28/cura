import { Injectable } from "@nestjs/common";
import type { GllueRow, GllueMapper, FkResolver } from "../migration.types";

@Injectable()
export class ClientContactMapper implements GllueMapper {
  // Gllue stores clientcontacts as candidates with type='clientcontact'
  readonly sourceTable = "clientcontact";
  readonly targetModel = "ClientContact";
  readonly prismaModel = "clientContact";

  async map(row: GllueRow, tenantId: string, resolveFk: FkResolver) {
    const clientId = row["client_id"]
      ? await resolveFk("client", row["client_id"] as number, tenantId)
      : null;
    if (!clientId) return null;

    return {
      tenantId,
      clientId,
      firstName: (row["first_name"] as string) ?? "",
      lastName: (row["last_name"] as string) ?? "",
      title: (row["title"] as string) ?? null,
      email: (row["email"] as string) ?? null,
      phone: (row["phone_number"] as string) ?? null,
      isPrimary: false,
      deletedAt: row.is_deleted ? new Date() : null,
    };
  }
}
