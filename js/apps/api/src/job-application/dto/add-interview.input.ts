import { InputType, Field, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

@InputType()
export class AddInterviewInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  round!: number;

  @Field(() => Date)
  scheduledAt!: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  interviewerUserId?: string;
}

@InputType()
export class CompleteInterviewInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
