import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";
import { getAccessToken, refreshAccessToken, setAccessToken } from "@/lib/token-store";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql";

/**
 * Apollo cache with ULID-based key fields for all CRM entities.
 */
const cache = new InMemoryCache({
  typePolicies: {
    Tenant: { keyFields: ["id"] },
    User: { keyFields: ["id"] },
    Candidate: { keyFields: ["id"] },
    Client: { keyFields: ["id"] },
    Job: { keyFields: ["id"] },
    TenantSettings: { keyFields: ["id"] },
  },
});

const httpLink = new HttpLink({ uri: GRAPHQL_ENDPOINT });

/**
 * Auth + JWT_STALE retry link.
 *
 * For every operation:
 *   1. Injects the in-memory access token as a Bearer header.
 *   2. If the response contains a JWT_STALE error, refreshes the token via
 *      /api/auth/refresh and retries the operation once. On retry failure
 *      the user is redirected to /login.
 */
function createAuthLink(): ApolloLink {
  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      let cancelled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let subscription: any = null;

      function execute(isRetry = false) {
        const token = getAccessToken();
        if (token) {
          operation.setContext({
            headers: { authorization: `Bearer ${token}` },
          });
        }

        subscription = forward(operation).subscribe({
          next(value) {
            if (cancelled) return;

            const staleErr = (value.errors ?? []).find(
              // NestJS maps UnauthorizedException from guards to GraphQL errors;
              // match by message since custom .code is not serialised into extensions.
              (e) =>
                (e.extensions as Record<string, unknown>)?.code === "JWT_STALE" ||
                e.message === "JWT is stale."
            );

            if (staleErr && !isRetry) {
              // Refresh the token and retry once
              refreshAccessToken().then((newToken) => {
                if (cancelled) return;
                if (newToken) {
                  execute(true);
                } else {
                  setAccessToken(null);
                  if (typeof window !== "undefined") {
                    window.location.href = "/login";
                  }
                }
              });
              return;
            }

            observer.next(value);
          },
          error(err) {
            if (!cancelled) observer.error(err);
          },
          complete() {
            if (!cancelled) observer.complete();
          },
        });
      }

      execute();

      return () => {
        cancelled = true;
        subscription?.unsubscribe?.();
      };
    });
  });
}

/**
 * Error link — surfaces GraphQL and network errors as toast notifications.
 * JWT_STALE errors are already handled by the auth link and never reach here.
 */
const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      if (
        (err.extensions as Record<string, unknown>)?.code === "JWT_STALE" ||
        err.message === "JWT is stale."
      ) {
        continue;
      }
      toast.error(err.message);
    }
  } else {
    toast.error("Network error — please check your connection");
  }
});

export function createApolloClient() {
  return new ApolloClient({
    link: ApolloLink.from([errorLink, createAuthLink(), httpLink]),
    cache,
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network" },
    },
  });
}
