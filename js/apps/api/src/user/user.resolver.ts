import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UserModel } from "../common/graphql";
import { CurrentUser, RequirePermission } from "../auth";
import type { RequestUser } from "../auth";
import { UserService } from "./user.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { InviteUserInput } from "./dto/invite-user.input";
import { AssignRoleInput } from "./dto/assign-role.input";
import { RemoveRoleInput } from "./dto/remove-role.input";
import { ActivityLogService } from "../activity/activity.service";

@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(ActivityLogService) private readonly activityLogService: ActivityLogService
  ) {}

  @Query(() => UserModel, { description: "Current user's profile" })
  async me(@CurrentUser() user: RequestUser) {
    return this.userService.findById(user.userId, user.tenantId);
  }

  @Query(() => [UserModel], { description: "All team members in this tenant" })
  async users(@CurrentUser() user: RequestUser) {
    return this.userService.findAll(user.tenantId);
  }

  @Mutation(() => UserModel, { description: "Update own profile" })
  async updateMyProfile(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => UpdateProfileInput }) input: UpdateProfileInput
  ) {
    const updated = await this.userService.updateProfile(user.userId, user.tenantId, input);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_UPDATED_PROFILE",
      entityType: "User",
      entityId: user.userId,
      metadata: { fields: Object.keys(input).filter((k) => (input as any)[k] !== undefined) },
    });
    return updated;
  }

  @Mutation(() => UserModel, { description: "Invite a new user to the tenant" })
  @RequirePermission("user:invite")
  async inviteUser(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => InviteUserInput }) input: InviteUserInput
  ) {
    const invited = await this.userService.invite(user.tenantId, user.userId, input);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_INVITED",
      entityType: "User",
      entityId: invited.id,
      metadata: { email: input.email, roleNames: input.roleNames },
    });
    return invited;
  }

  @Mutation(() => UserModel, { description: "Assign a role to a user" })
  @RequirePermission("user:manage_roles")
  async assignRole(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => AssignRoleInput }) input: AssignRoleInput
  ) {
    const updated = await this.userService.assignRole(user.tenantId, user.userId, input);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: input.userId,
      metadata: { roleId: input.roleId, change: "assigned" },
    });
    return updated;
  }

  @Mutation(() => UserModel, { description: "Remove a role from a user" })
  @RequirePermission("user:manage_roles")
  async removeRole(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => RemoveRoleInput }) input: RemoveRoleInput
  ) {
    const updated = await this.userService.removeRole(user.tenantId, input);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: input.userId,
      metadata: { roleId: input.roleId, change: "removed" },
    });
    return updated;
  }

  @Mutation(() => UserModel, { description: "Deactivate a user — revokes all sessions" })
  @RequirePermission("user:deactivate")
  async deactivateUser(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user: RequestUser
  ) {
    const deactivated = await this.userService.deactivate(userId, user.userId, user.tenantId);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_DEACTIVATED",
      entityType: "User",
      entityId: userId,
    });
    return deactivated;
  }

  @Mutation(() => UserModel, { description: "Reactivate a previously deactivated user" })
  @RequirePermission("user:deactivate")
  async reactivateUser(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user: RequestUser
  ) {
    const reactivated = await this.userService.reactivate(userId, user.tenantId);
    await this.activityLogService.log({
      tenantId: user.tenantId,
      userId: user.userId,
      action: "USER_REACTIVATED",
      entityType: "User",
      entityId: userId,
    });
    return reactivated;
  }
}
