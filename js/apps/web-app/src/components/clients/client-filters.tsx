"use client";

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientSortField, ClientStatus, SortOrder } from "@/graphql/generated/graphql";

export const ANY_STATUS = "ANY" as const;
export type ClientStatusFilter = ClientStatus | typeof ANY_STATUS;

const STATUS_OPTIONS: { value: ClientStatusFilter; label: string }[] = [
  { value: ANY_STATUS, label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "INACTIVE", label: "Inactive" },
];

const SORT_OPTIONS: { value: ClientSortField; label: string }[] = [
  { value: "UPDATED_AT", label: "Last updated" },
  { value: "CREATED_AT", label: "Date created" },
  { value: "NAME", label: "Name" },
];

export interface ClientFiltersState {
  search: string;
  status: ClientStatusFilter;
  sortBy: ClientSortField;
  sortOrder: SortOrder;
}

interface ClientFiltersProps {
  state: ClientFiltersState;
  onChange: (next: ClientFiltersState) => void;
}

export function ClientFilters({ state, onChange }: ClientFiltersProps) {
  const set = <K extends keyof ClientFiltersState>(key: K, value: ClientFiltersState[K]) =>
    onChange({ ...state, [key]: value });

  const hasActiveFilters =
    state.search !== "" ||
    state.status !== ANY_STATUS ||
    state.sortBy !== "UPDATED_AT" ||
    state.sortOrder !== "DESC";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={state.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, industry…"
          className="pl-8"
        />
      </div>

      <Select value={state.status} onValueChange={(v) => set("status", v as ClientStatusFilter)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state.sortBy} onValueChange={(v) => set("sortBy", v as ClientSortField)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={state.sortOrder === "ASC" ? "Sort ascending" : "Sort descending"}
        onClick={() => set("sortOrder", state.sortOrder === "ASC" ? "DESC" : "ASC")}
      >
        {state.sortOrder === "ASC" ? <ArrowUp /> : <ArrowDown />}
      </Button>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              search: "",
              status: ANY_STATUS,
              sortBy: "UPDATED_AT",
              sortOrder: "DESC",
            })
          }
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
