import type { ApiHolding, ApiSip, ApiStock, ApiTotals } from "@/lib/portfolio";

export interface DashboardData {
  totals: ApiTotals;
  holdings: ApiHolding[];
  sips: ApiSip[];
  stocks: ApiStock[];
}

async function getJson(path: string): Promise<unknown> {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed with status ${res.status}`);
  return res.json();
}

async function getList<T>(path: string): Promise<T[]> {
  const body = await getJson(path);
  if (!Array.isArray(body)) throw new Error(`GET ${path} returned a non-array body`);
  return body as T[];
}

async function getTotals(): Promise<ApiTotals> {
  const body = await getJson("/portfolio");
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("GET /portfolio returned a non-object body");
  }
  return body as ApiTotals;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [totals, holdings, sips, stocks] = await Promise.all([
    getTotals(),
    getList<ApiHolding>("/holdings"),
    getList<ApiSip>("/sips"),
    getList<ApiStock>("/stocks"),
  ]);
  return { totals, holdings, sips, stocks };
}
