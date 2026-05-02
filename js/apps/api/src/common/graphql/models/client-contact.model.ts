import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class ClientContactModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  clientId!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => Boolean)
  isPrimary!: boolean;

  @Field(() => String, { nullable: true })
  ownerUserId!: string | null;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
