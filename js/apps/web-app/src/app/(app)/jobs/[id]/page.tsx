"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  ListChecks,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobPriorityBadge } from "@/components/jobs/job-priority-badge";
import { JobForm, type JobFormValues, toUpdateJobInput } from "@/components/jobs/job-form";
import {
  DeleteJobDocument,
  type DeleteJobMutation,
  type DeleteJobMutationVariables,
  JobDocument,
  type JobQuery,
  type JobQueryVariables,
  type JobStatus,
  JobsDocument,
  UpdateJobDocument,
  type UpdateJobMutation,
  type UpdateJobMutationVariables,
  UpdateJobStatusDocument,
  type UpdateJobStatusMutation,
  type UpdateJobStatusMutationVariables,
} from "@/graphql/generated/graphql";

interface PageProps {
  params: Promise<{ id: string }>;
}

type JobDetail = JobQuery["job"];

// Mirror of API ALLOWED_TRANSITIONS — used to render one-click transition buttons.
const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  OPEN: ["ON_HOLD", "FILLED", "CLOSED"],
  ON_HOLD: ["OPEN", "FILLED", "CLOSED"],
  FILLED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

const STATUS_VERB: Record<JobStatus, string> = {
  OPEN: "Reopen",
  ON_HOLD: "Put on hold",
  FILLED: "Mark filled",
  CLOSED: "Close",
};

function recruiterLabel(
  u: { firstName: string; lastName: string; email: string } | null | undefined
): string {
  if (!u) return "Unassigned";
  const full = `${u.firstName} ${u.lastName}`.trim();
  return full || u.email;
}

export default function JobDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading, error } = useQuery<JobQuery, JobQueryVariables>(JobDocument, {
    variables: { id },
  });

  const job = data?.job;

  const [editing, setEditing] = useState(false);

  const initialFormValues = useMemo<JobFormValues | undefined>(() => {
    if (!job) return undefined;
    return {
      title: job.title,
      client: { id: job.client.id, name: job.client.name },
      description: job.description ?? "",
      requirements: job.requirements ?? "",
      status: job.status,
      priority: job.priority,
      assignedToId: job.assignedToId ?? null,
    };
  }, [job]);

  const [updateJob, { loading: saving }] = useMutation<
    UpdateJobMutation,
    UpdateJobMutationVariables
  >(UpdateJobDocument);

  const [updateJobStatus, { loading: changingStatus }] = useMutation<
    UpdateJobStatusMutation,
    UpdateJobStatusMutationVariables
  >(UpdateJobStatusDocument);

  const [deleteJob, { loading: deleting }] = useMutation<
    DeleteJobMutation,
    DeleteJobMutationVariables
  >(DeleteJobDocument, {
    refetchQueries: [{ query: JobsDocument, variables: { first: 20 } }],
    awaitRefetchQueries: false,
  });

  async function handleSubmit(values: JobFormValues) {
    if (!job) return;
    const input = toUpdateJobInput(values);
    try {
      await updateJob({ variables: { id: job.id, input } });
      toast.success("Job updated");
      setEditing(false);
    } catch {
      // Apollo errorLink will toast.
    }
  }

  async function handleStatusChange(next: JobStatus) {
    if (!job) return;
    try {
      await updateJobStatus({ variables: { id: job.id, status: next } });
      toast.success(`Status changed to ${STATUS_LABELS[next]}`);
    } catch {
      // Apollo errorLink will toast.
    }
  }

  async function handleDelete() {
    if (!job) return;
    try {
      await deleteJob({ variables: { id: job.id } });
      toast.success(`${job.title} deleted.`);
      router.push("/jobs");
    } catch {
      // Apollo errorLink will toast.
    }
  }

  if (loading && !job) {
    return <DetailSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="space-y-6 p-8 max-w-3xl">
        <BackLink onClick={() => router.push("/jobs")} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error?.message ?? "Job not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <BackLink onClick={() => router.push("/jobs")} />
        <PageHeader title={job.title} description={job.client.name}>
          {!editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {job.title}?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </PageHeader>
      </div>

      {editing && initialFormValues ? (
        <JobForm
          initial={initialFormValues}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <JobView job={job} />
          <Separator />
          <StatusControls job={job} disabled={changingStatus} onChange={handleStatusChange} />
          <Separator />
          <CandidatesPlaceholder applicationCount={job.applicationCount} />
        </>
      )}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onClick}>
      <ArrowLeft />
      Jobs
    </Button>
  );
}

const STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: "Open",
  ON_HOLD: "On hold",
  FILLED: "Filled",
  CLOSED: "Closed",
};

function JobView({ job }: { job: JobDetail }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <JobStatusBadge status={job.status} />
        <JobPriorityBadge priority={job.priority} />
        <span className="text-sm text-muted-foreground">
          <Link href={`/clients/${job.client.id}`} className="underline-offset-2 hover:underline">
            {job.client.name}
          </Link>
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <InfoRow
          icon={<UserIcon className="size-4" />}
          label="Recruiter"
          value={recruiterLabel(job.assignedTo)}
          muted={!job.assignedTo}
        />
        <InfoRow
          icon={<UserIcon className="size-4" />}
          label="Owner"
          value={recruiterLabel(job.ownerUser)}
          muted={!job.ownerUser}
        />
      </dl>

      {job.description ? (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4" />
              Description
            </h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.description}</p>
          </div>
        </>
      ) : null}

      {job.requirements ? (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-4" />
              Requirements
            </h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.requirements}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusControls({
  job,
  disabled,
  onChange,
}: {
  job: JobDetail;
  disabled: boolean;
  onChange: (next: JobStatus) => void;
}) {
  const transitions = STATUS_TRANSITIONS[job.status] ?? [];
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Change status</h2>
      <div className="flex flex-wrap items-center gap-2">
        {transitions.length === 0 ? (
          <span className="text-sm text-muted-foreground">No transitions available.</span>
        ) : (
          transitions.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(s)}
            >
              {STATUS_VERB[s]}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

function CandidatesPlaceholder({ applicationCount }: { applicationCount: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Briefcase className="size-4" />
          Candidates
        </h2>
        <span className="text-xs text-muted-foreground">{applicationCount} application(s)</span>
      </div>
      <div className="rounded-md border border-dashed bg-card px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Pipeline view will appear here in Phase 2.</p>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={`text-sm ${muted ? "italic text-muted-foreground" : ""}`}>{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
