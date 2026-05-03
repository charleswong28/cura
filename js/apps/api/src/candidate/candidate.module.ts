import { Module } from "@nestjs/common";
import { PermissionModule } from "../permissions/permission.module";
import { CandidateService } from "./candidate.service";
import { CandidateResolver } from "./candidate.resolver";

@Module({
  imports: [PermissionModule],
  providers: [CandidateService, CandidateResolver],
  exports: [CandidateService],
})
export class CandidateModule {}
