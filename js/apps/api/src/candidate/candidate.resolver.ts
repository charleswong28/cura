import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CandidateModel } from "../common/graphql/models/candidate.model";
import { CurrentUser, type RequestUser } from "../auth";
import { CandidateService } from "./candidate.service";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";

@Resolver(() => CandidateModel)
export class CandidateResolver {
  constructor(@Inject(CandidateService) private readonly candidateService: CandidateService) {}

  @Query(() => [CandidateModel], { description: "List all candidates in the tenant" })
  async candidates(@CurrentUser() user: RequestUser) {
    return this.candidateService.findAll(user.tenantId);
  }

  @Query(() => CandidateModel, { description: "Get a candidate by ID" })
  async candidate(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.candidateService.findById(id, user.tenantId);
  }

  @Mutation(() => CandidateModel, { description: "Create a new candidate" })
  async createCandidate(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateCandidateInput }) input: CreateCandidateInput
  ) {
    return this.candidateService.create(
      user.tenantId,
      user.userId,
      input,
      user.teams.map((t) => t.id)
    );
  }

  @Mutation(() => CandidateModel, { description: "Update a candidate" })
  async updateCandidate(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input", { type: () => UpdateCandidateInput }) input: UpdateCandidateInput
  ) {
    return this.candidateService.update(id, user.tenantId, user.userId, input);
  }

  @Mutation(() => CandidateModel, { description: "Soft-delete a candidate" })
  async deleteCandidate(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.candidateService.softDelete(id, user.tenantId, user.userId);
  }
}
