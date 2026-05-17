import { InputType, Field } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { ClientStatus } from "../../common/graphql/enums";

const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

@InputType()
export class CreateClientInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Client name is required" })
  @MaxLength(200)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(200)
  industry?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsUrl({}, { message: "website must be a valid URL" })
  website?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(50)
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  parentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  bdUserId?: string;

  @Field(() => ClientStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  notes?: string;
}
