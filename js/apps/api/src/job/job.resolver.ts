import { Inject } from "@nestjs/common";
import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from "@nestjs/graphql";
import { JobModel } from "../common/graphql/models/job.model";
import { JobConnection } from "../common/graphql/models/job-connection.model";
import { ClientModel } from "../common/graphql/models/client.model";
import { UserModel } from "../common/graphql/models/user.model";
import { CurrentUser, RequirePermission, type RequestUser } from "../auth";
import { JobService } from "./job.service";
import { ClientService } from "../client/client.service";
import { DataLoaderService } from "../dataloader/dataloader.service";
import { CreateJobInput } from "./dto/create-job.input";
import { UpdateJobInput } from "./dto/update-job.input";
import { JobFilterInput } from "./dto/job-filter.input";
import { JobSortField } from "./dto/job-sort";
import { SortOrder } from "../candidate/dto/candidate-sort";
import { JobPriority, JobStatus } from "../common/graphql/enums";

@Resolver(() => JobModel)
export class JobResolver {
  constructor(
    @Inject(JobService) private readonly jobService: JobService,
    @Inject(ClientService) private readonly clientService: ClientService,
    @Inject(DataLoaderService) private readonly loaders: DataLoaderService
  ) {}

  @Query(() => JobConnection, { description: "List jobs visible to the current user" })
  async jobs(
    @CurrentUser() user: RequestUser,
    @Args("first", { type: () => Int, nullable: true }) first?: number,
    @Args("after", { type: () => String, nullable: true }) after?: string,
    @Args("last", { type: () => Int, nullable: true }) last?: number,
    @Args("before", { type: () => String, nullable: true }) before?: string,
    @Args("filter", { type: () => JobFilterInput, nullable: true }) filter?: JobFilterInput,
    @Args("sortBy", { type: () => JobSortField, nullable: true }) sortBy?: JobSortField,
    @Args("sortOrder", { type: () => SortOrder, nullable: true }) sortOrder?: SortOrder
  ) {
    return this.jobService.findAll(user, {
      first,
      after,
      last,
      before,
      filter,
      sortBy,
      sortOrder,
    });
  }

  @Query(() => JobModel, { description: "Get a job by ID" })
  async job(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.jobService.findById(id, user);
  }

  @Mutation(() => JobModel, { description: "Create a new job" })
  @RequirePermission("job:create")
  async createJob(
    @CurrentUser() user: RequestUser,
    @Args("input", { type: () => CreateJobInput }) input: CreateJobInput
  ) {
    return this.jobService.create(user, input);
  }

  @Mutation(() => JobModel, { description: "Update a job" })
  async updateJob(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("input", { type: () => UpdateJobInput }) input: UpdateJobInput
  ) {
    return this.jobService.update(id, user, input);
  }

  @Mutation(() => JobModel, { description: "Soft-delete (archive) a job" })
  @RequirePermission("job:delete")
  async deleteJob(@CurrentUser() user: RequestUser, @Args("id", { type: () => ID }) id: string) {
    return this.jobService.softDelete(id, user);
  }

  @Mutation(() => JobModel, {
    description: "Change a job's status (validates allowed transitions)",
  })
  async updateJobStatus(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("status", { type: () => JobStatus }) status: JobStatus
  ) {
    return this.jobService.changeStatus(id, user, status);
  }

  @Mutation(() => JobModel, { description: "Change a job's priority" })
  async updateJobPriority(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("priority", { type: () => JobPriority }) priority: JobPriority
  ) {
    return this.jobService.changePriority(id, user, priority);
  }

  @Mutation(() => JobModel, {
    description: "Assign or unassign the recruiter working a job (null = unassign)",
  })
  async assignJob(
    @CurrentUser() user: RequestUser,
    @Args("id", { type: () => ID }) id: string,
    @Args("assignedToId", { type: () => String, nullable: true }) assignedToId?: string | null
  ) {
    return this.jobService.assign(id, user, assignedToId ?? null);
  }

  @ResolveField(() => ClientModel)
  async client(@Parent() job: JobModel, @CurrentUser() user: RequestUser) {
    return this.clientService.findById(job.clientId, user);
  }

  @ResolveField(() => UserModel, { nullable: true })
  async assignedTo(@Parent() job: JobModel) {
    if (!job.assignedToId) return null;
    return this.loaders.userById.load(job.assignedToId);
  }

  @ResolveField(() => UserModel, { nullable: true })
  async ownerUser(@Parent() job: JobModel) {
    if (!job.ownerUserId) return null;
    return this.loaders.userById.load(job.ownerUserId);
  }
}
