import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, Observable } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql";

/**
 * Error link — surfaces GraphQL and network errors as toast notifications.
 */
const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      toast.error(err.message);
    }
  } else {
    toast.error("Network error — please check your connection");
  }
});

const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
});

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

/**
 * Creates an auth link that injects the Clerk JWT into every GraphQL request.
 * Uses an async getToken callback provided by Clerk's useAuth() hook.
 */
function createAuthLink(getToken: () => Promise<string | null>) {
  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      getToken()
        .then((token) => {
          if (token) {
            operation.setContext({
              headers: { authorization: `Bearer ${token}` },
            });
          }
          forward(operation).subscribe(observer);
        })
        .catch((err) => observer.error(err));
    });
  });
}

export function createApolloClient(getToken: () => Promise<string | null>) {
  const authLink = createAuthLink(getToken);

  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}
