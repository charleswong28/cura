import { ObjectType, Field, ID } from "@nestjs/graphql";
import { JobStatus, JobPriority } from "../enums";

@ObjectType()
export class JobModel {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  clientId!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => JobStatus)
  status!: JobStatus;

  @Field(() => JobPriority)
  priority!: JobPriority;

  @Field(() => String, { nullable: true })
  assignedToId!: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // client: resolved via @ResolveField in JobResolver using DataLoader
  // assignedTo: resolved via @ResolveField in JobResolver using DataLoader
}
