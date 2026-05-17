"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ClientTable } from "@/components/clients/client-table";
import { ClientPagination } from "@/components/clients/client-pagination";
import {
  ANY_STATUS,
  ClientFilters,
  type ClientFiltersState,
  type ClientStatusFilter,
} from "@/components/clients/client-filters";
import { useAuth } from "@/lib/auth-context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  ClientsDocument,
  type ClientFilterInput,
  type ClientSortField,
  type ClientsQuery,
  type ClientsQueryVariables,
  type ClientStatus,
  type SortOrder,
} from "@/graphql/generated/graphql";

const PAGE_SIZE = 20;

type Cursor =
  | { dir: "first" }
  | { dir: "forward"; after: string }
  | { dir: "backward"; before: string };

const VALID_STATUSES: ReadonlyArray<ClientStatus> = ["ACTIVE", "PROSPECT", "INACTIVE"];
const VALID_SORT_FIELDS: ReadonlyArray<ClientSortField> = ["NAME", "CREATED_AT", "UPDATED_AT"];

function parseStatus(raw: string | null): ClientStatusFilter {
  if (raw && (VALID_STATUSES as ReadonlyArray<string>).includes(raw)) {
    return raw as ClientStatus;
  }
  return ANY_STATUS;
}

function parseSortBy(raw: string | null): ClientSortField {
  if (raw && (VALID_SORT_FIELDS as ReadonlyArray<string>).includes(raw)) {
    return raw as ClientSortField;
  }
  return "UPDATED_AT";
}

function parseSortOrder(raw: string | null): SortOrder {
  return raw === "ASC" ? "ASC" : "DESC";
}

function stateToParams(state: ClientFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.status !== ANY_STATUS) params.set("status", state.status);
  if (state.sortBy !== "UPDATED_AT") params.set("sort", state.sortBy);
  if (state.sortOrder !== "DESC") params.set("order", state.sortOrder);
  return params;
}

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const initialState = useMemo<ClientFiltersState>(
    () => ({
      search: searchParams.get("q") ?? "",
      status: parseStatus(searchParams.get("status")),
      sortBy: parseSortBy(searchParams.get("sort")),
      sortOrder: parseSortOrder(searchParams.get("order")),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFilters] = useState<ClientFiltersState>(initialState);
  const [cursor, setCursor] = useState<Cursor>({ dir: "first" });

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  useEffect(() => {
    const params = stateToParams(filters);
    const qs = params.toString();
    router.replace(qs ? `/clients?${qs}` : "/clients", { scroll: false });
  }, [filters, router]);

  const filterKey = `${debouncedSearch}|${filters.status}|${filters.sortBy}|${filters.sortOrder}`;
  useEffect(() => {
    setCursor({ dir: "first" });
  }, [filterKey]);

  const filterInput: ClientFilterInput | undefined = useMemo(() => {
    const input: ClientFilterInput = {};
    if (debouncedSearch) input.search = debouncedSearch;
    if (filters.status !== ANY_STATUS) input.status = filters.status;
    return Object.keys(input).length > 0 ? input : undefined;
  }, [debouncedSearch, filters.status]);

  const variables: ClientsQueryVariables = {
    ...(cursor.dir === "forward"
      ? { first: PAGE_SIZE, after: cursor.after }
      : cursor.dir === "backward"
        ? { last: PAGE_SIZE, before: cursor.before }
        : { first: PAGE_SIZE }),
    filter: filterInput,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, loading, error } = useQuery<ClientsQuery, ClientsQueryVariables>(ClientsDocument, {
    variables,
    notifyOnNetworkStatusChange: true,
    skip: !user,
  });

  const showLoading = authLoading || (loading && !data);

  const connection = data?.clients;
  const clients = connection?.edges.map((e) => e.node) ?? [];
  const pageInfo = connection?.pageInfo;
  const totalCount = connection?.totalCount ?? 0;

  return (
    <div className="space-y-6 p-8">
      <PageHeader title="Clients" description="Manage your client relationships.">
        <Button asChild>
          <Link href="/clients/new">
            <Plus />
            Add Client
          </Link>
        </Button>
      </PageHeader>

      <ClientFilters state={filters} onChange={setFilters} />

      {error && !loading ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load clients: {error.message}
        </div>
      ) : null}

      <ClientTable clients={clients} loading={showLoading} />

      {connection ? (
        <ClientPagination
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          visibleCount={clients.length}
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
