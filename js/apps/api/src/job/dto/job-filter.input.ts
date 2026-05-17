import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { JobPriority, JobStatus } from "../../common/graphql/enums";

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

@InputType()
export class JobFilterInput {
  @Field(() => String, {
    nullable: true,
    description: "Free-text match on title and description",
  })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field(() => JobStatus, { nullable: true })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @Field(() => JobPriority, { nullable: true })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @Field(() => String, { nullable: true, description: "Limit results to a single client" })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  clientId?: string;

  @Field(() => String, { nullable: true, description: "Limit to jobs assigned to this user" })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  assignedToId?: string;
}
