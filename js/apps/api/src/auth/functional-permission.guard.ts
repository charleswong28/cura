import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { REQUIRE_PERMISSION_KEY } from "./auth.decorators";
import type { RequestUser } from "./auth.types";

@Injectable()
export class FunctionalPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required) return true;

    const user: RequestUser | undefined = this.extractUser(ctx);

    if (!user) {
      throw new ForbiddenException("Authentication required.");
    }

    if (user.permissions.has("*:*") || user.permissions.has(required)) {
      return true;
    }

    throw new ForbiddenException(`Missing permission: ${required}`);
  }

  private extractUser(ctx: ExecutionContext): RequestUser | undefined {
    try {
      const req = GqlExecutionContext.create(ctx).getContext()?.req;
      if (req?.user) return req.user as RequestUser;
    } catch {
      // Not a GraphQL context
    }
    return ctx.switchToHttp().getRequest()?.user as RequestUser | undefined;
  }
}
