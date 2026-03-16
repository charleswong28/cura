"use client";

import { ApolloProvider } from "@apollo/client/react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect, useMemo, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createApolloClient } from "@/lib/apollo-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const client = useMemo(() => createApolloClient(getToken), [getToken]);

  // Track org ID changes and clear Apollo cache on switch
  const prevOrgId = useRef(organization?.id);
  useEffect(() => {
    if (prevOrgId.current && organization?.id && prevOrgId.current !== organization.id) {
      client.resetStore();
    }
    prevOrgId.current = organization?.id;
  }, [organization?.id, client]);

  return (
    <ApolloProvider client={client}>
      {children}
      <Toaster position="bottom-right" />
    </ApolloProvider>
  );
}
