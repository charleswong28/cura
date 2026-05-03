import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  loginable!: boolean;

  @Field(() => Date, { nullable: true, description: "Timestamp of the user's first login" })
  firstLogin!: Date | null;

  @Field(() => Date, { nullable: true, description: "Timestamp when the user was last deactivated" })
  lastInactiveAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
