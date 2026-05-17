"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { CandidatePagination } from "@/components/candidates/candidate-pagination";
import {
  ANY_STATUS,
  CandidateFilters,
  type CandidateFiltersState,
  type StatusFilter,
} from "@/components/candidates/candidate-filters";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  CandidatesDocument,
  type CandidateFilterInput,
  type CandidateSortField,
  type CandidatesQuery,
  type CandidatesQueryVariables,
  type CandidateStatus,
  type SortOrder,
} from "@/graphql/generated/graphql";

const PAGE_SIZE = 20;

type Cursor =
  | { dir: "first" }
  | { dir: "forward"; after: string }
  | { dir: "backward"; before: string };

const VALID_STATUSES: ReadonlyArray<CandidateStatus> = [
  "ACTIVE",
  "INACTIVE",
  "PLACED",
  "BLACKLISTED",
];
const VALID_SORT_FIELDS: ReadonlyArray<CandidateSortField> = ["NAME", "CREATED_AT", "UPDATED_AT"];

function parseStatus(raw: string | null): StatusFilter {
  if (raw && (VALID_STATUSES as ReadonlyArray<string>).includes(raw)) {
    return raw as CandidateStatus;
  }
  return ANY_STATUS;
}

function parseSortBy(raw: string | null): CandidateSortField {
  if (raw && (VALID_SORT_FIELDS as ReadonlyArray<string>).includes(raw)) {
    return raw as CandidateSortField;
  }
  return "UPDATED_AT";
}

function parseSortOrder(raw: string | null): SortOrder {
  return raw === "ASC" ? "ASC" : "DESC";
}

function stateToParams(state: CandidateFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.status !== ANY_STATUS) params.set("status", state.status);
  if (state.location) params.set("loc", state.location);
  if (state.sortBy !== "UPDATED_AT") params.set("sort", state.sortBy);
  if (state.sortOrder !== "DESC") params.set("order", state.sortOrder);
  return params;
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesPageInner />
    </Suspense>
  );
}

function CandidatesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const initialState = useMemo<CandidateFiltersState>(
    () => ({
      search: searchParams.get("q") ?? "",
      status: parseStatus(searchParams.get("status")),
      location: searchParams.get("loc") ?? "",
      sortBy: parseSortBy(searchParams.get("sort")),
      sortOrder: parseSortOrder(searchParams.get("order")),
    }),
    // Only seed once from URL; subsequent URL updates are driven by state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFilters] = useState<CandidateFiltersState>(initialState);
  const [cursor, setCursor] = useState<Cursor>({ dir: "first" });

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedLocation = useDebouncedValue(filters.location, 300);

  // Sync filter state → URL.
  useEffect(() => {
    const params = stateToParams(filters);
    const qs = params.toString();
    router.replace(qs ? `/candidates?${qs}` : "/candidates", { scroll: false });
  }, [filters, router]);

  // Reset paging whenever the effective query inputs change.
  const filterKey = `${debouncedSearch}|${filters.status}|${debouncedLocation}|${filters.sortBy}|${filters.sortOrder}`;
  useEffect(() => {
    setCursor({ dir: "first" });
  }, [filterKey]);

  const filterInput: CandidateFilterInput | undefined = useMemo(() => {
    const input: CandidateFilterInput = {};
    if (debouncedSearch) input.search = debouncedSearch;
    if (filters.status !== ANY_STATUS) input.status = filters.status;
    if (debouncedLocation) input.location = debouncedLocation;
    return Object.keys(input).length > 0 ? input : undefined;
  }, [debouncedSearch, debouncedLocation, filters.status]);

  const variables: CandidatesQueryVariables = {
    ...(cursor.dir === "forward"
      ? { first: PAGE_SIZE, after: cursor.after }
      : cursor.dir === "backward"
        ? { last: PAGE_SIZE, before: cursor.before }
        : { first: PAGE_SIZE }),
    filter: filterInput,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, loading, error } = useQuery<CandidatesQuery, CandidatesQueryVariables>(
    CandidatesDocument,
    { variables, notifyOnNetworkStatusChange: true, skip: !user }
  );

  const showLoading = authLoading || (loading && !data);

  const connection = data?.candidates;
  const candidates = connection?.edges.map((e) => e.node) ?? [];
  const pageInfo = connection?.pageInfo;
  const totalCount = connection?.totalCount ?? 0;

  return (
    <div className="space-y-6 p-8">
      <PageHeader title="Candidates" description="Manage your candidate pipeline.">
        <Button asChild>
          <Link href="/candidates/new">
            <Plus />
            Add Candidate
          </Link>
        </Button>
      </PageHeader>

      <CandidateFilters state={filters} onChange={setFilters} />

      {error && !loading ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load candidates: {error.message}
        </div>
      ) : null}

      <CandidateTable candidates={candidates} loading={showLoading} />

      {connection ? (
        <CandidatePagination
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          visibleCount={candidates.length}
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
