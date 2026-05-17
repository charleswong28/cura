"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ClientForm, type ClientFormValues, toClientInput } from "@/components/clients/client-form";
import {
  ClientsDocument,
  CreateClientDocument,
  type CreateClientMutation,
  type CreateClientMutationVariables,
} from "@/graphql/generated/graphql";

export default function NewClientPage() {
  const router = useRouter();
  const [createClient, { loading }] = useMutation<
    CreateClientMutation,
    CreateClientMutationVariables
  >(CreateClientDocument, {
    refetchQueries: [{ query: ClientsDocument, variables: { first: 20 } }],
    awaitRefetchQueries: false,
  });

  async function handleSubmit(values: ClientFormValues) {
    try {
      const result = await createClient({ variables: { input: toClientInput(values) } });
      const created = result.data?.createClient;
      if (!created) throw new Error("Create returned no data");
      toast.success(`Created ${created.name}`);
      router.push(`/clients/${created.id}`);
    } catch {
      // Apollo errorLink will toast the GraphQL error.
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/clients">
            <ArrowLeft />
            Clients
          </Link>
        </Button>
        <PageHeader title="New client" description="Add a client to your book of business." />
      </div>

      <ClientForm
        submitLabel="Create client"
        submitting={loading}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/clients")}
      />
    </div>
  );
}
