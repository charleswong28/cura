import { InputType, Field } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";
import { CandidateStatus } from "../../common/graphql/enums";

// Trim and convert blank strings to undefined so @IsOptional() skips further validation.
const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

// Trim, lowercase, and convert blank strings to undefined.
const trimLowerOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() || undefined : value;

@InputType()
export class CreateCandidateInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  @MaxLength(100)
  firstName!: string;

  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  @MaxLength(100)
  lastName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimLowerOptional)
  @IsEmail({}, { message: "email must be a valid email address" })
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @Matches(/^\+?[1-9][\d\s\-(). ]{5,28}$/, {
    message: "phone must be a valid phone number (e.g. +1 555-123-4567)",
  })
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  currentCompany?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  currentTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  location?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsUrl({ protocols: ["https"], require_protocol: true })
  linkedinUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsUrl({ protocols: ["https"], require_protocol: true })
  githubUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  notes?: string;

  @Field(() => CandidateStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  ownerUserId?: string;
}
