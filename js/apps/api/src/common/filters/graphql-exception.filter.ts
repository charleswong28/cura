import { Catch, HttpException, Logger } from "@nestjs/common";
import { GqlExceptionFilter } from "@nestjs/graphql";
import { GraphQLError } from "graphql";

/**
 * Catches all exceptions thrown in GraphQL resolvers and converts them
 * into well-structured GraphQLError responses with appropriate error codes.
 *
 * Error codes follow Apollo conventions:
 * - BAD_USER_INPUT: validation failures (400)
 * - UNAUTHENTICATED: missing or invalid auth (401)
 * - FORBIDDEN: insufficient permissions (403)
 * - NOT_FOUND: entity not found (404)
 * - INTERNAL_SERVER_ERROR: unexpected errors (500+)
 */
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphqlExceptionFilter.name);

  catch(exception: unknown) {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === "string" ? response : ((response as any).message ?? exception.message);

      return new GraphQLError(Array.isArray(message) ? message.join("; ") : message, {
        extensions: { code: httpStatusToGqlCode(status) },
      });
    }

    // Unexpected error — log full stack, return generic message
    this.logger.error(
      "Unhandled exception in GraphQL resolver",
      exception instanceof Error ? exception.stack : String(exception)
    );

    return new GraphQLError("Internal server error", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
}

function httpStatusToGqlCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_USER_INPUT";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}
