import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ClientStatus } from "../../common/graphql/enums";

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

@InputType()
export class ClientFilterInput {
  @Field(() => String, {
    nullable: true,
    description: "Free-text match on name and industry",
  })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field(() => ClientStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  industry?: string;
}
