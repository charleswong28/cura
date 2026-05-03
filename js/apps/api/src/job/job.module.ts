import { Module } from "@nestjs/common";
import { PermissionModule } from "../permissions/permission.module";
import { ClientModule } from "../client/client.module";
import { JobService } from "./job.service";
import { JobResolver } from "./job.resolver";

@Module({
  imports: [ClientModule, PermissionModule],
  providers: [JobService, JobResolver],
  exports: [JobService],
})
export class JobModule {}
