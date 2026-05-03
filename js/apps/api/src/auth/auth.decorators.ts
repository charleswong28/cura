import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { RequestUser } from "./auth.types";

export const IS_PUBLIC_KEY = "isPublic";
export const REQUIRE_PERMISSION_KEY = "requirePermission";

/** Marks a resolver or controller method as publicly accessible (no auth required). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Gates a resolver/controller method behind a functional permission string (e.g. 'candidate:view_all'). */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

/**
 * Extracts the authenticated RequestUser from the request context.
 * Works for both GraphQL resolvers and REST controllers.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const gqlCtx = GqlExecutionContext.create(context);
    const req = gqlCtx.getContext()?.req;
    if (req?.user) return req.user as RequestUser;
    return context.switchToHttp().getRequest()?.user as RequestUser;
  }
);
