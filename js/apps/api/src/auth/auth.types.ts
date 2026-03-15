export interface AuthUser {
  /** Clerk user ID (JWT `sub` claim) */
  clerkUserId: string;
  /** Internal ULID tenant ID, resolved from Clerk `org_id` */
  tenantId: string;
  /** Clerk organization role, e.g. "org:admin", "org:member" */
  orgRole: string;
}
