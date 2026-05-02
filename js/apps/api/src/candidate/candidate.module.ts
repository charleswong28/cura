import { Module } from "@nestjs/common";
import { CandidateService } from "./candidate.service";
import { CandidateResolver } from "./candidate.resolver";

@Module({
  providers: [CandidateService, CandidateResolver],
  exports: [CandidateService],
})
export class CandidateModule {}
