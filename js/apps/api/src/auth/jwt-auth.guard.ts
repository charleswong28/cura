import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "./redis.service";
import { PermissionCacheService } from "./permission-cache.service";
import { IS_PUBLIC_KEY } from "./auth.decorators";
import { RequestUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly permCache: PermissionCacheService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env["JWT_SECRET"];
    if (!secret) {
      throw new Error("JWT_SECRET env var is not set");
    }

    let payload: any;
    try {
      payload = jwt.verify(token, secret, { algorithms: ["HS512"] });
    } catch (err) {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    const { sub: userId, tid: tenantId, sid: sessionId, ver: userVer, teams, roles } = payload;

    // 1. Redis version check
    const currentVer = await this.redis.getUserVer(userId);
    if (currentVer !== userVer) {
      const error = new UnauthorizedException("JWT is stale.");
      (error as any).code = "JWT_STALE";
      throw error;
    }

    // 2. Resolve team shortIds -> ULIDs
    const resolvedTeams = await Promise.all(
      (teams || []).map(async (team: { id: string; r: string }) => {
        const teamRecord = await this.prisma.team.findUnique({
          where: { shortId: team.id },
          select: { id: true },
        });
        return {
          id: teamRecord?.id ?? team.id,
          role: team.r === "L" ? "LEAD" : "MEMBER",
        };
      })
    );

    // 3. Hydrate functional permissions from DB-ETag cache
    const permissions = await this.permCache.getFunctionalPermissions(userId, tenantId);

    // 4. Assemble RequestUser
    const requestUser: RequestUser = {
      userId,
      tenantId,
      sessionId,
      version: userVer,
      teams: resolvedTeams,
      roles: roles || [],
      permissions,
    };

    request.user = requestUser;

    return true;
  }
}
