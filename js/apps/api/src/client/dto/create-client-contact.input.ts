import { InputType, Field } from "@nestjs/graphql";
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

@InputType()
export class CreateClientContactInput {
  @Field(() => String)
  @IsString()
  clientId!: string;

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
  @IsString()
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
