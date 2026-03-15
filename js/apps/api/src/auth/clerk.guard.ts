import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { verifyToken } from "@clerk/backend";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import { AuthUser } from "./auth.types";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  /** clerkOrgId → internal ULID tenantId (immutable mapping, safe to cache indefinitely) */
  private readonly tenantCache = new Map<string, string>();

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = this.getRequest(context);

    // Extract Bearer token
    const authHeader = req.headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization header");
    }
    const token = authHeader.slice(7);

    // Verify JWT with Clerk
    let payload: { sub: string; org_id?: string; org_role?: string };
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
    } catch (err) {
      this.logger.debug(`Token verification failed: ${err}`);
      throw new UnauthorizedException("Invalid token");
    }

    // Require organization context
    if (!payload.org_id) {
      throw new ForbiddenException("No organization selected");
    }

    // Resolve Clerk org_id → internal tenantId
    const tenantId = await this.resolveTenantId(payload.org_id);

    // Attach auth context to request
    const user: AuthUser = {
      clerkUserId: payload.sub,
      tenantId,
      orgRole: payload.org_role ?? "org:member",
    };
    req.user = user;

    return true;
  }

  private getRequest(context: ExecutionContext): any {
    // GraphQL context
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const req = gqlCtx.getContext()?.req;
      if (req) return req;
    } catch {
      // Not a GraphQL context — fall through to HTTP
    }

    // HTTP context (REST controllers)
    return context.switchToHttp().getRequest();
  }

  private async resolveTenantId(clerkOrgId: string): Promise<string> {
    // Check cache first
    const cached = this.tenantCache.get(clerkOrgId);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { clerkOrgId },
      select: { id: true },
    });

    if (!tenant) {
      throw new ForbiddenException("Organization not provisioned");
    }

    this.tenantCache.set(clerkOrgId, tenant.id);
    return tenant.id;
  }
}
