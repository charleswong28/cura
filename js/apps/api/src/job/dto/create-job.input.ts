import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { JobPriority, JobStatus } from "../../common/graphql/enums";

@InputType()
export class CreateJobInput {
  @Field(() => String)
  @IsString()
  clientId!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => JobStatus, { nullable: true })
  @IsOptional()
  status?: JobStatus;

  @Field(() => JobPriority, { nullable: true })
  @IsOptional()
  priority?: JobPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  openDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  closeDate?: Date;
}
