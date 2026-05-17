"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, Github, Linkedin, Mail, MapPin, Phone, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import {
  CandidateForm,
  type CandidateFormValues,
  toCandidateInput,
} from "@/components/candidates/candidate-form";
import {
  CandidateDocument,
  type CandidateFieldsFragment,
  type CandidateQuery,
  type CandidateQueryVariables,
  UpdateCandidateDocument,
  type UpdateCandidateMutation,
  type UpdateCandidateMutationVariables,
} from "@/graphql/generated/graphql";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading, error } = useQuery<CandidateQuery, CandidateQueryVariables>(
    CandidateDocument,
    { variables: { id } }
  );

  const candidate = data?.candidate;

  const [editing, setEditing] = useState(false);

  const initialFormValues = useMemo<CandidateFormValues | undefined>(() => {
    if (!candidate) return undefined;
    return {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      currentCompany: candidate.currentCompany ?? "",
      currentTitle: candidate.currentTitle ?? "",
      location: candidate.location ?? "",
      linkedinUrl: candidate.linkedinUrl ?? "",
      githubUrl: candidate.githubUrl ?? "",
      notes: candidate.notes ?? "",
      status: candidate.status,
    };
  }, [candidate]);

  const [updateCandidate, { loading: saving }] = useMutation<
    UpdateCandidateMutation,
    UpdateCandidateMutationVariables
  >(UpdateCandidateDocument);

  async function handleSubmit(values: CandidateFormValues) {
    if (!candidate) return;
    const input = toCandidateInput(values);
    try {
      await updateCandidate({
        variables: { id: candidate.id, input },
        // Optimistic cache update — Apollo normalises by id, so the detail view
        // (and any cached list row) updates immediately.
        optimisticResponse: {
          __typename: "Mutation",
          updateCandidate: {
            __typename: "CandidateModel",
            id: candidate.id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email ?? null,
            phone: input.phone ?? null,
            currentCompany: input.currentCompany ?? null,
            currentTitle: input.currentTitle ?? null,
            location: input.location ?? null,
            status: input.status,
            notes: input.notes ?? null,
            linkedinUrl: input.linkedinUrl ?? null,
            githubUrl: input.githubUrl ?? null,
            createdAt: candidate.createdAt,
            updatedAt: new Date().toISOString(),
          },
        },
      });
      toast.success("Candidate updated");
      setEditing(false);
    } catch {
      // Apollo errorLink will toast the GraphQL error.
    }
  }

  if (loading && !candidate) {
    return <DetailSkeleton />;
  }

  if (error || !candidate) {
    return (
      <div className="space-y-6 p-8 max-w-3xl">
        <BackLink />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error?.message ?? "Candidate not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <BackLink />
        <PageHeader
          title={`${candidate.firstName} ${candidate.lastName}`}
          description={candidate.currentTitle ?? undefined}
        >
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
          ) : null}
        </PageHeader>
      </div>

      {editing && initialFormValues ? (
        <CandidateForm
          initial={initialFormValues}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <CandidateView candidate={candidate} />
      )}
    </div>
  );

  function BackLink() {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-2"
        onClick={() => router.push("/candidates")}
      >
        <ArrowLeft />
        Candidates
      </Button>
    );
  }
}

function CandidateView({ candidate }: { candidate: CandidateFieldsFragment }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <CandidateStatusBadge status={candidate.status} />
        {candidate.currentCompany ? (
          <span className="text-sm text-muted-foreground">at {candidate.currentCompany}</span>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <InfoRow icon={<Mail className="size-4" />} label="Email" value={candidate.email} isEmail />
        <InfoRow icon={<Phone className="size-4" />} label="Phone" value={candidate.phone} />
        <InfoRow icon={<MapPin className="size-4" />} label="Location" value={candidate.location} />
        <InfoRow label="Title" value={candidate.currentTitle} />
        <InfoRow
          icon={<Linkedin className="size-4" />}
          label="LinkedIn"
          value={candidate.linkedinUrl}
          isLink
        />
        <InfoRow
          icon={<Github className="size-4" />}
          label="GitHub"
          value={candidate.githubUrl}
          isLink
        />
      </dl>

      {candidate.notes ? (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Notes</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{candidate.notes}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isEmail,
  isLink,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  isEmail?: boolean;
  isLink?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">
        {value ? (
          isLink ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {value}
            </a>
          ) : isEmail ? (
            <a href={`mailto:${value}`} className="text-primary underline underline-offset-2">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
