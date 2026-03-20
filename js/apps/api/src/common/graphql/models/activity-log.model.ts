import { ObjectType, Field, ID } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { ActivityAction } from "../enums";

@ObjectType()
export class ActivityLogModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => ActivityAction)
  action!: ActivityAction;

  @Field(() => String)
  entityType!: string;

  @Field(() => String, { nullable: true })
  entityId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;

  @Field(() => Date)
  createdAt!: Date;
}
