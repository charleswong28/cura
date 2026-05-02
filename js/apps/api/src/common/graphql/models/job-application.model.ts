import { ObjectType, Field, ID, Float } from "@nestjs/graphql";
import { ApplicationStageType } from "../enums";

@ObjectType()
export class JobApplicationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  candidateId!: string;

  @Field(() => String)
  jobId!: string;

  @Field(() => String, { nullable: true })
  source!: string | null;

  @Field(() => String, { nullable: true })
  ownerUserId!: string | null;

  @Field(() => ApplicationStageType)
  maxStage!: ApplicationStageType;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Float, { nullable: true })
  matchScore!: number | null;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  // candidate, job, stages, interviews, offers, placements: resolved via @ResolveField
}

@ObjectType()
export class ApplicationStageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  applicationId!: string;

  @Field(() => ApplicationStageType)
  stage!: ApplicationStageType;

  @Field(() => Date)
  enteredAt!: Date;

  @Field(() => String)
  enteredById!: string;

  @Field(() => String, { nullable: true })
  note!: string | null;
}

@ObjectType()
export class InterviewModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  applicationId!: string;

  @Field(() => Number)
  round!: number;

  @Field(() => Date)
  scheduledAt!: Date;

  @Field(() => Date, { nullable: true })
  completedAt!: Date | null;

  @Field(() => String, { nullable: true })
  interviewerUserId!: string | null;

  @Field(() => String, { nullable: true })
  feedback!: string | null;

  @Field(() => Number, { nullable: true })
  rating!: number | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class OfferModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  applicationId!: string;

  @Field(() => Float, { nullable: true })
  amount!: number | null;

  @Field(() => String, { nullable: true })
  currency!: string | null;

  @Field(() => Date, { nullable: true })
  signedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  startDate!: Date | null;

  @Field(() => Date, { nullable: true })
  declinedAt!: Date | null;

  @Field(() => String, { nullable: true })
  declineReason!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class PlacementModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  tenantId!: string;

  @Field(() => String)
  applicationId!: string;

  @Field(() => Date, { nullable: true })
  startDate!: Date | null;

  @Field(() => Date, { nullable: true })
  endDate!: Date | null;

  @Field(() => Float, { nullable: true })
  salary!: number | null;

  @Field(() => String, { nullable: true })
  currency!: string | null;

  @Field(() => Float, { nullable: true })
  fee!: number | null;

  @Field(() => String, { nullable: true })
  feeType!: string | null;

  @Field(() => String, { nullable: true })
  notes!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
