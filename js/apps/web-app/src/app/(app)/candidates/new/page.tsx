"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  CandidateForm,
  type CandidateFormValues,
  toCandidateInput,
} from "@/components/candidates/candidate-form";
import {
  CandidatesDocument,
  CreateCandidateDocument,
  type CreateCandidateMutation,
  type CreateCandidateMutationVariables,
} from "@/graphql/generated/graphql";

export default function NewCandidatePage() {
  const router = useRouter();
  const [createCandidate, { loading }] = useMutation<
    CreateCandidateMutation,
    CreateCandidateMutationVariables
  >(CreateCandidateDocument, {
    // After creation, refresh any cached candidate list so it shows on return.
    refetchQueries: [{ query: CandidatesDocument, variables: { first: 20 } }],
    awaitRefetchQueries: false,
  });

  async function handleSubmit(values: CandidateFormValues) {
    try {
      const result = await createCandidate({ variables: { input: toCandidateInput(values) } });
      const created = result.data?.createCandidate;
      if (!created) throw new Error("Create returned no data");
      toast.success(`Created ${created.firstName} ${created.lastName}`);
      router.push(`/candidates/${created.id}`);
    } catch (err) {
      // Apollo errorLink will toast the GraphQL error; only handle unexpected throws.
      if (err instanceof Error && !err.message.startsWith("Response not successful")) {
        // toast already fired from error link
      }
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/candidates">
            <ArrowLeft />
            Candidates
          </Link>
        </Button>
        <PageHeader title="New candidate" description="Add a candidate to your pipeline." />
      </div>

      <CandidateForm
        submitLabel="Create candidate"
        submitting={loading}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/candidates")}
      />
    </div>
  );
}
