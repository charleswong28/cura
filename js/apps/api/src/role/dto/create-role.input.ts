import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class CreateRoleInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], {
    description: "Permission strings e.g. ['candidate:view_all', 'job:create']",
  })
  permissions!: string[];
}
