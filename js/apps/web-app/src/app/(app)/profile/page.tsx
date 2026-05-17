"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { MeDocument, UpdateMyProfileDocument } from "@/graphql/generated/graphql";
import { useAuth } from "@/lib/auth-context";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const { logout, patchUser } = useAuth();
  const { data, loading } = useQuery(MeDocument);
  const [updateProfile, { loading: saving }] = useMutation(UpdateMyProfileDocument, {
    refetchQueries: [MeDocument],
  });

  const me = data?.me;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
    }
  }, [me]);

  const isDirty = !!me && (firstName !== (me.firstName ?? "") || lastName !== (me.lastName ?? ""));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    try {
      const result = await updateProfile({
        variables: { input: { firstName: firstName.trim(), lastName: lastName.trim() } },
      });
      const updated = result.data?.updateMyProfile;
      if (updated) {
        patchUser({ displayName: `${updated.firstName} ${updated.lastName}` });
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  function handleCancel() {
    if (!me) return;
    setFirstName(me.firstName ?? "");
    setLastName(me.lastName ?? "");
  }

  if (loading) {
    return (
      <div className="p-8 max-w-xl">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <PageHeader title="Profile" description="Manage your personal information." />

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={me?.email ?? ""} readOnly disabled />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First login</Label>
            <p className="text-sm text-muted-foreground">{formatDate(me?.firstLogin)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Last inactive at</Label>
            <p className="text-sm text-muted-foreground">{formatDate(me?.lastInactiveAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!isDirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={!isDirty || saving}
          >
            Cancel
          </Button>
        </div>
      </form>

      <Separator className="my-8" />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Session</h2>
        <p className="text-xs text-muted-foreground">
          Signing out will end your session on this device.
        </p>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
