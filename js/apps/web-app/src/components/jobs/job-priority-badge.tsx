import { Badge } from "@/components/ui/badge";
import type { JobPriority } from "@/graphql/generated/graphql";

const VARIANTS: Record<JobPriority, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  MEDIUM: { label: "Medium", className: "bg-sky-100 text-sky-900 border-sky-200" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-900 border-orange-200" },
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-900 border-red-200" },
};

export function JobPriorityBadge({ priority }: { priority: JobPriority }) {
  const { label, className } = VARIANTS[priority] ?? { label: priority, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
