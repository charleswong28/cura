import { ObjectType, Field, ID } from "@nestjs/graphql";
import { UserRole } from "../enums";

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

  @Field(() => UserRole)
  role!: UserRole;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
