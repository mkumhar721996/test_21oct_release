import { ApiError, uploadAttachment } from "@/lib/defects-api";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const reporterId = await getCurrentUserId();
  if (!reporterId) return Response.json({ message: "Sign in to attach a file." }, { status: 401 });

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ message: "Choose a file to attach." }, { status: 400 });

  try {
    return Response.json(await uploadAttachment(file, reporterId));
  } catch (err) {
    if (err instanceof ApiError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json(
      { message: "We could not upload that file. Try again or submit without it." },
      { status: 502 },
    );
  }
}
