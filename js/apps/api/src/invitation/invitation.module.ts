import { Module } from "@nestjs/common";
import { InvitationService } from "./invitation.service";
import { InvitationResolver } from "./invitation.resolver";
import { UserModule } from "../user/user.module";

@Module({
  imports: [UserModule],
  providers: [InvitationService, InvitationResolver],
})
export class InvitationModule {}
