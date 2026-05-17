import { Badge } from "@/components/ui/badge";
import type { CandidateStatus } from "@/graphql/generated/graphql";

const VARIANTS: Record<CandidateStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  INACTIVE: { label: "Inactive", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  PLACED: { label: "Placed", className: "bg-blue-100 text-blue-900 border-blue-200" },
  BLACKLISTED: { label: "Blacklisted", className: "bg-red-100 text-red-900 border-red-200" },
};

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  const { label, className } = VARIANTS[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
