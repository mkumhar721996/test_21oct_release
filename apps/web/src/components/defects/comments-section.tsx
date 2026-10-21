"use client";

import { useRef, useState, type FormEvent } from "react";
import { postComment } from "@/app/defects/[id]/actions";
import { DATE_FORMAT } from "@/components/defects/defect-row";
import { Icon } from "@/components/icon";
import type { DefectComment, PostCommentResult } from "@/lib/defects";

export function CommentsSection({ defectId, initialComments }: { defectId: string; initialComments: DefectComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blank, setBlank] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    let result: PostCommentResult = { ok: false };
    try {
      result = await postComment(defectId, text);
    } catch {
      // transport failure: same inline failure as an API error
    } finally {
      setPending(false);
    }
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
          <input
            id="comment-input"
            ref={inputRef}
            className={`input${failed || blank ? " is-invalid" : ""}`}
            type="text"
            placeholder="Add a comment"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFailed(false);
              setBlank(false);
            }}
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
          <div id="comment-failure" className="alert alert-danger" role="alert">
            <div className="fail-body">
              <Icon name="alert" />
              <div className="text">
                <strong>We couldn&apos;t post your comment.</strong>
                <span>Your text is still here. Check your connection and try again.</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
