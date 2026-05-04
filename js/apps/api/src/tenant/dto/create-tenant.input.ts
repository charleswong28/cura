import { InputType, Field } from "@nestjs/graphql";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

@InputType()
export class CreateTenantInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug may only contain lowercase letters, numbers, and hyphens",
  })
  slug!: string;
}
