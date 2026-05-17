import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { CandidateModel } from "../common/graphql/models/candidate.model";
import { CandidateConnection } from "../common/graphql/models/candidate-connection.model";
import { CurrentUser, RequirePermission, type RequestUser } from "../auth";
import { CandidateService } from "./candidate.service";
import { CreateCandidateInput } from "./dto/create-candidate.input";
import { UpdateCandidateInput } from "./dto/update-candidate.input";
import { CandidateFilterInput } from "./dto/candidate-filter.input";
import { CandidateSortField, SortOrder } from "./dto/candidate-sort";

@Resolver(() => CandidateModel)
export class CandidateResolver {
  constructor(@Inject(CandidateService) private readonly candidateService: CandidateService) {}

  @Query(() => CandidateConnection, { description: "List candidates visible to the current user" })
  async candidates(
    @CurrentUser() user: RequestUser,
    @Args("first", { type: () => Int, nullable: true }) first?: number,
    @Args("after", { type: () => String, nullable: true }) after?: string,
    @Args("last", { type: () => Int, nullable: true }) last?: number,
    @Args("before", { type: () => String, nullable: true }) before?: string,
    @Args("filter", { type: () => CandidateFilterInput, nullable: true })
    filter?: CandidateFilterInput,
    @Args("sortBy", { type: () => CandidateSortField, nullable: true }) sortBy?: CandidateSortField,
    @Args("sortOrder", { type: () => SortOrder, nullable: true }) sortOrder?: SortOrder
  ) {
    return this.candidateService.findAll(user, {
      first,
      after,
      last,
      before,
      filter,
      sortBy,
      sortOrder,
    });
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
