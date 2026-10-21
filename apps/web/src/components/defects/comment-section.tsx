"use client";

import { useRef, useState, type FormEvent } from "react";
import { postCommentAction } from "@/app/defects/[id]/actions";
import { DATE_FORMAT } from "@/components/defects/defect-row";
import type { DefectComment } from "@/lib/defects";

export function CommentSection({ defectId, initialComments }: { defectId: string; initialComments: DefectComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blank, setBlank] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFailed(false);
    if (!text.trim()) {
      setBlank(true);
      return;
    }
    setBlank(false);
    setPending(true);
    const result = await postCommentAction(defectId, text);
    setPending(false);
    if (result.ok) {
      setComments((prev) => [...prev, result.comment]);
      setText("");
      inputRef.current?.focus();
    } else {
      setFailed(true);
    }
  }

  return (
    <section className="card stack stack-sm" aria-labelledby="comments-title">
      <h2 id="comments-title" className="card-title">
        Comments
      </h2>
      {comments.length ? (
        <ul className="stack stack-sm">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="text-sm text-muted">
                <span className="text-bold">{c.author}</span> · {DATE_FORMAT.format(new Date(c.createdAt))}
              </div>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No comments yet</p>
      )}
      <form className="stack stack-sm" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="comment-input">Add a comment</label>
          <textarea
            id="comment-input"
            ref={inputRef}
            className={`textarea${failed || blank ? " is-invalid" : ""}`}
            placeholder="Add a comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={failed || blank}
            aria-describedby={failed ? "comment-failure" : blank ? "comment-blank" : undefined}
          />
          {blank && (
            <span id="comment-blank" className="field-error">
              Write a comment before posting.
            </span>
          )}
        </div>
        <div>
          <button type="submit" className="btn btn-secondary" disabled={pending} aria-busy={pending}>
            {pending ? "Posting…" : "Post comment"}
          </button>
        </div>
        {failed && (
          <div id="comment-failure" role="alert" className="alert alert-danger">
            We couldn&apos;t post your comment. Your text is still here — check your connection and try again.
          </div>
        )}
      </form>
    </section>
  );
}
