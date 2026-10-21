"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DefectFilters } from "@/components/defects/defect-filters";
import { DefectTable } from "@/components/defects/defect-table";
import { Pager } from "@/components/defects/pager";
import { Icon } from "@/components/icon";
import {
  clampPage,
  EMPTY_FILTERS,
  filterDefects,
  hasActiveFilters,
  pageOf,
  PAGE_SIZE,
  type Defect,
  type DefectFilters as Filters,
  type SortDir,
} from "@/lib/defects";

interface DefectListViewProps {
  defects: Defect[];
  sort: SortDir;
  page: number;
}

export function DefectListView({ defects, sort, page }: DefectListViewProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const matched = filterDefects(defects, filters);
  const active = hasActiveFilters(filters);
  const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const view = pageOf(matched, clampPage(String(page), pageCount));

  const change = (next: Filters) => {
    setFilters(next);
    if (page > 1) router.replace(`/defects?sort=${sort}`, { scroll: false });
  };
  const clear = () => {
    change(EMPTY_FILTERS);
    searchRef.current?.focus();
  };

  const summary =
    matched.length === 0
      ? "No defects match"
      : active
        ? `Showing ${matched.length} of ${defects.length} defects`
        : `Showing all ${defects.length} defects`;

  return (
    <div className="stack">
      <DefectFilters filters={filters} onChange={change} searchRef={searchRef} />
      <div className="results-line text-sm text-muted">
        <span role="status" aria-live="polite">
          {summary}
        </span>
        {active && matched.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {matched.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" />
          <h2>No defects match your search.</h2>
          <p>Try different words, or remove a filter to see more defects.</p>
          <button type="button" className="btn btn-secondary" onClick={clear}>
            <Icon name="x" />
            Clear filters
          </button>
        </div>
      ) : (
        <div className="stack stack-sm">
          <DefectTable rows={view.rows} sort={sort} from={view.from} to={view.to} total={view.total} />
          <Pager
            page={view.page}
            pageCount={view.pageCount}
            total={view.total}
            from={view.from}
            to={view.to}
            sort={sort}
          />
        </div>
      )}
    </div>
  );
}
