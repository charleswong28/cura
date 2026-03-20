import { InputType, Field } from "@nestjs/graphql";
import { UserRole } from "../../common/graphql/enums";

@InputType()
export class InviteUserInput {
  @Field(() => String)
  email!: string;

  @Field(() => UserRole)
  role!: UserRole;
}
