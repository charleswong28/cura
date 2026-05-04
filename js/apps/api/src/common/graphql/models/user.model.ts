import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String, { nullable: true })
  authIdentityId!: string | null;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => Boolean)
  loginable!: boolean;

  @Field(() => Boolean, { description: "Whether TOTP MFA is enrolled for this user" })
  mfaEnrolled!: boolean;

  @Field(() => Date, { nullable: true, description: "Timestamp of the user's first login" })
  firstLogin!: Date | null;

  @Field(() => Date, {
    nullable: true,
    description: "Timestamp when the user was last deactivated",
  })
  lastInactiveAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
