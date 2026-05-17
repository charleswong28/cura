import { registerEnumType } from "@nestjs/graphql";

export enum JobSortField {
  TITLE = "TITLE",
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
  PRIORITY = "PRIORITY",
}
registerEnumType(JobSortField, { name: "JobSortField" });
