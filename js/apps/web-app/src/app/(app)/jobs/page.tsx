"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { JobTable } from "@/components/jobs/job-table";
import { JobPagination } from "@/components/jobs/job-pagination";
import {
  ANY_PRIORITY,
  ANY_STATUS,
  JobFilters,
  type JobFiltersState,
  type JobPriorityFilter,
  type JobStatusFilter,
} from "@/components/jobs/job-filters";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  JobsDocument,
  type JobFilterInput,
  type JobPriority,
  type JobSortField,
  type JobStatus,
  type JobsQuery,
  type JobsQueryVariables,
  type SortOrder,
} from "@/graphql/generated/graphql";

const PAGE_SIZE = 20;

type Cursor =
  | { dir: "first" }
  | { dir: "forward"; after: string }
  | { dir: "backward"; before: string };

const VALID_STATUSES: ReadonlyArray<JobStatus> = ["OPEN", "ON_HOLD", "FILLED", "CLOSED"];
const VALID_PRIORITIES: ReadonlyArray<JobPriority> = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_SORT_FIELDS: ReadonlyArray<JobSortField> = [
  "TITLE",
  "CREATED_AT",
  "UPDATED_AT",
  "PRIORITY",
];

function parseStatus(raw: string | null): JobStatusFilter {
  if (raw && (VALID_STATUSES as ReadonlyArray<string>).includes(raw)) {
    return raw as JobStatus;
  }
  return ANY_STATUS;
}

function parsePriority(raw: string | null): JobPriorityFilter {
  if (raw && (VALID_PRIORITIES as ReadonlyArray<string>).includes(raw)) {
    return raw as JobPriority;
  }
  return ANY_PRIORITY;
}

function parseSortBy(raw: string | null): JobSortField {
  if (raw && (VALID_SORT_FIELDS as ReadonlyArray<string>).includes(raw)) {
    return raw as JobSortField;
  }
  return "UPDATED_AT";
}

function parseSortOrder(raw: string | null): SortOrder {
  return raw === "ASC" ? "ASC" : "DESC";
}

function stateToParams(state: JobFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.status !== ANY_STATUS) params.set("status", state.status);
  if (state.priority !== ANY_PRIORITY) params.set("priority", state.priority);
  if (state.sortBy !== "UPDATED_AT") params.set("sort", state.sortBy);
  if (state.sortOrder !== "DESC") params.set("order", state.sortOrder);
  return params;
}

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsPageInner />
    </Suspense>
  );
}

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const initialState = useMemo<JobFiltersState>(
    () => ({
      search: searchParams.get("q") ?? "",
      status: parseStatus(searchParams.get("status")),
      priority: parsePriority(searchParams.get("priority")),
      sortBy: parseSortBy(searchParams.get("sort")),
      sortOrder: parseSortOrder(searchParams.get("order")),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFilters] = useState<JobFiltersState>(initialState);
  const [cursor, setCursor] = useState<Cursor>({ dir: "first" });

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  useEffect(() => {
    const params = stateToParams(filters);
    const qs = params.toString();
    router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
  }, [filters, router]);

  const filterKey = `${debouncedSearch}|${filters.status}|${filters.priority}|${filters.sortBy}|${filters.sortOrder}`;
  useEffect(() => {
    setCursor({ dir: "first" });
  }, [filterKey]);

  const filterInput: JobFilterInput | undefined = useMemo(() => {
    const input: JobFilterInput = {};
    if (debouncedSearch) input.search = debouncedSearch;
    if (filters.status !== ANY_STATUS) input.status = filters.status;
    if (filters.priority !== ANY_PRIORITY) input.priority = filters.priority;
    return Object.keys(input).length > 0 ? input : undefined;
  }, [debouncedSearch, filters.status, filters.priority]);

  const variables: JobsQueryVariables = {
    ...(cursor.dir === "forward"
      ? { first: PAGE_SIZE, after: cursor.after }
      : cursor.dir === "backward"
        ? { last: PAGE_SIZE, before: cursor.before }
        : { first: PAGE_SIZE }),
    filter: filterInput,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, loading, error } = useQuery<JobsQuery, JobsQueryVariables>(JobsDocument, {
    variables,
    notifyOnNetworkStatusChange: true,
    skip: !user,
  });

  const showLoading = authLoading || (loading && !data);

  const connection = data?.jobs;
  const jobs = connection?.edges.map((e) => e.node) ?? [];
  const pageInfo = connection?.pageInfo;
  const totalCount = connection?.totalCount ?? 0;

  return (
    <div className="space-y-6 p-8">
      <PageHeader title="Jobs" description="Manage your open job orders.">
        <Button asChild>
          <Link href="/jobs/new">
            <Plus />
            Add Job
          </Link>
        </Button>
      </PageHeader>

      <JobFilters state={filters} onChange={setFilters} />

      {error && !loading ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load jobs: {error.message}
        </div>
      ) : null}

      <JobTable jobs={jobs} loading={showLoading} />

      {connection ? (
        <JobPagination
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          visibleCount={jobs.length}
          hasNextPage={Boolean(pageInfo?.hasNextPage)}
          hasPreviousPage={Boolean(pageInfo?.hasPreviousPage) || cursor.dir !== "first"}
          onNext={() => {
            if (pageInfo?.endCursor) setCursor({ dir: "forward", after: pageInfo.endCursor });
          }}
          onPrevious={() => {
            if (pageInfo?.startCursor) {
              setCursor({ dir: "backward", before: pageInfo.startCursor });
            } else {
              setCursor({ dir: "first" });
            }
          }}
        />
      ) : null}
    </div>
  );
}
