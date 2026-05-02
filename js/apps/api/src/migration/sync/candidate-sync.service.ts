import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MigrationService } from "../migration.service";
import { CandidateMapper } from "../mappers/candidate.mapper";
import { CandidateExperienceMapper } from "../mappers/candidate-experience.mapper";
import { CandidateEducationMapper } from "../mappers/candidate-education.mapper";
import { CandidateLanguageMapper } from "../mappers/candidate-language.mapper";

const GLLUE_TENANT_ID = process.env["GLLUE_TENANT_ID"] ?? "";

@Injectable()
export class CandidateSyncService {
  private readonly logger = new Logger(CandidateSyncService.name);

  constructor(
    private readonly migrationService: MigrationService,
    private readonly candidateMapper: CandidateMapper,
    private readonly experienceMapper: CandidateExperienceMapper,
    private readonly educationMapper: CandidateEducationMapper,
    private readonly languageMapper: CandidateLanguageMapper
  ) {}

  @Cron("*/15 * * * *", { name: "sync-candidates" })
  async run() {
    if (!GLLUE_TENANT_ID || !(await this.migrationService.isSyncEnabled(GLLUE_TENANT_ID))) return;
    this.logger.log("Starting candidate sync");

    const results = await Promise.all([
      this.migrationService.syncTable(GLLUE_TENANT_ID, this.candidateMapper),
      this.migrationService.syncTable(GLLUE_TENANT_ID, this.experienceMapper),
      this.migrationService.syncTable(GLLUE_TENANT_ID, this.educationMapper),
      this.migrationService.syncTable(GLLUE_TENANT_ID, this.languageMapper),
    ]);

    this.logger.log(`Candidate sync done: ${JSON.stringify(results)}`);
  }
}
