import type { Defect, DefectDetail } from "@/lib/defects";

export async function getDefects(): Promise<Defect[]> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const res = await fetch(`${base}/defects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /defects failed with status ${res.status}`);
  return (await res.json()) as Defect[];
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
