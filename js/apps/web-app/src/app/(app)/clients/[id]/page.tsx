"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Globe,
  MapPin,
  Pencil,
  Phone,
  Trash2,
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
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientForm, type ClientFormValues, toClientInput } from "@/components/clients/client-form";
import {
  ClientDocument,
  type ClientFieldsFragment,
  type ClientQuery,
  type ClientQueryVariables,
  ClientsDocument,
  ClientTimelineDocument,
  type ClientTimelineQuery,
  type ClientTimelineQueryVariables,
  DeleteClientDocument,
  type DeleteClientMutation,
  type DeleteClientMutationVariables,
  UpdateClientDocument,
  type UpdateClientMutation,
  type UpdateClientMutationVariables,
} from "@/graphql/generated/graphql";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data, loading, error } = useQuery<ClientQuery, ClientQueryVariables>(ClientDocument, {
    variables: { id },
  });

  const client = data?.client;

  const [editing, setEditing] = useState(false);

  const initialFormValues = useMemo<ClientFormValues | undefined>(() => {
    if (!client) return undefined;
    return {
      name: client.name,
      industry: client.industry ?? "",
      website: client.website ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
      status: client.status,
    };
  }, [client]);

  const [updateClient, { loading: saving }] = useMutation<
    UpdateClientMutation,
    UpdateClientMutationVariables
  >(UpdateClientDocument);

  const [deleteClient, { loading: deleting }] = useMutation<
    DeleteClientMutation,
    DeleteClientMutationVariables
  >(DeleteClientDocument, {
    refetchQueries: [{ query: ClientsDocument, variables: { first: 20 } }],
    awaitRefetchQueries: false,
  });

  async function handleDelete() {
    if (!client) return;
    try {
      await deleteClient({ variables: { id: client.id } });
      const jobsNote =
        client.totalJobCount > 0
          ? ` ${client.totalJobCount} linked job${client.totalJobCount === 1 ? "" : "s"} archived.`
          : "";
      toast.success(`${client.name} deleted.${jobsNote}`);
      router.push("/clients");
    } catch {
      // Apollo errorLink will toast the GraphQL error.
    }
  }

  async function handleSubmit(values: ClientFormValues) {
    if (!client) return;
    const input = toClientInput(values);
    try {
      await updateClient({
        variables: { id: client.id, input },
        // Optimistic cache update — Apollo normalises by id, so the detail view
        // (and any cached list row) updates immediately.
        optimisticResponse: {
          __typename: "Mutation",
          updateClient: {
            __typename: "ClientModel",
            id: client.id,
            name: input.name,
            industry: input.industry ?? null,
            website: input.website ?? null,
            phone: input.phone ?? null,
            address: input.address ?? null,
            notes: input.notes ?? null,
            status: input.status,
            bdUserId: client.bdUserId ?? null,
            parentId: client.parentId ?? null,
            activeJobCount: client.activeJobCount,
            totalJobCount: client.totalJobCount,
            createdAt: client.createdAt,
            updatedAt: new Date().toISOString(),
          },
        },
      });
      toast.success("Client updated");
      setEditing(false);
    } catch {
      // Apollo errorLink will toast the GraphQL error.
    }
  }

  if (loading && !client) {
    return <DetailSkeleton />;
  }

  if (error || !client) {
    return (
      <div className="space-y-6 p-8 max-w-3xl">
        <BackLink onClick={() => router.push("/clients")} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error?.message ?? "Client not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl">
      <div>
        <BackLink onClick={() => router.push("/clients")} />
        <PageHeader title={client.name} description={client.industry ?? undefined}>
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
                    <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {client.totalJobCount > 0
                        ? `This will also archive ${client.totalJobCount} linked job${
                            client.totalJobCount === 1 ? "" : "s"
                          }${
                            client.activeJobCount > 0
                              ? ` (${client.activeJobCount} currently active)`
                              : ""
                          }. This cannot be undone.`
                        : "This cannot be undone."}
                    </AlertDialogDescription>
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
        <ClientForm
          initial={initialFormValues}
          submitLabel="Save changes"
          submitting={saving}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <ClientView client={client} />
          <Separator />
          <LinkedJobsSection client={client} />
          <Separator />
          <ActivitySection clientId={client.id} />
        </>
      )}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onClick}>
      <ArrowLeft />
      Clients
    </Button>
  );
}

function ClientView({ client }: { client: ClientFieldsFragment }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <ClientStatusBadge status={client.status} />
        {client.industry ? (
          <span className="text-sm text-muted-foreground">{client.industry}</span>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <InfoRow
          icon={<Globe className="size-4" />}
          label="Website"
          value={client.website}
          isLink
        />
        <InfoRow icon={<Phone className="size-4" />} label="Phone" value={client.phone} />
        <InfoRow icon={<MapPin className="size-4" />} label="Address" value={client.address} />
        <InfoRow icon={<Building2 className="size-4" />} label="Industry" value={client.industry} />
      </dl>

      {client.notes ? (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Notes</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{client.notes}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LinkedJobsSection({ client }: { client: ClientFieldsFragment }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Briefcase className="size-4" />
          Jobs
        </h2>
        <span className="text-xs text-muted-foreground">
          {client.activeJobCount} active · {client.totalJobCount} total
        </span>
      </div>
      <div className="rounded-md border border-dashed bg-card px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Linked jobs will appear here once Job management is enabled.
        </p>
      </div>
    </div>
  );
}

function ActivitySection({ clientId }: { clientId: string }) {
  const { data, loading } = useQuery<ClientTimelineQuery, ClientTimelineQueryVariables>(
    ClientTimelineDocument,
    { variables: { id: clientId } }
  );

  const entries = data?.clientTimeline ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Activity</h2>
      {loading && entries.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="text-sm">
              <div className="font-medium">{e.title}</div>
              {e.description ? <div className="text-muted-foreground">{e.description}</div> : null}
              <div className="text-xs text-muted-foreground">
                {new Date(e.occurredAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLink,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
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
