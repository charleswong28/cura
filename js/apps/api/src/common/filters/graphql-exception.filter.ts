import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { GqlArgumentsHost, GqlContextType } from "@nestjs/graphql";
import { GraphQLError } from "graphql";

/**
 * Catches all exceptions and converts them into well-structured responses.
 *
 * - GraphQL requests: returns a GraphQLError with Apollo error codes
 * - HTTP/REST requests: delegates to NestJS default exception handling
 *
 * Error codes follow Apollo conventions:
 * - BAD_USER_INPUT: validation failures (400)
 * - UNAUTHENTICATED: missing or invalid auth (401)
 * - FORBIDDEN: insufficient permissions (403)
 * - NOT_FOUND: entity not found (404)
 * - INTERNAL_SERVER_ERROR: unexpected errors (500+)
 */
@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GraphqlExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // Only intercept GraphQL requests — let REST use NestJS default handling
    if (host.getType<GqlContextType>() !== "graphql") {
      this.handleHttpException(exception, host);
      return;
    }

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

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(typeof body === "string" ? { statusCode: status, message: body } : body);
    } else {
      this.logger.error(
        "Unhandled exception in HTTP handler",
        exception instanceof Error ? exception.stack : String(exception)
      );
      response.status(500).json({ statusCode: 500, message: "Internal server error" });
    }
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
