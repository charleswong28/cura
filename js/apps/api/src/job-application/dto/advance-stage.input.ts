import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { ApplicationStageType } from "../../common/graphql/enums";

@InputType()
export class AdvanceStageInput {
  @Field(() => ApplicationStageType)
  stage!: ApplicationStageType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
