"use client";

import { ApolloProvider } from "@apollo/client/react";
import { Toaster } from "@/components/ui/sonner";
import { apolloClient } from "@/lib/apollo-instance";
import { AuthProvider } from "@/lib/auth-context";

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
