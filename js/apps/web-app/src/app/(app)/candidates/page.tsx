"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { CandidatePagination } from "@/components/candidates/candidate-pagination";
import { useAuth } from "@/lib/auth-context";
import {
  CandidatesDocument,
  type CandidatesQuery,
  type CandidatesQueryVariables,
} from "@/graphql/generated/graphql";

const PAGE_SIZE = 20;

type Cursor =
  | { dir: "first" }
  | { dir: "forward"; after: string }
  | { dir: "backward"; before: string };

export default function CandidatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [cursor, setCursor] = useState<Cursor>({ dir: "first" });

  const variables: CandidatesQueryVariables =
    cursor.dir === "forward"
      ? { first: PAGE_SIZE, after: cursor.after }
      : cursor.dir === "backward"
        ? { last: PAGE_SIZE, before: cursor.before }
        : { first: PAGE_SIZE };

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
