import Link from "next/link";
import { Icon } from "@/components/icon";
import type { SortDir } from "@/lib/defects";

interface PagerProps {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  sort: SortDir;
}

export function Pager({ page, pageCount, total, from, to, sort }: PagerProps) {
  const href = (n: number) => `/defects?page=${n}&sort=${sort}`;
  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  return (
    <nav className="pager" aria-label="Defect list pages">
      <span className="text-sm text-muted">{`Showing ${from}–${to} of ${total}`}</span>
      <div className="pager-controls">
        {hasPrev ? (
          <Link className="btn btn-secondary" href={href(page - 1)}>
            <Icon name="chevron-left" />
            Previous page
          </Link>
        ) : (
          <button className="btn btn-secondary" type="button" disabled>
            <Icon name="chevron-left" />
            Previous page
          </button>
        )}
        <span className="text-bold" aria-live="polite">{`Page ${page} of ${pageCount}`}</span>
        {hasNext ? (
          <Link className="btn btn-secondary" href={href(page + 1)}>
            Next page
            <Icon name="chevron-right" />
          </Link>
        ) : (
          <button className="btn btn-secondary" type="button" disabled>
            Next page
            <Icon name="chevron-right" />
          </button>
        )}
      </div>
    </nav>
  );
}
