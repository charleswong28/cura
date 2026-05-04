import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { TeamKind } from "../enums";

@ObjectType()
export class TeamModel {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  shortId!: number;

  @Field(() => String)
  tenantId!: string;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => TeamKind)
  kind!: TeamKind;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;
}
