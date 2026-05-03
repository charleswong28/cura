import { InputType, Field } from "@nestjs/graphql";
import { IsEnum } from "class-validator";
import { TeamRole } from "../../common/graphql/enums";

@InputType()
export class UpdateTeamMemberInput {
  @Field(() => TeamRole)
  @IsEnum(TeamRole)
  role!: TeamRole;
}
