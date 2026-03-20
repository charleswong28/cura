import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class InvitationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  emailAddress!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  createdAt!: Date;
}
