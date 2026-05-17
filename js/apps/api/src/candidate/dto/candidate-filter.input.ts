import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { CandidateStatus } from "../../common/graphql/enums";

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

@InputType()
export class CandidateFilterInput {
  @Field(() => String, {
    nullable: true,
    description: "Free-text match on name, email, company, title",
  })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field(() => CandidateStatus, { nullable: true })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

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
}
