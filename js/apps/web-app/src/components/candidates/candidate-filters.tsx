"use client";

import { useEffect, useState } from "react";
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
import type { CandidateSortField, CandidateStatus, SortOrder } from "@/graphql/generated/graphql";

export const ANY_STATUS = "ANY" as const;
export type StatusFilter = CandidateStatus | typeof ANY_STATUS;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ANY_STATUS, label: "Any status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PLACED", label: "Placed" },
  { value: "BLACKLISTED", label: "Blacklisted" },
];

const SORT_OPTIONS: { value: CandidateSortField; label: string }[] = [
  { value: "UPDATED_AT", label: "Last updated" },
  { value: "CREATED_AT", label: "Date created" },
  { value: "NAME", label: "Name" },
];

export interface CandidateFiltersState {
  search: string;
  status: StatusFilter;
  location: string;
  sortBy: CandidateSortField;
  sortOrder: SortOrder;
}

interface CandidateFiltersProps {
  state: CandidateFiltersState;
  onChange: (next: CandidateFiltersState) => void;
}

export function CandidateFilters({ state, onChange }: CandidateFiltersProps) {
  // Mount-gate: Radix Select's useId hydrates inconsistently under
  // <Suspense>+useSearchParams in React 19, causing aria-controls mismatches.
  // Skip SSR for the filter row; height placeholder prevents layout shift.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const set = <K extends keyof CandidateFiltersState>(key: K, value: CandidateFiltersState[K]) =>
    onChange({ ...state, [key]: value });

  const hasActiveFilters =
    state.search !== "" ||
    state.status !== ANY_STATUS ||
    state.location !== "" ||
    state.sortBy !== "UPDATED_AT" ||
    state.sortOrder !== "DESC";

  if (!mounted) return <div className="h-9" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={state.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, email, company, title…"
          className="pl-8"
        />
      </div>

      <Select value={state.status} onValueChange={(v) => set("status", v as StatusFilter)}>
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

      <Input
        value={state.location}
        onChange={(e) => set("location", e.target.value)}
        placeholder="Location"
        className="w-[160px]"
      />

      <Select value={state.sortBy} onValueChange={(v) => set("sortBy", v as CandidateSortField)}>
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
              location: "",
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
