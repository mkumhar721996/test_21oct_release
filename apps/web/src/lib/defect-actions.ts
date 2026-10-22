import type { DefectDetail, DefectStatus } from "@/lib/defects";

export type SaveFailure = "conflict" | "forbidden" | "unauthenticated" | "failed";

export type SaveResult =
  | { ok: true; defect: DefectDetail }
  | { ok: false; kind: SaveFailure; defect?: DefectDetail };

const KINDS: SaveFailure[] = ["conflict", "forbidden", "unauthenticated", "failed"];

export async function saveDefectChange(
  id: string,
  change: { assignee?: string | null; status?: DefectStatus },
  version: number,
): Promise<SaveResult> {
  try {
    const res = await fetch(`/api/defects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...change, version }),
    });
    const body = await res.json();
    if (res.ok) return { ok: true, defect: body as DefectDetail };
    const kind: SaveFailure = KINDS.includes(body?.kind) ? body.kind : "failed";
    return body?.defect ? { ok: false, kind, defect: body.defect } : { ok: false, kind };
  } catch {
    return { ok: false, kind: "failed" };
  }
}
