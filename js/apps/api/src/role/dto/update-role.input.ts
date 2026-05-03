import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class UpdateRoleInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  permissions?: string[];
}
