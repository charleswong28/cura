import { ObjectType, Field, ID } from "@nestjs/graphql";
import { ClientStatus } from "../enums";

@ObjectType()
export class ClientModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
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

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  // jobs: resolved via @ResolveField in ClientResolver using DataLoader
}
