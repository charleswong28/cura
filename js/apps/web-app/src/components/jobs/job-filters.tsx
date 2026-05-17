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
import type { JobPriority, JobSortField, JobStatus, SortOrder } from "@/graphql/generated/graphql";

export const ANY_STATUS = "ANY" as const;
export const ANY_PRIORITY = "ANY" as const;
export type JobStatusFilter = JobStatus | typeof ANY_STATUS;
export type JobPriorityFilter = JobPriority | typeof ANY_PRIORITY;

const STATUS_OPTIONS: { value: JobStatusFilter; label: string }[] = [
  { value: ANY_STATUS, label: "Any status" },
  { value: "OPEN", label: "Open" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "FILLED", label: "Filled" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: JobPriorityFilter; label: string }[] = [
  { value: ANY_PRIORITY, label: "Any priority" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const SORT_OPTIONS: { value: JobSortField; label: string }[] = [
  { value: "UPDATED_AT", label: "Last updated" },
  { value: "CREATED_AT", label: "Date created" },
  { value: "TITLE", label: "Title" },
  { value: "PRIORITY", label: "Priority" },
];

export interface JobFiltersState {
  search: string;
  status: JobStatusFilter;
  priority: JobPriorityFilter;
  sortBy: JobSortField;
  sortOrder: SortOrder;
}

interface JobFiltersProps {
  state: JobFiltersState;
  onChange: (next: JobFiltersState) => void;
}

export function JobFilters({ state, onChange }: JobFiltersProps) {
  // Mount-gate: Radix Select's useId hydrates inconsistently under
  // <Suspense>+useSearchParams in React 19; defer to client to avoid mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const set = <K extends keyof JobFiltersState>(key: K, value: JobFiltersState[K]) =>
    onChange({ ...state, [key]: value });

  const hasActiveFilters =
    state.search !== "" ||
    state.status !== ANY_STATUS ||
    state.priority !== ANY_PRIORITY ||
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
          placeholder="Search title, description…"
          className="pl-8"
        />
      </div>

      <Select value={state.status} onValueChange={(v) => set("status", v as JobStatusFilter)}>
        <SelectTrigger className="w-[150px]">
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

      <Select value={state.priority} onValueChange={(v) => set("priority", v as JobPriorityFilter)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state.sortBy} onValueChange={(v) => set("sortBy", v as JobSortField)}>
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
              priority: ANY_PRIORITY,
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
