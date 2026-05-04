import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class TenantModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => Date)
  createdAt!: Date;
}
