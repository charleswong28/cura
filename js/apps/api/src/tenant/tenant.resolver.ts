import { Inject } from "@nestjs/common";
import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { TenantModel } from "../common/graphql";
import { CurrentUser } from "../auth";
import type { RequestUser } from "../auth";
import { TenantService } from "./tenant.service";
import { CreateTenantInput } from "./dto/create-tenant.input";

@Resolver(() => TenantModel)
export class TenantResolver {
  constructor(@Inject(TenantService) private readonly tenantService: TenantService) {}

  @Mutation(() => TenantModel, {
    description: "Create a new tenant; the caller becomes its first member",
  })
  async createTenant(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateTenantInput }) input: CreateTenantInput
  ) {
    return this.tenantService.create(user.userId, input);
  }
}
