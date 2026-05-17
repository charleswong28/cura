import { InputType, Field } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "First name cannot be empty" })
  @MaxLength(100)
  firstName?: string;

  @Field(() => String, { nullable: true })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "Last name cannot be empty" })
  @MaxLength(100)
  lastName?: string;
}
