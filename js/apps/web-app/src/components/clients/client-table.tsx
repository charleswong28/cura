"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import type { ClientFieldsFragment } from "@/graphql/generated/graphql";

interface ClientTableProps {
  clients: ClientFieldsFragment[];
  loading: boolean;
}

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "industry", label: "Industry" },
  { key: "website", label: "Website" },
  { key: "status", label: "Status" },
  { key: "jobs", label: "Jobs" },
  { key: "updated", label: "Updated" },
] as const;

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ClientTable({ clients, loading }: ClientTableProps) {
  const router = useRouter();

  if (loading) {
    return <ClientTableSkeleton />;
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card py-16 text-center">
        <p className="text-sm font-medium">No clients yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Add your first client to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => (
            <TableRow
              key={c.id}
              onClick={() => router.push(`/clients/${c.id}`)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.industry ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatWebsite(c.website) ?? "—"}
              </TableCell>
              <TableCell>
                <ClientStatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {c.activeJobCount > 0 ? (
                  <span>
                    <span className="font-medium text-foreground">{c.activeJobCount}</span>
                    {c.totalJobCount > c.activeJobCount ? ` / ${c.totalJobCount}` : null}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatUpdated(c.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {COLUMNS.map((c) => (
                <TableCell key={c.key}>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
