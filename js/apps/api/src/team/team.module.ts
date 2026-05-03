import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TeamService } from "./team.service";
import { TeamResolver } from "./team.resolver";

@Module({
  imports: [AuthModule],
  providers: [TeamService, TeamResolver],
  exports: [TeamService],
})
export class TeamModule {}
