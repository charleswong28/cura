import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./auth.decorators";

/**
 * Placeholder guard — passes all requests through.
 * Story 2.4 (TASK-082) replaces this with the real HS512 JWT validation,
 * Redis version check, team-shortId resolution, and permission hydration.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    return isPublic ?? true;
  }
}
