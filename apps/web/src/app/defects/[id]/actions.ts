"use server";

import type { PostCommentResult } from "@/lib/defects";
import { postDefectComment } from "@/lib/defects-api";

export async function postComment(defectId: string, body: string): Promise<PostCommentResult> {
  const text = body.trim();
  if (!text) return { ok: false };
  try {
    return { ok: true, comment: await postDefectComment(defectId, text) };
  } catch (error) {
    console.error(`Posting a comment on ${defectId} failed`, error);
    return { ok: false };
  }
}
