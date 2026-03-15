import { ObjectType, Field, ID } from "@nestjs/graphql";
import { CandidateStatus } from "../enums";

@ObjectType()
export class CandidateModel {
  @Field(() => ID)
  id!: string;

  @Field()
  tenantId!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  currentCompany!: string | null;

  @Field(() => String, { nullable: true })
  currentTitle!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => CandidateStatus)
  status!: CandidateStatus;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
