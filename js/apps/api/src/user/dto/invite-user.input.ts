import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class InviteUserInput {
  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => [String], { nullable: true, description: "Role names to assign on invite" })
  roleNames?: string[];
}
