import { AccessLevel, GranteeType, GrantSource } from "../generated/prisma/enums";

export interface GrantInput {
  tenantId: string;
  granteeType: GranteeType;
  granteeId: string;
  resourceType: string;
  resourceId: string;
  accessLevel: AccessLevel;
  grantSource: GrantSource;
  actorId: string;
  expiresAt?: Date;
  reason?: string;
}
