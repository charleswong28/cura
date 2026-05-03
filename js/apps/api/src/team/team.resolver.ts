import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from "@nestjs/graphql";
import { TeamModel } from "../common/graphql/models/team.model";
import { TeamMemberModel } from "../common/graphql/models/team-member.model";
import { CurrentUser, RequirePermission, type RequestUser } from "../auth";
import { TeamService } from "./team.service";
import { CreateTeamInput } from "./dto/create-team.input";
import { UpdateTeamInput } from "./dto/update-team.input";
import { AddTeamMemberInput } from "./dto/add-team-member.input";
import { UpdateTeamMemberInput } from "./dto/update-team-member.input";

@Resolver(() => TeamModel)
export class TeamResolver {
  constructor(@Inject(TeamService) private readonly teamService: TeamService) {}

  @Query(() => [TeamModel], { description: "List all teams in the tenant" })
  async teams(@CurrentUser() user: RequestUser) {
    return this.teamService.findAll(user.tenantId);
  }

  @Query(() => TeamModel, { description: "Get a team by ID" })
  async team(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.teamService.findById(id, user.tenantId);
  }

  @Mutation(() => TeamModel, { description: "Create a new team" })
  @RequirePermission("team:manage")
  async createTeam(
    @CurrentUser() user: RequestUser,
    @Args("input") input: CreateTeamInput
  ) {
    return this.teamService.create(user.tenantId, input);
  }

  @Mutation(() => TeamModel, { description: "Update a team" })
  @RequirePermission("team:manage")
  async updateTeam(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateTeamInput
  ) {
    return this.teamService.update(id, user.tenantId, input);
  }

  @Mutation(() => TeamModel, { description: "Soft-delete a team" })
  @RequirePermission("team:manage")
  async deleteTeam(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.teamService.softDelete(id, user.tenantId);
  }

  @Mutation(() => TeamMemberModel, { description: "Add a member to a team" })
  @RequirePermission("team:invite_member")
  async addTeamMember(
    @CurrentUser() user: RequestUser,
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("input") input: AddTeamMemberInput
  ) {
    return this.teamService.addMember(teamId, user.tenantId, input);
  }

  @Mutation(() => TeamMemberModel, { description: "Remove a member from a team" })
  @RequirePermission("team:remove_member")
  async removeTeamMember(
    @CurrentUser() user: RequestUser,
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("userId", { type: () => ID }) userId: string
  ) {
    return this.teamService.removeMember(teamId, userId, user.tenantId);
  }

  @Mutation(() => TeamMemberModel, { description: "Update a team member's role" })
  @RequirePermission("team:manage")
  async updateTeamMemberRole(
    @CurrentUser() user: RequestUser,
    @Args("teamId", { type: () => ID }) teamId: string,
    @Args("userId", { type: () => ID }) userId: string,
    @Args("input") input: UpdateTeamMemberInput
  ) {
    return this.teamService.updateMemberRole(teamId, userId, user.tenantId, input);
  }

  @ResolveField(() => [TeamMemberModel], { description: "Members of this team" })
  async members(@Parent() team: TeamModel, @CurrentUser() user: RequestUser) {
    return this.teamService.findMembers(team.id, user.tenantId);
  }

  @ResolveField(() => [TeamModel], { nullable: true, description: "Direct child teams" })
  async children(@Parent() team: TeamModel, @CurrentUser() user: RequestUser) {
    const all = await this.teamService.findAll(user.tenantId);
    return all.filter((t) => t.parentId === team.id);
  }

  @ResolveField(() => TeamModel, { nullable: true, description: "Parent team" })
  async parent(@Parent() team: TeamModel, @CurrentUser() user: RequestUser) {
    if (!team.parentId) return null;
    return this.teamService.findById(team.parentId, user.tenantId);
  }
}
