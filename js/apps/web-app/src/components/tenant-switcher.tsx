"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Popover } from "radix-ui";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { MyTenantsDocument, type MyTenantsQuery } from "@/graphql/generated/graphql";
import { toast } from "sonner";

type Tenant = MyTenantsQuery["myTenants"][number];

interface TenantSwitcherProps {
  collapsed: boolean;
}

export function TenantSwitcher({ collapsed }: TenantSwitcherProps) {
  const { user, switchTenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Mount-gate: Radix Popover's useId differs between SSR and client because
  // the React tree shifts once AuthProvider hydrates `user`. Defer to client
  // to avoid `aria-controls` mismatches — same pattern as `JobFilters`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data } = useQuery(MyTenantsDocument, { skip: !user });
  const tenants: Tenant[] = data?.myTenants ?? [];

  async function handleSwitch(slug: string) {
    if (switching) return;
    setOpen(false);
    setSwitching(slug);
    try {
      await switchTenant(slug);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch organization");
    } finally {
      setSwitching(null);
    }
  }

  const currentTenant = tenants.find((t) => t.id === user?.tenantId);
  const displayName = currentTenant?.name ?? "—";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2">
        <div
          title={displayName}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground"
        >
          {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : initial}
        </div>
      </div>
    );
  }

  if (!mounted) {
    // Reserve the same vertical footprint to avoid layout shift on hydration.
    return <div className="h-9 w-full" />;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
          )}
          aria-label="Switch organization"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
            {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : initial}
          </div>
          <span className="flex-1 truncate text-left">{displayName}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 min-w-48 overflow-hidden rounded-md border border-border bg-popover shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {tenants.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Organizations
              </div>
              <div className="space-y-0.5 px-1 pb-1">
                {tenants.map((tenant) => {
                  const isCurrent = tenant.id === user?.tenantId;
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => handleSwitch(tenant.slug)}
                      disabled={isCurrent || !!switching}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                        isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        "disabled:cursor-not-allowed"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isCurrent ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{tenant.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mx-1 mb-1 border-t border-border" />
            </>
          )}

          <div className="px-1 pb-1">
            <a
              href="/org-setup"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Create organization</span>
            </a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
