import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class TenantModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Date)
  createdAt!: Date;
}
