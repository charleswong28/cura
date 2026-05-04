import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantService } from "./tenant.service";
import { TenantResolver } from "./tenant.resolver";

@Module({
  imports: [PrismaModule],
  providers: [TenantService, TenantResolver],
  exports: [TenantService],
})
export class TenantModule {}
