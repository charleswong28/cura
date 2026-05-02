// Clerk-era @Roles() decorator — superseded by @RequirePermission() (Story 2.4, TASK-085).
// Kept as a no-op export so existing resolver files compile until Story 2.4 removes them.
export const ROLES_KEY = "roles";
export const Roles =
  (..._roles: string[]) =>
  (_target: any, _key: string, descriptor: PropertyDescriptor) =>
    descriptor;
