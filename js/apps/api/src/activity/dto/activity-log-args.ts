import { ArgsType, Field, Int } from "@nestjs/graphql";

@ArgsType()
export class ActivityLogArgs {
  @Field(() => Int, { defaultValue: 50 })
  limit!: number;

  @Field(() => Int, { defaultValue: 0 })
  offset!: number;
}
