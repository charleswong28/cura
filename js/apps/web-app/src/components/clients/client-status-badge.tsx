import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@/graphql/generated/graphql";

const VARIANTS: Record<ClientStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  PROSPECT: { label: "Prospect", className: "bg-blue-100 text-blue-900 border-blue-200" },
  INACTIVE: { label: "Inactive", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { label, className } = VARIANTS[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
