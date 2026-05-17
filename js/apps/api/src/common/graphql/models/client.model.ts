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

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => String, { nullable: true })
  bdUserId!: string | null;

  @Field(() => String, { nullable: true })
  parentId!: string | null;

  @Field(() => Number)
  activeJobCount!: number;

  @Field(() => Number)
  totalJobCount!: number;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  // jobs, contacts: resolved via @ResolveField in ClientResolver using DataLoader
}
