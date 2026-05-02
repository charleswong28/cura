import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { RedisService } from "./redis.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, RedisService, MfaService],
  exports: [AuthService, RedisService],
})
export class AuthModule {}
