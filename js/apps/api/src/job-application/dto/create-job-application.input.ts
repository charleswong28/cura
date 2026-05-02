import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class CreateJobApplicationInput {
  @Field(() => String)
  @IsString()
  candidateId!: string;

  @Field(() => String)
  @IsString()
  jobId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  source?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
