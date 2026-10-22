import { ASSIGN_ROLES, type Defect, type DefectDetail, type Person, type Viewer } from "@/lib/defects";

export async function getViewer(cookie?: string): Promise<Viewer | null> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${base}/session`, { cache: "no-store", headers: cookie ? { cookie } : {} });
    if (!res.ok) return null;
    return (await res.json()) as Viewer;
  } catch {
    return null;
  }
}

export async function getAssignablePeople(cookie?: string): Promise<Person[]> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${base}/people?roles=${ASSIGN_ROLES.join(",")}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : {},
    });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    return Array.isArray(body) ? (body as Person[]) : [];
  } catch {
    return [];
  }
}

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
