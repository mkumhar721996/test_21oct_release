import type { Defect, DefectComment, DefectDetail } from "@/lib/defects";

export async function getDefects(): Promise<Defect[]> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const res = await fetch(`${base}/defects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /defects failed with status ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("GET /defects returned a non-array body");
  return body as Defect[];
}

export async function getDefect(id: string): Promise<DefectDetail | null> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const path = `/defects/${encodeURIComponent(id)}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { cache: "no-store" });
  } catch (cause) {
    throw new Error(`GET ${path} failed`, { cause });
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed with status ${res.status}`);
  return (await res.json()) as DefectDetail;
}

export async function postDefectComment(id: string, body: string): Promise<DefectComment> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const path = `/defects/${encodeURIComponent(id)}/comments`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error(`POST ${path} failed`, { cause });
  }
  if (!res.ok) throw new Error(`POST ${path} failed with status ${res.status}`);
  return (await res.json()) as DefectComment;
}
