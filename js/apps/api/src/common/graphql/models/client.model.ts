import { ObjectType, Field, ID } from "@nestjs/graphql";
import { ClientStatus } from "../enums";

@ObjectType()
export class ClientModel {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  industry!: string | null;

  @Field(() => String, { nullable: true })
  website!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  address!: string | null;

  @Field(() => ClientStatus)
  status!: ClientStatus;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // jobs: resolved via @ResolveField in ClientResolver using DataLoader
}
