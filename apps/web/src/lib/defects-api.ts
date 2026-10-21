import type { Defect } from "@/lib/defects";

export async function getDefects(): Promise<Defect[]> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const res = await fetch(`${base}/defects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /defects failed with status ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("GET /defects returned a non-array body");
  return body as Defect[];
}
