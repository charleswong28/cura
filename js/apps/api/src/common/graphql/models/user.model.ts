import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field({ nullable: true })
  authIdentityId!: string | null;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  loginable!: boolean;

  @Field({ description: "Whether TOTP MFA is enrolled for this user" })
  mfaEnrolled!: boolean;

  @Field(() => Date, { nullable: true, description: "Timestamp of the user's first login" })
  firstLogin!: Date | null;

  @Field(() => Date, { nullable: true, description: "Timestamp when the user was last deactivated" })
  lastInactiveAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
