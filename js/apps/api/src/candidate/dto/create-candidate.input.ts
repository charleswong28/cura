import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { CandidateStatus } from "../../common/graphql/enums";

@InputType()
export class CreateCandidateInput {
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentCompany?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  linkedinUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  githubUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => CandidateStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
