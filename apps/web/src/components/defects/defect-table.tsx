import Link from "next/link";
import { Icon } from "@/components/icon";
import { DefectRow } from "@/components/defects/defect-row";
import type { Defect, SortDir } from "@/lib/defects";

interface DefectTableProps {
  rows: Defect[];
  sort: SortDir;
  from: number;
  to: number;
  total: number;
}

export function DefectTable({ rows, sort, from, to, total }: DefectTableProps) {
  const newest = sort === "desc";
  const nextSort: SortDir = newest ? "asc" : "desc";

  return (
    <div className="table-wrap">
      <table className="defect-table">
        <caption
          className="text-sm text-muted"
          style={{ textAlign: "left", padding: "var(--space-2) var(--space-3)" }}
        >
          {`Showing ${from}–${to} of ${total} defects, ${newest ? "newest" : "oldest"} first`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Severity</th>
            <th scope="col">Area</th>
            <th scope="col" aria-sort={newest ? "descending" : "ascending"}>
              <Link
                className="sort-btn"
                href={`/defects?sort=${nextSort}&page=1`}
                aria-label={`Reported date, sorted ${newest ? "newest" : "oldest"} first. Select to reverse.`}
              >
                Reported
                <Icon name="chevron-down" style={newest ? undefined : { transform: "rotate(180deg)" }} />
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((defect) => (
            <DefectRow key={defect.id} defect={defect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
