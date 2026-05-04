import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class InviteUserInput {
  @Field(() => String)
  email!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => [String], { nullable: true, description: "Role names to assign on invite" })
  roleNames?: string[];
}
