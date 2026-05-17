import { registerEnumType } from "@nestjs/graphql";

export enum ClientSortField {
  NAME = "NAME",
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
}
registerEnumType(ClientSortField, { name: "ClientSortField" });
