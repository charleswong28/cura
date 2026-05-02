import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MigrationService } from "./migration.service";
import { MigrationReadOnlyGuard } from "./migration.guard";
import { GllueClientService } from "./gllue-client.service";

// Sync services
import { CandidateSyncService } from "./sync/candidate-sync.service";
import { ClientSyncService } from "./sync/client-sync.service";
import { JobSyncService } from "./sync/job-sync.service";
import { ApplicationSyncService } from "./sync/application-sync.service";

// Mappers
import { CandidateMapper } from "./mappers/candidate.mapper";
import { CandidateExperienceMapper } from "./mappers/candidate-experience.mapper";
import { CandidateEducationMapper } from "./mappers/candidate-education.mapper";
import { CandidateLanguageMapper } from "./mappers/candidate-language.mapper";
import { ClientMapper } from "./mappers/client.mapper";
import { ClientContactMapper } from "./mappers/client-contact.mapper";
import { JobMapper } from "./mappers/job.mapper";
import { JobApplicationMapper } from "./mappers/job-application.mapper";
import { ApplicationStageMapper } from "./mappers/application-stage.mapper";
import { InterviewMapper } from "./mappers/interview.mapper";
import { OfferMapper } from "./mappers/offer.mapper";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    GllueClientService,
    MigrationService,
    MigrationReadOnlyGuard,
    CandidateSyncService,
    ClientSyncService,
    JobSyncService,
    ApplicationSyncService,
    CandidateMapper,
    CandidateExperienceMapper,
    CandidateEducationMapper,
    CandidateLanguageMapper,
    ClientMapper,
    ClientContactMapper,
    JobMapper,
    JobApplicationMapper,
    ApplicationStageMapper,
    InterviewMapper,
    OfferMapper,
  ],
  exports: [MigrationService, MigrationReadOnlyGuard],
})
export class MigrationModule {}
