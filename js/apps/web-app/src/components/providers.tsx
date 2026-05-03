"use client";

import { useMemo } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { Toaster } from "@/components/ui/sonner";
import { createApolloClient } from "@/lib/apollo-client";
import { AuthProvider } from "@/lib/auth-context";

// Apollo client is stable across renders — created once per app lifetime.
const apolloClient = createApolloClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ApolloProvider client={apolloClient}>
        {children}
        <Toaster position="bottom-right" />
      </ApolloProvider>
    </AuthProvider>
  );
}
