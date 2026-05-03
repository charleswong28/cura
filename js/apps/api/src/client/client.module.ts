import { Module } from "@nestjs/common";
import { PermissionModule } from "../permissions/permission.module";
import { ClientService } from "./client.service";
import { ClientContactService } from "./client-contact.service";
import { ClientResolver } from "./client.resolver";

@Module({
  imports: [PermissionModule],
  providers: [ClientService, ClientContactService, ClientResolver],
  exports: [ClientService, ClientContactService],
})
export class ClientModule {}
