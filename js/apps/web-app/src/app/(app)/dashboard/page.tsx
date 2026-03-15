import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        description="Pipeline summary and key metrics will appear here."
      >
        <Badge variant="outline">Coming Soon</Badge>
      </PageHeader>
    </div>
  );
}
