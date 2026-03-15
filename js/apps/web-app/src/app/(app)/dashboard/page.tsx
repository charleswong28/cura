import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Badge variant="outline">Coming Soon</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pipeline summary and key metrics will appear here.
      </p>
    </div>
  );
}
