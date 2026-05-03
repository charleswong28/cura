import { ObjectType, Field, ID } from "@nestjs/graphql";
import { TeamRole } from "../enums";

@ObjectType()
export class TeamMemberModel {
  @Field(() => ID)
  teamId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => TeamRole)
  role!: TeamRole;

  @Field(() => Date)
  joinedAt!: Date;
}
