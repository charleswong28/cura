"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { CreateTenantDocument } from "@/graphql/generated/graphql";
import { toast } from "sonner";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-");
}

export default function OrgSetupPage() {
  const router = useRouter();
  const { switchTenant } = useAuth();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [createTenant, { loading }] = useMutation(CreateTenantDocument);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      const { data } = await createTenant({
        variables: { input: { name: name.trim(), slug: slug.trim() } },
      });

      if (data?.createTenant) {
        toast.success(`Organization "${data.createTenant.name}" created`);
        await switchTenant(data.createTenant.slug);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organization");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up your organization</h1>
          <p className="text-sm text-muted-foreground">
            Create a workspace for your recruiting team.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="Acme Recruiting"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoComplete="organization"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-slug">
              URL slug
              <span className="ml-1 text-xs text-muted-foreground">(used to log in)</span>
            </Label>
            <div className="flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="select-none border-r border-input px-3 py-2 text-sm text-muted-foreground">
                cura.app/
              </span>
              <input
                id="org-slug"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="acme-recruiting"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name || !slug}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create organization"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an org?{" "}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Go to dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
