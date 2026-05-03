import { InputType, Field, ID } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TeamKind } from "../../common/graphql/enums";

@InputType()
export class UpdateTeamInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @Field(() => TeamKind, { nullable: true })
  @IsOptional()
  @IsEnum(TeamKind)
  kind?: TeamKind;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;
}
