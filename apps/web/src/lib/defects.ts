export const PAGE_SIZE = 20;

export type DefectStatus = "open" | "in_progress" | "closed";
export type DefectSeverity = "low" | "medium" | "high" | "critical";
export type SortDir = "desc" | "asc";

export interface Defect {
  id: string;
  title: string;
  status: DefectStatus;
  severity: DefectSeverity;
  area: string;
  reportedAt: string;
}

export interface DefectAttachment {
  name: string;
  url: string;
}

export interface DefectComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export type PostCommentResult = { ok: true; comment: DefectComment } | { ok: false };

export interface DefectDetail extends Defect {
  description: string;
  assignee: string | null;
  attachments: DefectAttachment[];
  comments: DefectComment[];
}

export interface StatusCounts {
  open: number;
  inProgress: number;
  closed: number;
}

export function countByStatus(all: Defect[]): StatusCounts {
  const counts: StatusCounts = { open: 0, inProgress: 0, closed: 0 };
  for (const defect of all) {
    if (defect.status === "open") counts.open += 1;
    else if (defect.status === "in_progress") counts.inProgress += 1;
    else if (defect.status === "closed") counts.closed += 1;
  }
  return counts;
}

export function sortByReported(all: Defect[], dir: SortDir): Defect[] {
  const sign = dir === "desc" ? -1 : 1;
  return all
    .map((defect, index) => ({ defect, index }))
    .sort(
      (a, b) =>
        sign * (Date.parse(a.defect.reportedAt) - Date.parse(b.defect.reportedAt)) ||
        a.index - b.index,
    )
    .map((entry) => entry.defect);
}

export function pageOf<T>(all: T[], page: number, size: number = PAGE_SIZE) {
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  const rows = all.slice(start, start + size);
  return {
    rows,
    page: current,
    pageCount,
    from: rows.length ? start + 1 : 0,
    to: start + rows.length,
    total,
  };
}

export function clampPage(raw: string | undefined, pageCount: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, pageCount));
}

export const SEVERITIES: readonly DefectSeverity[] = ["low", "medium", "high", "critical"];
export const AREAS = ["Login", "Billing", "Reports", "Other"] as const;

export interface DefectFilters {
  q: string;
  statuses: DefectStatus[];
  severity: DefectSeverity | "";
  area: string;
}

export const EMPTY_FILTERS: DefectFilters = { q: "", statuses: [], severity: "", area: "" };

export function hasActiveFilters(f: DefectFilters): boolean {
  return f.q.trim() !== "" || f.statuses.length > 0 || f.severity !== "" || f.area !== "";
}

export function filterDefects(all: Defect[], f: DefectFilters): Defect[] {
  const q = f.q.trim().toLowerCase();
  return all.filter(
    (d) =>
      (q === "" || d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)) &&
      (f.statuses.length === 0 || f.statuses.includes(d.status)) &&
      (f.severity === "" || d.severity === f.severity) &&
      (f.area === "" || d.area === f.area),
  );
}
