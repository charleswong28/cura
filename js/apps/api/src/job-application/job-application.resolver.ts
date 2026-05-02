import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from "@nestjs/graphql";
import {
  JobApplicationModel,
  ApplicationStageModel,
  InterviewModel,
  OfferModel,
} from "../common/graphql/models/job-application.model";
import { CurrentUser, type RequestUser } from "../auth";
import { JobApplicationService } from "./job-application.service";
import { CreateJobApplicationInput } from "./dto/create-job-application.input";
import { AdvanceStageInput } from "./dto/advance-stage.input";
import { AddInterviewInput, CompleteInterviewInput } from "./dto/add-interview.input";
import { AddOfferInput } from "./dto/add-offer.input";

@Resolver(() => JobApplicationModel)
export class JobApplicationResolver {
  constructor(@Inject(JobApplicationService) private readonly appService: JobApplicationService) {}

  @Query(() => [JobApplicationModel], { description: "List applications for a job" })
  async jobApplications(
    @CurrentUser() user: RequestUser,
    @Args("jobId", { type: () => ID }) jobId: string
  ) {
    return this.appService.findByJob(jobId, user.tenantId);
  }

  @Query(() => JobApplicationModel, { description: "Get a job application by ID" })
  async jobApplication(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string
  ) {
    return this.appService.findById(id, user.tenantId);
  }

  @Mutation(() => JobApplicationModel, { description: "Create a new job application" })
  async createJobApplication(
    @CurrentUser() user: RequestUser,
    @Args("input") input: CreateJobApplicationInput
  ) {
    return this.appService.create(user.tenantId, user.userId, input);
  }

  @Mutation(() => JobApplicationModel, {
    description: "Advance application to a new pipeline stage",
  })
  async advanceApplicationStage(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: AdvanceStageInput
  ) {
    return this.appService.advanceStage(id, user.tenantId, user.userId, input);
  }

  @Mutation(() => InterviewModel, { description: "Schedule an interview for this application" })
  async addInterview(
    @CurrentUser() user: RequestUser,
    @Args("applicationId", { type: () => ID }) applicationId: string,
    @Args("input") input: AddInterviewInput
  ) {
    return this.appService.addInterview(applicationId, user.tenantId, user.userId, input);
  }

  @Mutation(() => InterviewModel, { description: "Record interview outcome" })
  async completeInterview(
    @CurrentUser() user: RequestUser,
    @Args("interviewId", { type: () => ID }) interviewId: string,
    @Args("input") input: CompleteInterviewInput
  ) {
    return this.appService.completeInterview(interviewId, user.tenantId, input);
  }

  @Mutation(() => OfferModel, { description: "Add an offer to an application" })
  async addOffer(
    @CurrentUser() user: RequestUser,
    @Args("applicationId", { type: () => ID }) applicationId: string,
    @Args("input") input: AddOfferInput
  ) {
    return this.appService.addOffer(applicationId, user.tenantId, user.userId, input);
  }

  @ResolveField(() => [ApplicationStageModel])
  async stages(@Parent() app: JobApplicationModel, @CurrentUser() user: RequestUser) {
    return this.appService.findStages(app.id, user.tenantId);
  }

  @ResolveField(() => [InterviewModel])
  async interviews(@Parent() app: JobApplicationModel, @CurrentUser() user: RequestUser) {
    return this.appService.findInterviews(app.id, user.tenantId);
  }

  @ResolveField(() => [OfferModel])
  async offers(@Parent() app: JobApplicationModel, @CurrentUser() user: RequestUser) {
    return this.appService.findOffers(app.id, user.tenantId);
  }
}
