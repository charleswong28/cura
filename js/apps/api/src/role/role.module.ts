import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RoleService } from "./role.service";
import { RoleResolver } from "./role.resolver";

@Module({
  imports: [AuthModule],
  providers: [RoleService, RoleResolver],
  exports: [RoleService],
})
export class RoleModule {}
