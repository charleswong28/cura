import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import { ROLES_KEY } from "./roles.decorator";
import { AuthUser } from "./auth.types";
import { UserRole } from "../common/graphql/enums";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Check if @Roles() is applied — if not, allow (no role restriction)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Get the authenticated user from ClerkAuthGuard
    const req = this.getRequest(context);
    const authUser: AuthUser | undefined = req.user;
    if (!authUser) {
      throw new ForbiddenException("Not authenticated");
    }

    // DB lookup for current role (not JWT) so role changes take effect immediately
    const db = this.prisma.forTenant(authUser.tenantId);
    const dbUser = await db.user.findFirst({
      where: { clerkUserId: authUser.clerkUserId },
      select: { id: true, role: true },
    });

    if (!dbUser) {
      throw new ForbiddenException("User not found in organization");
    }

    // Attach dbUser to request for downstream reuse
    req.dbUser = dbUser;

    if (!requiredRoles.includes(dbUser.role as UserRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  private getRequest(context: ExecutionContext): any {
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext()?.req;
      if (req) return req;
    } catch {
      // Not a GraphQL context
    }
    return context.switchToHttp().getRequest();
  }
}
