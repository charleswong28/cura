import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class RemoveRoleInput {
  @Field()
  userId!: string;

  @Field()
  roleId!: string;
}
