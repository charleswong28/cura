import { InputType, Field } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { JobPriority, JobStatus } from "../../common/graphql/enums";

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

@InputType()
export class CreateJobInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "clientId is required" })
  clientId!: string;

  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Title is required" })
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true, description: "Job requirements (rich-text content)" })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  requirements?: string;

  @Field(() => JobStatus, { nullable: true })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @Field(() => JobPriority, { nullable: true })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  ownerUserId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  assignedToId?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  openDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  closeDate?: Date;
}
