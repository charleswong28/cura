import { registerEnumType } from "@nestjs/graphql";

export enum CandidateSortField {
  NAME = "NAME",
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
}
registerEnumType(CandidateSortField, { name: "CandidateSortField" });

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}
registerEnumType(SortOrder, { name: "SortOrder" });
