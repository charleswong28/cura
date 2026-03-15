"use client";

import { ApolloProvider } from "@apollo/client/react";
import { useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createApolloClient } from "@/lib/apollo-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createApolloClient(), []);

  return (
    <ApolloProvider client={client}>
      {children}
      <Toaster position="bottom-right" />
    </ApolloProvider>
  );
}
