import { InputType, Field, PartialType } from "@nestjs/graphql";
import { IsOptional } from "class-validator";
import { CreateClientInput } from "./create-client.input";
import { ClientStatus } from "../../common/graphql/enums";

@InputType()
export class UpdateClientInput extends PartialType(CreateClientInput) {
  @Field(() => ClientStatus, { nullable: true })
  @IsOptional()
  status?: ClientStatus;
}
