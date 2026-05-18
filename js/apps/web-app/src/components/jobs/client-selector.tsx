"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  ClientsDocument,
  type ClientsQuery,
  type ClientsQueryVariables,
} from "@/graphql/generated/graphql";

export interface SelectedClient {
  id: string;
  name: string;
  industry?: string | null;
}

interface ClientSelectorProps {
  value: SelectedClient | null;
  onChange: (next: SelectedClient | null) => void;
  error?: string;
  disabled?: boolean;
}

const PAGE_SIZE = 20;

export function ClientSelector({ value, onChange, error, disabled }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const { data, loading } = useQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, {
    variables: {
      first: PAGE_SIZE,
      filter: debounced ? { search: debounced } : undefined,
    },
    skip: !open || !user,
    fetchPolicy: "cache-and-network",
  });

  const results = data?.clients.edges.map((e) => e.node) ?? [];

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        className={cn(
          "w-full justify-between font-normal",
          !value && "text-muted-foreground",
          error && "border-destructive"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{value ? value.name : "Select a client…"}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open ? (
        <div className="bg-popover absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="h-8 pl-8"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {loading && results.length === 0 ? (
              <li className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
                <Loader2 className="size-3 animate-spin" />
                Loading…
              </li>
            ) : results.length === 0 ? (
              <li className="text-muted-foreground px-3 py-2 text-sm">
                {debounced ? `No clients match "${debounced}"` : "No clients found"}
              </li>
            ) : (
              results.map((c) => {
                const selected = value?.id === c.id;
                return (
                  <li key={c.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ id: c.id, name: c.name, industry: c.industry ?? null });
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "hover:bg-accent flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                        selected && "bg-accent"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.name}</div>
                        {c.industry ? (
                          <div className="text-muted-foreground truncate text-xs">{c.industry}</div>
                        ) : null}
                      </div>
                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}

      {value && !open ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {value.industry ? value.industry : "Selected client"}
        </p>
      ) : null}
    </div>
  );
}
