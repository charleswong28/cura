import { Module } from "@nestjs/common";
import { JobService } from "./job.service";
import { JobResolver } from "./job.resolver";
import { ClientModule } from "../client/client.module";

@Module({
  imports: [ClientModule],
  providers: [JobService, JobResolver],
  exports: [JobService],
})
export class JobModule {}
