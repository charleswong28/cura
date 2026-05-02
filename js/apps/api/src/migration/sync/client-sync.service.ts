import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MigrationService } from "../migration.service";
import { ClientMapper } from "../mappers/client.mapper";
import { ClientContactMapper } from "../mappers/client-contact.mapper";

const GLLUE_TENANT_ID = process.env["GLLUE_TENANT_ID"] ?? "";

@Injectable()
export class ClientSyncService {
  private readonly logger = new Logger(ClientSyncService.name);

  constructor(
    private readonly migrationService: MigrationService,
    private readonly clientMapper: ClientMapper,
    private readonly contactMapper: ClientContactMapper
  ) {}

  @Cron("*/30 * * * *", { name: "sync-clients" })
  async run() {
    if (!GLLUE_TENANT_ID || !(await this.migrationService.isSyncEnabled(GLLUE_TENANT_ID))) return;
    this.logger.log("Starting client sync");

    const clientResult = await this.migrationService.syncTable(GLLUE_TENANT_ID, this.clientMapper);
    const contactResult = await this.migrationService.syncTable(
      GLLUE_TENANT_ID,
      this.contactMapper
    );

    this.logger.log(
      `Client sync done: clients=${JSON.stringify(clientResult)} contacts=${JSON.stringify(contactResult)}`
    );
  }
}
