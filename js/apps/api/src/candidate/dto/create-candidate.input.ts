import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

@InputType()
export class CreateCandidateInput {
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @Field(() => String)
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currentCompany?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currentTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
