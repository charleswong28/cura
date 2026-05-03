import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { RoleModel } from "../common/graphql/models/role.model";
import { CurrentUser, RequirePermission } from "../auth";
import type { RequestUser } from "../auth";
import { RoleService } from "./role.service";
import { CreateRoleInput } from "./dto/create-role.input";
import { UpdateRoleInput } from "./dto/update-role.input";

@Resolver(() => RoleModel)
export class RoleResolver {
  constructor(@Inject(RoleService) private readonly roleService: RoleService) {}

  @Query(() => [RoleModel], { description: "All roles visible to this tenant (built-ins + custom)" })
  async roles(@CurrentUser() user: RequestUser) {
    return this.roleService.findAll(user.tenantId);
  }

  @Query(() => RoleModel, { description: "Single role by ID" })
  async role(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: RequestUser
  ) {
    return this.roleService.findById(id, user.tenantId);
  }

  @Mutation(() => RoleModel, { description: "Create a tenant-scoped custom role" })
  @RequirePermission("settings:manage_tenant")
  async createRole(
    @CurrentUser() user: RequestUser,
    @Args("input") input: CreateRoleInput
  ) {
    return this.roleService.create(user.tenantId, input);
  }

  @Mutation(() => RoleModel, { description: "Update a custom role (built-ins are read-only)" })
  @RequirePermission("settings:manage_tenant")
  async updateRole(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: RequestUser,
    @Args("input") input: UpdateRoleInput
  ) {
    return this.roleService.update(id, user.tenantId, input);
  }

  @Mutation(() => RoleModel, { description: "Delete a custom role (built-ins cannot be deleted)" })
  @RequirePermission("settings:manage_tenant")
  async deleteRole(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: RequestUser
  ) {
    return this.roleService.delete(id, user.tenantId);
  }
}
