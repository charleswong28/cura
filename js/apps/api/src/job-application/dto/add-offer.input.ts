import { InputType, Field, Float } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class AddOfferInput {
  @Field(() => Float, { nullable: true })
  @IsOptional()
  amount?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  startDate?: Date;
}
