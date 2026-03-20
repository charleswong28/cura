import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UserModel, UserRole } from "../common/graphql";
import { CurrentUser } from "../auth";
import type { AuthUser } from "../auth";
import { UserService } from "./user.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { UpdateRoleInput } from "./dto/update-role.input";
import { Roles } from "../auth/roles.decorator";
import { ActivityLogService } from "../activity/activity.service";

@Resolver(() => UserModel)
export class UserResolver {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService
  ) {}

  @Query(() => UserModel, { description: "Current user's profile" })
  async me(@CurrentUser() authUser: AuthUser) {
    return this.userService.findByClerkUserId(authUser.clerkUserId, authUser.tenantId);
  }

  @Query(() => [UserModel], { description: "All team members in tenant" })
  async users(@CurrentUser() authUser: AuthUser) {
    return this.userService.findAll(authUser.tenantId);
  }

  @Mutation(() => UserModel, { description: "Update own profile" })
  async updateMyProfile(
    @CurrentUser() authUser: AuthUser,
    @Args("input", { type: () => UpdateProfileInput }) input: UpdateProfileInput
  ) {
    const user = await this.userService.updateProfile(
      authUser.clerkUserId,
      authUser.tenantId,
      input
    );
    await this.activityLogService.log({
      tenantId: authUser.tenantId,
      userId: user.id,
      action: "USER_UPDATED_PROFILE",
      entityType: "User",
      entityId: user.id,
      metadata: { fields: Object.keys(input).filter((k) => (input as any)[k] !== undefined) },
    });
    return user;
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => UserModel, { description: "Update a user's role (admin only)" })
  async updateUserRole(
    @CurrentUser() authUser: AuthUser,
    @Args("input", { type: () => UpdateRoleInput }) input: UpdateRoleInput
  ) {
    const user = await this.userService.updateRole(input.userId, authUser.tenantId, input.role);
    const actor = await this.userService.findByClerkUserId(authUser.clerkUserId, authUser.tenantId);
    await this.activityLogService.log({
      tenantId: authUser.tenantId,
      userId: actor.id,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: { newRole: input.role },
    });
    return user;
  }
}
