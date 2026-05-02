import { InputType, Field, PartialType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { CreateCandidateInput } from "./create-candidate.input";
import { CandidateStatus } from "../../common/graphql/enums";

@InputType()
export class UpdateCandidateInput extends PartialType(CreateCandidateInput) {
  @Field(() => CandidateStatus, { nullable: true })
  @IsOptional()
  status?: CandidateStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  updatedById?: string;
}
