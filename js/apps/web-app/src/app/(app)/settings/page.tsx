import Link from "next/link";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="mt-8 space-y-2">
        <Link
          href="/settings/mfa"
          className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium text-sm">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add an extra layer of security with an authenticator app.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
