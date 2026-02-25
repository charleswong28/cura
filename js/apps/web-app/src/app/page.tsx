import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Cura CRM</h1>
      <p className="text-muted-foreground">Recruitment platform — Phase 1 in progress.</p>
      <div className="flex gap-2">
        <Badge>Phase 1</Badge>
        <Badge variant="outline">In Development</Badge>
      </div>
      <Button>Get Started</Button>
    </main>
  );
}
