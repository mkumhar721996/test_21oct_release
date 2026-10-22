import { STATUS_OPTIONS, type DefectDetail } from "@/lib/defects";

type Kind = "conflict" | "forbidden" | "unauthenticated" | "failed";

const outcome = (kind: Kind, status: number, defect?: DefectDetail) =>
  Response.json(defect ? { kind, defect } : { kind }, { status });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let input: { assignee?: unknown; status?: unknown; version?: unknown } | null;
  try {
    input = await req.json();
  } catch {
    return outcome("failed", 400);
  }
  const validStatus =
    input?.status === undefined || STATUS_OPTIONS.some((option) => option.value === input?.status);
  const validAssignee =
    input?.assignee === undefined || input.assignee === null || typeof input.assignee === "string";
  if (!input || typeof input.version !== "number" || !validStatus || !validAssignee) {
    return outcome("failed", 400);
  }
  const change: Record<string, unknown> = { version: input.version };
  if (input.assignee !== undefined) change.assignee = input.assignee;
  if (input.status !== undefined) change.status = input.status;

  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const cookie = req.headers.get("cookie");
  let res: Response;
  try {
    res = await fetch(`${base}/defects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      cache: "no-store",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(change),
    });
  } catch {
    return outcome("failed", 502);
  }
  if (res.ok) return Response.json(await res.json());
  if (res.status === 401) return outcome("unauthenticated", 401);
  if (res.status === 403) return outcome("forbidden", 403);
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    return outcome("conflict", 409, body?.defect);
  }
  return outcome("failed", 502);
}
