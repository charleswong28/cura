"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { JobForm, type JobFormValues, toCreateJobInput } from "@/components/jobs/job-form";
import {
  CreateJobDocument,
  type CreateJobMutation,
  type CreateJobMutationVariables,
  JobsDocument,
} from "@/graphql/generated/graphql";

export default function NewJobPage() {
  const router = useRouter();
  const [createJob, { loading }] = useMutation<CreateJobMutation, CreateJobMutationVariables>(
    CreateJobDocument,
    {
      refetchQueries: [{ query: JobsDocument, variables: { first: 20 } }],
      awaitRefetchQueries: false,
    }
  );

  async function handleSubmit(values: JobFormValues) {
    try {
      const result = await createJob({ variables: { input: toCreateJobInput(values) } });
      const created = result.data?.createJob;
      if (!created) throw new Error("Create returned no data");
      toast.success(`Created ${created.title}`);
      router.push(`/jobs/${created.id}`);
    } catch {
      // Apollo errorLink will toast the GraphQL error.
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/jobs">
            <ArrowLeft />
            Jobs
          </Link>
        </Button>
        <PageHeader title="New job" description="Open a new job order." />
      </div>

      <JobForm
        submitLabel="Create job"
        submitting={loading}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/jobs")}
      />
    </div>
  );
}
