import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class RemoveRoleInput {
  @Field(() => String)
  userId!: string;

  @Field(() => String)
  roleId!: string;
}
