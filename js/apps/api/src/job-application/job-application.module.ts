import { Module } from "@nestjs/common";
import { JobApplicationService } from "./job-application.service";
import { JobApplicationResolver } from "./job-application.resolver";
import { JobModule } from "../job/job.module";

@Module({
  imports: [JobModule],
  providers: [JobApplicationService, JobApplicationResolver],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}
