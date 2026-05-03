import { Module } from "@nestjs/common";
import { PermissionModule } from "../permissions/permission.module";
import { JobModule } from "../job/job.module";
import { JobApplicationService } from "./job-application.service";
import { JobApplicationResolver } from "./job-application.resolver";

@Module({
  imports: [JobModule, PermissionModule],
  providers: [JobApplicationService, JobApplicationResolver],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}
