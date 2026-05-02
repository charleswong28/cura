import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MigrationService } from "../migration.service";
import { JobMapper } from "../mappers/job.mapper";

const GLLUE_TENANT_ID = process.env["GLLUE_TENANT_ID"] ?? "";

@Injectable()
export class JobSyncService {
  private readonly logger = new Logger(JobSyncService.name);

  constructor(
    private readonly migrationService: MigrationService,
    private readonly jobMapper: JobMapper
  ) {}

  @Cron("*/30 * * * *", { name: "sync-jobs" })
  async run() {
    if (!GLLUE_TENANT_ID || !(await this.migrationService.isSyncEnabled(GLLUE_TENANT_ID))) return;
    this.logger.log("Starting job sync");

    const result = await this.migrationService.syncTable(GLLUE_TENANT_ID, this.jobMapper);
    this.logger.log(`Job sync done: ${JSON.stringify(result)}`);
  }
}
