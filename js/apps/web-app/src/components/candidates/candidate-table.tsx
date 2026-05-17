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
import { CandidateStatusBadge } from "@/components/candidates/candidate-status-badge";
import type { CandidateFieldsFragment } from "@/graphql/generated/graphql";

interface CandidateTableProps {
  candidates: CandidateFieldsFragment[];
  loading: boolean;
}

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
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

export function CandidateTable({ candidates, loading }: CandidateTableProps) {
  const router = useRouter();

  if (loading) {
    return <CandidateTableSkeleton />;
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card py-16 text-center">
        <p className="text-sm font-medium">No candidates yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first candidate to get started.
        </p>
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
          {candidates.map((c) => (
            <TableRow
              key={c.id}
              onClick={() => router.push(`/candidates/${c.id}`)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">
                {c.firstName} {c.lastName}
              </TableCell>
              <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
              <TableCell>{c.currentCompany ?? "—"}</TableCell>
              <TableCell>{c.currentTitle ?? "—"}</TableCell>
              <TableCell>{c.location ?? "—"}</TableCell>
              <TableCell>
                <CandidateStatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatUpdated(c.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CandidateTableSkeleton() {
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
