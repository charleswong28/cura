import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { InvitationModel } from "../common/graphql/models/invitation.model";
import { UserRole } from "../common/graphql";
import { CurrentUser } from "../auth";
import type { AuthUser } from "../auth";
import { Roles } from "../auth/roles.decorator";
import { InvitationService } from "./invitation.service";
import { InviteUserInput } from "./dto/invite-user.input";
import { ActivityLogService } from "../activity/activity.service";
import { UserService } from "../user/user.service";

@Resolver(() => InvitationModel)
export class InvitationResolver {
  constructor(
    @Inject(InvitationService)
    private readonly invitationService: InvitationService,
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService,
    @Inject(UserService) private readonly userService: UserService
  ) {}

  @Roles(UserRole.ADMIN)
  @Mutation(() => InvitationModel, { description: "Invite a user to the organization" })
  async inviteUser(
    @CurrentUser() authUser: AuthUser,
    @Args("input", { type: () => InviteUserInput }) input: InviteUserInput
  ) {
    const invitation = await this.invitationService.invite(
      authUser.tenantId,
      input.email,
      input.role
    );
    const actor = await this.userService.findByClerkUserId(authUser.clerkUserId, authUser.tenantId);
    await this.activityLogService.log({
      tenantId: authUser.tenantId,
      userId: actor.id,
      action: "USER_INVITED",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: { email: input.email, role: input.role },
    });
    return invitation;
  }

  @Roles(UserRole.ADMIN)
  @Query(() => [InvitationModel], { description: "List pending invitations" })
  async pendingInvitations(@CurrentUser() authUser: AuthUser) {
    return this.invitationService.listPending(authUser.tenantId);
  }

  @Roles(UserRole.ADMIN)
  @Mutation(() => InvitationModel, { description: "Revoke a pending invitation" })
  async revokeInvitation(
    @CurrentUser() authUser: AuthUser,
    @Args("invitationId", { type: () => String }) invitationId: string
  ) {
    const invitation = await this.invitationService.revoke(authUser.tenantId, invitationId);
    const actor = await this.userService.findByClerkUserId(authUser.clerkUserId, authUser.tenantId);
    await this.activityLogService.log({
      tenantId: authUser.tenantId,
      userId: actor.id,
      action: "USER_INVITATION_REVOKED",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: { email: invitation.emailAddress },
    });
    return invitation;
  }
}
