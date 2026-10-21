import { describe, expect, it } from "vitest";
import {
  clampPage,
  countByStatus,
  pageOf,
  validateNewDefect,
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

describe("validateNewDefect", () => {
  it("flags a blank title", () => {
    expect(validateNewDefect({ title: "   " })).toEqual({ title: "Enter a title for the defect." });
  });
  it("accepts a title", () => {
    expect(validateNewDefect({ title: "Crash" })).toEqual({});
  });
});
