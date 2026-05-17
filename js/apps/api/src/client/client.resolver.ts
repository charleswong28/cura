import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from "@nestjs/graphql";
import { ClientModel } from "../common/graphql/models/client.model";
import { ClientConnection } from "../common/graphql/models/client-connection.model";
import { ClientContactModel } from "../common/graphql/models/client-contact.model";
import { JobModel } from "../common/graphql/models/job.model";
import { CurrentUser, RequirePermission, type RequestUser } from "../auth";
import { ClientService } from "./client.service";
import { ClientContactService } from "./client-contact.service";
import { CreateClientInput } from "./dto/create-client.input";
import { UpdateClientInput } from "./dto/update-client.input";
import { CreateClientContactInput } from "./dto/create-client-contact.input";
import { ClientFilterInput } from "./dto/client-filter.input";
import { ClientSortField } from "./dto/client-sort";
import { SortOrder } from "../candidate/dto/candidate-sort";

@Resolver(() => ClientModel)
export class ClientResolver {
  constructor(
    @Inject(ClientService) private readonly clientService: ClientService,
    @Inject(ClientContactService) private readonly contactService: ClientContactService
  ) {}

  @Query(() => ClientConnection, { description: "List clients visible to the current user" })
  async clients(
    @CurrentUser() user: RequestUser,
    @Args("first", { type: () => Int, nullable: true }) first?: number,
    @Args("after", { type: () => String, nullable: true }) after?: string,
    @Args("last", { type: () => Int, nullable: true }) last?: number,
    @Args("before", { type: () => String, nullable: true }) before?: string,
    @Args("filter", { type: () => ClientFilterInput, nullable: true }) filter?: ClientFilterInput,
    @Args("sortBy", { type: () => ClientSortField, nullable: true }) sortBy?: ClientSortField,
    @Args("sortOrder", { type: () => SortOrder, nullable: true }) sortOrder?: SortOrder
  ) {
    return this.clientService.findAll(user, { first, after, last, before, filter, sortBy, sortOrder });
  }

  @Query(() => ClientModel, { description: "Get a client by ID" })
  async client(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.clientService.findById(id, user);
  }

  @Mutation(() => ClientModel, { description: "Create a new client" })
  @RequirePermission("client:create")
  async createClient(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateClientInput }) input: CreateClientInput
  ) {
    return this.clientService.create(user, input);
  }

  @Mutation(() => ClientModel, { description: "Update a client" })
  async updateClient(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input", { type: () => UpdateClientInput }) input: UpdateClientInput
  ) {
    return this.clientService.update(id, user, input);
  }

  @Mutation(() => ClientModel, { description: "Soft-delete a client and cascade to linked jobs" })
  @RequirePermission("client:delete")
  async deleteClient(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.clientService.softDelete(id, user);
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
