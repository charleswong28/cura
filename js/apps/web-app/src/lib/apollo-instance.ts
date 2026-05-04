"use client";

import { createApolloClient } from "./apollo-client";

// Singleton instance shared by ApolloProvider and auth-context (for cache resets on tenant switch).
export const apolloClient = createApolloClient();
