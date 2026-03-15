import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthUser } from "./auth.types";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a resolver or controller method as publicly accessible (no auth required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Extracts the authenticated user from the request context.
 * Works for both GraphQL resolvers and REST controllers.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    // Try GraphQL context first
    const gqlCtx = GqlExecutionContext.create(context);
    const req = gqlCtx.getContext()?.req;
    if (req?.user) {
      return req.user as AuthUser;
    }

    // Fall back to HTTP context (REST controllers)
    const httpReq = context.switchToHttp().getRequest();
    return httpReq?.user as AuthUser;
  }
);
