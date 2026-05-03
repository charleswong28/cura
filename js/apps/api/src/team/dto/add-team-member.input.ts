import { InputType, Field, ID } from "@nestjs/graphql";
import { IsEnum, IsString } from "class-validator";
import { TeamRole } from "../../common/graphql/enums";

@InputType()
export class AddTeamMemberInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => TeamRole)
  @IsEnum(TeamRole)
  role!: TeamRole;
}
