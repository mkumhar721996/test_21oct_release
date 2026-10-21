"use server";

import { postComment } from "@/lib/defects-api";
import type { DefectComment } from "@/lib/defects";

export type PostCommentResult = { ok: true; comment: DefectComment } | { ok: false };

export async function postCommentAction(id: string, body: string): Promise<PostCommentResult> {
  const text = body.trim();
  if (!text) return { ok: false };
  try {
    return { ok: true, comment: await postComment(id, text) };
  } catch {
    return { ok: false };
  }
}
