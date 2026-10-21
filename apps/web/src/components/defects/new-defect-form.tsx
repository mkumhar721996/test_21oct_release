"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { createDefectAction, type NewDefectState } from "@/app/defects/new/actions";
import { Icon } from "@/components/icon";

const SEVERITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];
const AREAS = ["Login", "Billing", "Reports", "Other"];
const UPLOAD_FAILED = "We could not upload that file. Try again or submit without it.";

const EMPTY: NewDefectState = {
  errors: {},
  values: { title: "", severity: "medium", area: "", steps: "" },
};

export function NewDefectForm({ initial = EMPTY }: { initial?: NewDefectState }) {
  const [state, formAction, submitting] = useActionState(createDefectAction, initial);
  // Controlled fields: a failed submit or upload re-renders with what the person typed.
  const [title, setTitle] = useState(initial.values.title);
  const [severity, setSeverity] = useState(initial.values.severity);
  const [area, setArea] = useState(initial.values.area);
  const [steps, setSteps] = useState(initial.values.steps);
  const [attachmentId, setAttachmentId] = useState(initial.values.attachmentId ?? "");
  const [fileName, setFileName] = useState("");
  const [attachError, setAttachError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const titleError = state.errors.title;

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setAttachError("");
    setAttachmentId("");
    setFileName("");
    try {
      const body = new FormData();
      body.append("file", file, file.name);
      const res = await fetch("/api/attachments", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        attachmentId?: string;
        name?: string;
        message?: string;
      };
      if (!res.ok || !data.attachmentId) {
        setAttachError(data.message || UPLOAD_FAILED);
      } else {
        setAttachmentId(data.attachmentId);
        setFileName(data.name ?? file.name);
      }
    } catch {
      setAttachError(UPLOAD_FAILED);
    } finally {
      setUploading(false);
      // Reset so choosing the same file again still fires a change event.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <form action={formAction} className="stack" noValidate>
      {state.errors.form && (
        <div className="alert alert-danger" role="alert">
          {state.errors.form}
        </div>
      )}
      <div className="field">
        <label htmlFor="defect-title">Title</label>
        <input
          className={`input${titleError ? " is-invalid" : ""}`}
          id="defect-title"
          name="title"
          placeholder="Short summary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "title-error" : undefined}
        />
        {titleError && (
          <p className="field-error" id="title-error" role="alert">
            {titleError}
          </p>
        )}
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label">Severity</legend>
        <div className="cluster">
          {SEVERITIES.map((s) => (
            <label key={s.id} className="cluster" style={{ gap: "var(--space-1)" }}>
              <input
                className="radio"
                type="radio"
                name="severity"
                value={s.id}
                checked={severity === s.id}
                onChange={() => setSeverity(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="defect-area">Area</label>
        <select
          className="select"
          id="defect-area"
          name="area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        >
          <option value="">Choose an area</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="defect-steps">Steps to reproduce</label>
        <textarea
          className="textarea"
          id="defect-steps"
          name="steps"
          placeholder="What did you do?"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="cluster">
          <button
            className="btn btn-secondary"
            id="attach-file"
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-describedby={attachError ? "attach-error" : undefined}
          >
            Attach file
          </button>
          {uploading && <span className="spinner" role="status" aria-label="Uploading file" />}
          {fileName && <span>{fileName}</span>}
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          aria-label="Attach file input"
          tabIndex={-1}
          onChange={(e) => void onFileChosen(e.target.files?.[0])}
        />
        <input type="hidden" name="attachmentId" value={attachmentId} />
        {attachError && (
          <p className="field-error" id="attach-error" role="alert">
            {attachError}
          </p>
        )}
      </div>

      <div className="cluster form-actions">
        <Link className="btn btn-ghost" href="/defects">
          Cancel
        </Link>
        <button className="btn btn-primary" type="submit" disabled={submitting || uploading}>
          {submitting ? (
            <>
              <Icon name="loader" />
              Submitting…
            </>
          ) : (
            "Submit defect"
          )}
        </button>
      </div>
    </form>
  );
}
