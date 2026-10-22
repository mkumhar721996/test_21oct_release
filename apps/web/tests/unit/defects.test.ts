import { describe, expect, it } from "vitest";
import {
  ASSIGN_ROLES,
  STATUS_OPTIONS,
  canManageDefect,
  AREAS,
  EMPTY_FILTERS,
  SEVERITIES,
  clampPage,
  filterDefects,
  hasActiveFilters,
  type DefectFilters,
  countByStatus,
  pageOf,
  sortByReported,
  type Defect,
  type DefectStatus,
} from "@/lib/defects";

let seq = 0;
function d(status: DefectStatus = "open", reportedAt = "2026-10-01"): Defect {
  seq += 1;
  return { id: `DEF-${seq}`, title: `Defect ${seq}`, status, severity: "low", area: "Login", reportedAt };
}
function make(n: number): Defect[] {
  return Array.from({ length: n }, (_, i) => d("open", `2026-09-${String((i % 28) + 1).padStart(2, "0")}`));
}

describe("countByStatus", () => {
  it("counts each status across all defects", () => {
    const all = [d("open"), d("open"), d("in_progress"), d("closed"), d("closed"), d("closed")];
    expect(countByStatus(all)).toEqual({ open: 2, inProgress: 1, closed: 3 });
  });
});

describe("sortByReported", () => {
  it("puts the newest first for desc", () => {
    const old = d("open", "2026-01-01");
    const newest = d("open", "2026-10-20");
    const mid = d("open", "2026-05-05");
    expect(sortByReported([old, newest, mid], "desc")[0].id).toBe(newest.id);
    expect(sortByReported([old, newest, mid], "asc")[0].id).toBe(old.id);
  });

  it("keeps input order for equal dates and does not mutate", () => {
    const a = d("open", "2026-02-02");
    const b = d("open", "2026-02-02");
    const input = [a, b];
    expect(sortByReported(input, "desc").map((x) => x.id)).toEqual([a.id, b.id]);
    expect(input).toEqual([a, b]);
  });
});

describe("pageOf", () => {
  it("returns 20 rows of 3 pages for 45 defects", () => {
    const p = pageOf(make(45), 1);
    expect(p.rows).toHaveLength(20);
    expect(p.pageCount).toBe(3);
    expect([p.from, p.to, p.total]).toEqual([1, 20, 45]);
  });

  it("pages 21 defects as 20 + 1 with every defect once", () => {
    const sorted = sortByReported(make(21), "desc");
    const p1 = pageOf(sorted, 1);
    const p2 = pageOf(sorted, 2);
    expect([p1.rows.length, p2.rows.length]).toEqual([20, 1]);
    expect(new Set([...p1.rows, ...p2.rows].map((r) => r.id)).size).toBe(21);
    expect([p2.from, p2.to]).toEqual([21, 21]);
  });

  it("handles an empty list", () => {
    const p = pageOf([], 1);
    expect(p.rows).toEqual([]);
    expect(p.pageCount).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps to the valid range", () => {
    expect(clampPage("99", 3)).toBe(3);
    expect(clampPage("abc", 3)).toBe(1);
    expect(clampPage(undefined, 3)).toBe(1);
    expect(clampPage("0", 3)).toBe(1);
    expect(clampPage("2", 3)).toBe(2);
  });
});

describe("filterDefects", () => {
  const mk = (
    id: string,
    title: string,
    status: DefectStatus,
    severity: Defect["severity"],
    area: string,
  ): Defect => ({ id, title, status, severity, area, reportedAt: "2026-10-01" });
  const all: Defect[] = [
    mk("DEF-1", "Login button unresponsive", "open", "high", "Login"),
    mk("DEF-2", "Invoice total wrong", "closed", "high", "Billing"),
    mk("DEF-3", "Report export fails", "open", "medium", "Reports"),
    mk("DEF-4", "Login page typo", "closed", "low", "Login"),
    mk("DEF-5", "Slow dashboard", "in_progress", "critical", "Other"),
    mk("DEF-6", "Billing email late", "open", "low", "Billing"),
  ];

  it("exposes the fixed lists", () => {
    expect(SEVERITIES).toEqual(["low", "medium", "high", "critical"]);
    expect(AREAS).toEqual(["Login", "Billing", "Reports", "Other"]);
  });

  it("returns everything for empty filters, keeping order", () => {
    expect(filterDefects(all, EMPTY_FILTERS)).toEqual(all);
  });

  it("searches title or id, trimmed and case-insensitive", () => {
    expect(filterDefects(all, { ...EMPTY_FILTERS, q: "DEF-2" }).map((x) => x.id)).toEqual(["DEF-2"]);
    expect(filterDefects(all, { ...EMPTY_FILTERS, q: "  LOGIN " }).map((x) => x.id)).toEqual(["DEF-1", "DEF-4"]);
  });

  it("filters by status, severity and area", () => {
    expect(filterDefects(all, { ...EMPTY_FILTERS, statuses: ["closed"] })).toHaveLength(2);
    expect(filterDefects(all, { ...EMPTY_FILTERS, severity: "low" }).map((x) => x.id)).toEqual(["DEF-4", "DEF-6"]);
    expect(filterDefects(all, { ...EMPTY_FILTERS, area: "Billing" }).map((x) => x.id)).toEqual(["DEF-2", "DEF-6"]);
  });

  it("ANDs status with severity", () => {
    const r = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["open"], severity: "high" });
    expect(r.map((x) => x.id)).toEqual(["DEF-1"]);
  });

  it("ANDs status with area", () => {
    const r = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["closed"], area: "Login" });
    expect(r.map((x) => x.id)).toEqual(["DEF-4"]);
  });

  it("ANDs search with every filter", () => {
    const f: DefectFilters = { q: "report", statuses: ["open"], severity: "medium", area: "Reports" };
    expect(filterDefects(all, f).map((x) => x.id)).toEqual(["DEF-3"]);
    expect(filterDefects(all, { ...f, area: "Login" })).toEqual([]);
  });

  it("treats several statuses as OR", () => {
    const r = filterDefects(all, { ...EMPTY_FILTERS, statuses: ["open", "closed"] });
    expect(r.some((x) => x.status === "in_progress")).toBe(false);
    expect(r).toHaveLength(5);
  });

  it("reports active filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "   " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, statuses: ["open"] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, severity: "low" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, area: "Login" })).toBe(true);
  });
});

describe("canManageDefect", () => {
  it("allows any one of tester, manager or lead", () => {
    for (const role of ASSIGN_ROLES) expect(canManageDefect({ name: "x", roles: [role] })).toBe(true);
  });
  it("denies other roles and no viewer", () => {
    expect(canManageDefect({ name: "x", roles: ["developer", "reporter"] })).toBe(false);
    expect(canManageDefect(null)).toBe(false);
  });
  it("offers exactly Open, In progress, Closed", () => {
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(["Open", "In progress", "Closed"]);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(["open", "in_progress", "closed"]);
  });
});
