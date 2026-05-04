import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class AssignRoleInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  roleId!: string;
}
