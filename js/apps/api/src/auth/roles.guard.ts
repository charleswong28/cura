// Clerk-era RolesGuard — superseded by FunctionalPermissionGuard (Story 2.4, TASK-085).
// Kept as a no-op export so app.module.ts compiles until Story 2.4 removes it.
import { CanActivate, Injectable } from "@nestjs/common";

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
