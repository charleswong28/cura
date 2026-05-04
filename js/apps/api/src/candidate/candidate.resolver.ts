import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CandidateModel } from "../common/graphql/models/candidate.model";
import { CurrentUser, RequirePermission, type RequestUser } from "../auth";
import { CandidateService } from "./candidate.service";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";

@Resolver(() => CandidateModel)
export class CandidateResolver {
  constructor(@Inject(CandidateService) private readonly candidateService: CandidateService) {}

  @Query(() => [CandidateModel], { description: "List candidates visible to the current user" })
  async candidates(@CurrentUser() user: RequestUser) {
    return this.candidateService.findAll(user);
  }

  @Query(() => CandidateModel, { description: "Get a candidate by ID" })
  async candidate(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.candidateService.findById(id, user);
  }

  @Mutation(() => CandidateModel, { description: "Create a new candidate" })
  @RequirePermission("candidate:create")
  async createCandidate(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateCandidateInput }) input: CreateCandidateInput
  ) {
    return this.candidateService.create(user, input);
  }

  @Mutation(() => CandidateModel, { description: "Update a candidate" })
  async updateCandidate(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input", { type: () => UpdateCandidateInput }) input: UpdateCandidateInput
  ) {
    return this.candidateService.update(id, user, input);
  }

  @Mutation(() => CandidateModel, { description: "Soft-delete a candidate" })
  @RequirePermission("candidate:delete")
  async deleteCandidate(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.candidateService.softDelete(id, user);
  }
}
