"use client";

import { ApolloProvider } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createApolloClient } from "@/lib/apollo-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const client = useMemo(() => createApolloClient(getToken), [getToken]);

  return (
    <ApolloProvider client={client}>
      {children}
      <Toaster position="bottom-right" />
    </ApolloProvider>
  );
}
