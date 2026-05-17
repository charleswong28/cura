import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/graphql/generated/graphql";

const VARIANTS: Record<JobStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  ON_HOLD: { label: "On hold", className: "bg-amber-100 text-amber-900 border-amber-200" },
  FILLED: { label: "Filled", className: "bg-blue-100 text-blue-900 border-blue-200" },
  CLOSED: { label: "Closed", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, className } = VARIANTS[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
