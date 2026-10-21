import type { Defect, NewDefectInput } from "@/lib/defects";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const UPLOAD_FAILED = "We could not upload that file. Try again or submit without it.";

function apiBase() {
  return process.env.API_BASE_URL || "http://localhost:3001";
}

// The service token proves this server is the one vouching for `x-user-id`; it never reaches the browser.
function reporterHeaders(reporterId: string): Record<string, string> {
  return { "x-user-id": reporterId, "x-service-token": process.env.API_SERVICE_TOKEN ?? "" };
}

export async function getDefects(): Promise<Defect[]> {
  const res = await fetch(`${apiBase()}/defects`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /defects failed with status ${res.status}`);
  return (await res.json()) as Defect[];
}

async function messageOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message) return body.message;
  } catch {
    // body was not JSON; use the fallback
  }
  return fallback;
}

export async function createDefect(input: NewDefectInput, reporterId: string): Promise<{ id: string }> {
  const res = await fetch(`${apiBase()}/defects`, {
    method: "POST",
    headers: { "content-type": "application/json", ...reporterHeaders(reporterId) },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, `POST /defects failed with status ${res.status}`);
  return (await res.json()) as { id: string };
}

export async function uploadAttachment(
  file: File,
  reporterId: string,
): Promise<{ attachmentId: string; name: string }> {
  const body = new FormData();
  body.append("file", file, file.name);
  const res = await fetch(`${apiBase()}/defects/attachments`, {
    method: "POST",
    headers: reporterHeaders(reporterId),
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, await messageOf(res, UPLOAD_FAILED));
  return (await res.json()) as { attachmentId: string; name: string };
}
