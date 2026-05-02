import { registerEnumType } from "@nestjs/graphql";

// These mirror the Prisma enums in schema.prisma.
// registerEnumType makes them available in the generated GraphQL schema.

export enum CandidateStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PLACED = "PLACED",
  BLACKLISTED = "BLACKLISTED",
}
registerEnumType(CandidateStatus, { name: "CandidateStatus" });

export enum ClientStatus {
  PROSPECT = "PROSPECT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}
registerEnumType(ClientStatus, { name: "ClientStatus" });

export enum JobStatus {
  OPEN = "OPEN",
  ON_HOLD = "ON_HOLD",
  FILLED = "FILLED",
  CLOSED = "CLOSED",
}
registerEnumType(JobStatus, { name: "JobStatus" });

export enum JobPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}
registerEnumType(JobPriority, { name: "JobPriority" });

export enum ActivityAction {
  USER_UPDATED_PROFILE = "USER_UPDATED_PROFILE",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",
  USER_INVITED = "USER_INVITED",
  USER_INVITATION_REVOKED = "USER_INVITATION_REVOKED",
}
registerEnumType(ActivityAction, { name: "ActivityAction" });

export enum ApplicationStageType {
  APPLIED = "APPLIED",
  LONGLIST = "LONGLIST",
  CV_SENT = "CV_SENT",
  INTERVIEW = "INTERVIEW",
  OFFER = "OFFER",
  PLACEMENT = "PLACEMENT",
  REJECTED = "REJECTED",
}
registerEnumType(ApplicationStageType, { name: "ApplicationStageType" });

export enum LanguageProficiency {
  BASIC = "BASIC",
  CONVERSATIONAL = "CONVERSATIONAL",
  PROFESSIONAL = "PROFESSIONAL",
  NATIVE = "NATIVE",
}
registerEnumType(LanguageProficiency, { name: "LanguageProficiency" });

export enum FeeType {
  FLAT = "FLAT",
  PERCENTAGE = "PERCENTAGE",
}
registerEnumType(FeeType, { name: "FeeType" });
