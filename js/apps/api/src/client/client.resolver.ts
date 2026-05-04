import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from "@nestjs/graphql";
import { ClientModel } from "../common/graphql/models/client.model";
import { ClientContactModel } from "../common/graphql/models/client-contact.model";
import { JobModel } from "../common/graphql/models/job.model";
import { CurrentUser, type RequestUser } from "../auth";
import { ClientService } from "./client.service";
import { ClientContactService } from "./client-contact.service";
import { CreateClientInput } from "./dto/create-client.input";
import { UpdateClientInput } from "./dto/update-client.input";
import { CreateClientContactInput } from "./dto/create-client-contact.input";

@Resolver(() => ClientModel)
export class ClientResolver {
  constructor(
    @Inject(ClientService) private readonly clientService: ClientService,
    @Inject(ClientContactService) private readonly contactService: ClientContactService
  ) {}

  @Query(() => [ClientModel], { description: "List all clients in the tenant" })
  async clients(@CurrentUser() user: RequestUser) {
    return this.clientService.findAll(user.tenantId);
  }

  @Query(() => ClientModel, { description: "Get a client by ID" })
  async client(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.clientService.findById(id, user.tenantId);
  }

  @Mutation(() => ClientModel, { description: "Create a new client" })
  async createClient(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateClientInput }) input: CreateClientInput
  ) {
    return this.clientService.create(user.tenantId, user.userId, input);
  }

  @Mutation(() => ClientModel, { description: "Update a client" })
  async updateClient(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input", { type: () => UpdateClientInput }) input: UpdateClientInput
  ) {
    return this.clientService.update(id, user.tenantId, user.userId, input);
  }

  @Mutation(() => ClientModel, { description: "Soft-delete a client" })
  async deleteClient(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.clientService.softDelete(id, user.tenantId, user.userId);
  }

  @Mutation(() => ClientContactModel, { description: "Add a contact to a client" })
  async createClientContact(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateClientContactInput }) input: CreateClientContactInput
  ) {
    return this.contactService.create(user.tenantId, user.userId, input);
  }

  @Mutation(() => ClientContactModel, { description: "Remove a client contact" })
  async deleteClientContact(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.contactService.softDelete(id, user.tenantId, user.userId);
  }

  @ResolveField(() => [JobModel])
  async jobs(@Parent() client: ClientModel, @CurrentUser() user: RequestUser) {
    return this.clientService.findJobs(client.id, user.tenantId);
  }

  @ResolveField(() => [ClientContactModel])
  async contacts(@Parent() client: ClientModel, @CurrentUser() user: RequestUser) {
    return this.clientService.findContacts(client.id, user.tenantId);
  }
}
