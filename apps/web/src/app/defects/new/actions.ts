"use server";

import { redirect } from "next/navigation";
import { validateNewDefect, type DefectSeverity } from "@/lib/defects";
import { createDefect } from "@/lib/defects-api";
import { getCurrentUserId } from "@/lib/session";

export type NewDefectState = {
  errors: { title?: string; form?: string };
  values: { title: string; severity: string; area: string; steps: string; attachmentId?: string };
};

const text = (data: FormData, key: string) => {
  const v = data.get(key);
  return typeof v === "string" ? v : "";
};

export async function createDefectAction(_prev: NewDefectState, formData: FormData): Promise<NewDefectState> {
  const values: NewDefectState["values"] = {
    title: text(formData, "title"),
    severity: text(formData, "severity") || "medium",
    area: text(formData, "area"),
    steps: text(formData, "steps"),
  };
  const attachmentId = text(formData, "attachmentId");
  if (attachmentId) values.attachmentId = attachmentId;

  const errors = validateNewDefect(values);
  if (errors.title) return { errors, values };

  const reporterId = await getCurrentUserId();
  if (!reporterId) return { errors: { form: "Sign in to report a defect." }, values };

  let id: string;
  try {
    ({ id } = await createDefect(
      { ...values, title: values.title.trim(), severity: values.severity as DefectSeverity },
      reporterId,
    ));
  } catch (err) {
    console.error("Creating the defect failed", err);
    return { errors: { form: "We could not submit the defect. Try again in a moment." }, values };
  }
  redirect(`/defects/${id}`);
}
