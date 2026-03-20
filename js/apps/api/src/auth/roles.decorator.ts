import { SetMetadata } from "@nestjs/common";
import { UserRole } from "../common/graphql/enums";

export const ROLES_KEY = "roles";

/**
 * Restricts a resolver or controller method to users with the specified role(s).
 * Must be used with RolesGuard registered as APP_GUARD.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
