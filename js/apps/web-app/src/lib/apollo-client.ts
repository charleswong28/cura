import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { toast } from "sonner";

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql";

/**
 * Auth link — injects Authorization header from Clerk JWT.
 * Stubbed as a pass-through until Clerk is integrated (EPIC-WA-003).
 */
const authLink = new ApolloLink((operation, forward) => {
  // TODO (WA-012): Once Clerk is integrated, inject the JWT here:
  //   const { getToken } = useAuth();
  //   const token = await getToken();
  //   operation.setContext({ headers: { authorization: `Bearer ${token}` } });
  return forward(operation);
});

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

export function createApolloClient() {
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
