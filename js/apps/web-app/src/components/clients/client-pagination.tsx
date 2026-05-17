"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientPaginationProps {
  totalCount: number;
  pageSize: number;
  visibleCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function ClientPagination({
  totalCount,
  pageSize,
  visibleCount,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: ClientPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2 text-sm text-muted-foreground">
      <span>
        {visibleCount > 0 ? `Showing ${visibleCount} of ${totalCount}` : `${totalCount} total`}
        {pageSize ? ` • ${pageSize} per page` : null}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
