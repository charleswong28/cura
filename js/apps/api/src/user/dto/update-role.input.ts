import { InputType, Field } from "@nestjs/graphql";
import { UserRole } from "../../common/graphql/enums";

@InputType()
export class UpdateRoleInput {
  @Field(() => String)
  userId!: string;

  @Field(() => UserRole)
  role!: UserRole;
}
