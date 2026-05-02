import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UserModel } from "../common/graphql";
import { CurrentUser } from "../auth";
import type { RequestUser } from "../auth";
import { UserService } from "./user.service";
import { UpdateProfileInput } from "./dto/update-profile.input";
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
}
