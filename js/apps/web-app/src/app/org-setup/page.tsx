"use client";

import { OrganizationList } from "@clerk/nextjs";

export default function OrgSetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Cura</h1>
          <p className="text-sm text-muted-foreground">
            Create or join an organization to get started.
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
        />
      </div>
    </div>
  );
}
