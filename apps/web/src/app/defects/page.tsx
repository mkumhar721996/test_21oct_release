import Link from "next/link";
import { DefectListView } from "@/components/defects/defect-list-view";
import { StatusCounts } from "@/components/defects/status-counts";
import { Icon } from "@/components/icon";
import { clampPage, countByStatus, sortByReported, PAGE_SIZE, type SortDir } from "@/lib/defects";
import { getDefects } from "@/lib/defects-api";

export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort: SortDir = params.sort === "asc" ? "asc" : "desc";
  const all = await getDefects();
  const counts = countByStatus(all);
  const sorted = sortByReported(all, sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = clampPage(params.page, pageCount);

  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <div className="page-head">
        <h1>Defects</h1>
        <Link className="btn btn-primary" href="/defects/new">
          <Icon name="plus" />
          New defect
        </Link>
      </div>
      <StatusCounts counts={counts} />
      <DefectListView defects={sorted} sort={sort} page={page} />
    </div>
  );
}
