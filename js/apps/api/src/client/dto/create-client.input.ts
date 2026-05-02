import { InputType, Field } from "@nestjs/graphql";
import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

@InputType()
export class CreateClientInput {
  @Field(() => String)
  @IsString()
  @MaxLength(200)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bdUserId?: string;
}
