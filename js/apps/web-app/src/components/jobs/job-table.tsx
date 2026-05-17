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
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobPriorityBadge } from "@/components/jobs/job-priority-badge";
import type { JobsQuery } from "@/graphql/generated/graphql";

type JobRow = JobsQuery["jobs"]["edges"][number]["node"];

interface JobTableProps {
  jobs: JobRow[];
  loading: boolean;
}

const COLUMNS = [
  { key: "title", label: "Title" },
  { key: "client", label: "Client" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "recruiter", label: "Recruiter" },
  { key: "created", label: "Created" },
] as const;

function formatRelative(iso: string): string {
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

function recruiterLabel(
  recruiter: { firstName: string; lastName: string; email: string } | null | undefined
): string {
  if (!recruiter) return "Unassigned";
  const full = `${recruiter.firstName} ${recruiter.lastName}`.trim();
  return full || recruiter.email;
}

export function JobTable({ jobs, loading }: JobTableProps) {
  const router = useRouter();

  if (loading) {
    return <JobTableSkeleton />;
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-card py-16 text-center">
        <p className="text-sm font-medium">No jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first job order to get started.
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
          {jobs.map((j) => (
            <TableRow
              key={j.id}
              onClick={() => router.push(`/jobs/${j.id}`)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{j.title}</TableCell>
              <TableCell className="text-muted-foreground">{j.client?.name ?? "—"}</TableCell>
              <TableCell>
                <JobStatusBadge status={j.status} />
              </TableCell>
              <TableCell>
                <JobPriorityBadge priority={j.priority} />
              </TableCell>
              <TableCell className={j.assignedTo ? "" : "text-muted-foreground italic"}>
                {recruiterLabel(j.assignedTo)}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatRelative(j.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function JobTableSkeleton() {
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
