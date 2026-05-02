import { Module } from "@nestjs/common";
import { ClientService } from "./client.service";
import { ClientContactService } from "./client-contact.service";
import { ClientResolver } from "./client.resolver";

@Module({
  providers: [ClientService, ClientContactService, ClientResolver],
  exports: [ClientService, ClientContactService],
})
export class ClientModule {}
