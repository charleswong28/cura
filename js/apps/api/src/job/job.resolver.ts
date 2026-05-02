import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from "@nestjs/graphql";
import { JobModel } from "../common/graphql/models/job.model";
import { ClientModel } from "../common/graphql/models/client.model";
import { CurrentUser, type RequestUser } from "../auth";
import { JobService } from "./job.service";
import { ClientService } from "../client/client.service";
import { CreateJobInput } from "./dto/create-job.input";
import { UpdateJobInput } from "./dto/update-job.input";

@Resolver(() => JobModel)
export class JobResolver {
  constructor(
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(ClientService) private readonly clientService: ClientService
  ) {}

  @Query(() => [JobModel], { description: "List all jobs in the tenant" })
  async jobs(@CurrentUser() user: RequestUser) {
    return this.jobService.findAll(user.tenantId);
  }

  @Query(() => JobModel, { description: "Get a job by ID" })
  async job(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.jobService.findById(id, user.tenantId);
  }

  @Mutation(() => JobModel, { description: "Create a new job" })
  async createJob(@CurrentUser() user: RequestUser, @Args("input") input: CreateJobInput) {
    return this.jobService.create(user.tenantId, user.userId, input);
  }

  @Mutation(() => JobModel, { description: "Update a job" })
  async updateJob(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateJobInput
  ) {
    return this.jobService.update(id, user.tenantId, user.userId, input);
  }

  @Mutation(() => JobModel, { description: "Soft-delete a job" })
  async deleteJob(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.jobService.softDelete(id, user.tenantId, user.userId);
  }

  @ResolveField(() => ClientModel)
  async client(@Parent() job: JobModel, @CurrentUser() user: RequestUser) {
    return this.clientService.findById(job.clientId, user.tenantId);
  }
}
