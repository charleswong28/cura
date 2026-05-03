import { ObjectType, Field, ID, Int } from "@nestjs/graphql";

@ObjectType()
export class RoleModel {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  shortId!: number;

  @Field(() => String, { nullable: true, description: "null for built-in roles" })
  tenantId!: string | null;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => [String])
  permissions!: string[];

  @Field()
  builtin!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
