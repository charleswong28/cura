import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MigrationService } from "../migration.service";
import { JobApplicationMapper } from "../mappers/job-application.mapper";
import { ApplicationStageMapper } from "../mappers/application-stage.mapper";
import { InterviewMapper } from "../mappers/interview.mapper";
import { OfferMapper } from "../mappers/offer.mapper";

const GLLUE_TENANT_ID = process.env["GLLUE_TENANT_ID"] ?? "";

@Injectable()
export class ApplicationSyncService {
  private readonly logger = new Logger(ApplicationSyncService.name);

  constructor(
    private readonly migrationService: MigrationService,
    private readonly applicationMapper: JobApplicationMapper,
    private readonly stageMapper: ApplicationStageMapper,
    private readonly interviewMapper: InterviewMapper,
    private readonly offerMapper: OfferMapper
  ) {}

  @Cron("*/15 * * * *", { name: "sync-applications" })
  async run() {
    if (!GLLUE_TENANT_ID || !(await this.migrationService.isSyncEnabled(GLLUE_TENANT_ID))) return;
    this.logger.log("Starting application sync");

    const appResult = await this.migrationService.syncTable(
      GLLUE_TENANT_ID,
      this.applicationMapper
    );
    const stageResult = await this.migrationService.syncTable(GLLUE_TENANT_ID, this.stageMapper);
    const interviewResult = await this.migrationService.syncTable(
      GLLUE_TENANT_ID,
      this.interviewMapper
    );
    const offerResult = await this.migrationService.syncTable(GLLUE_TENANT_ID, this.offerMapper);

    this.logger.log(
      `Application sync done: apps=${JSON.stringify(appResult)} stages=${JSON.stringify(stageResult)} interviews=${JSON.stringify(interviewResult)} offers=${JSON.stringify(offerResult)}`
    );
  }
}
