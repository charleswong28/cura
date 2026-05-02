import { ObjectType, Field, ID } from "@nestjs/graphql";
import { JobStatus, JobPriority } from "../enums";

@ObjectType()
export class JobModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  clientId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => JobStatus)
  status!: JobStatus;

  @Field(() => JobPriority)
  priority!: JobPriority;

  @Field(() => String, { nullable: true })
  ownerUserId!: string | null;

  @Field(() => String, { nullable: true })
  assignedToId!: string | null;

  @Field(() => Date, { nullable: true })
  openDate!: Date | null;

  @Field(() => Date, { nullable: true })
  closeDate!: Date | null;

  @Field(() => Number)
  applicationCount!: number;

  @Field(() => Number)
  interviewCount!: number;

  @Field(() => Number)
  offerCount!: number;

  @Field(() => Number)
  placementCount!: number;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  // client, applications: resolved via @ResolveField in JobResolver using DataLoader
}
