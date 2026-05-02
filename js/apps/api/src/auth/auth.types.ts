/**
 * The principal attached to every authenticated request by JwtAuthGuard.
 * Populated from JWT claims + in-process caches; see authn-authz-technical-plan.md §9.2.
 * Story 2.4 implements the real guard; this interface is the contract every resolver uses.
 */
export interface RequestUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  version: number;
  teams: Array<{ id: string; role: "LEAD" | "MEMBER" }>;
  roles: string[]; // role names from JWT (e.g. "recruiter", "admin")
  permissions: Set<string>; // hydrated via DB-ETag cache
}
