"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { DATE_FORMAT, SEVERITY_BADGE, STATUS_BADGE } from "@/components/defects/defect-row";
import { Icon } from "@/components/icon";
import { saveDefectChange, type SaveFailure } from "@/lib/defect-actions";
import {
  ASSIGN_ROLES,
  STATUS_OPTIONS,
  canManageDefect,
  type DefectDetail,
  type DefectStatus,
  type Person,
  type Viewer,
} from "@/lib/defects";

type ActionId = "assign" | "status";
type MenuItem = { id: string; label: string; checked: boolean };

const UNASSIGNED_ID = "unassigned";
const HELPER_ID = "defect-actions-hint";

type Message = { tone: string; text: string };

const CONFLICT: Message = {
  tone: "alert-warning",
  text: "Someone else changed this defect. Their change is kept. Review it above, then choose again.",
};
const LOCKED: Message = {
  tone: "alert-warning",
  text: "You can no longer assign this defect or change its status. Sign in again or ask a manager about your role.",
};
const FAILED: Record<ActionId, Message> = {
  assign: { tone: "alert-danger", text: "Couldn't save the assignee. Nothing was changed. Try again." },
  status: { tone: "alert-danger", text: "Couldn't save the status. Nothing was changed. Try again." },
};

function messageFor(action: ActionId, kind: SaveFailure): Message {
  if (kind === "conflict") return CONFLICT;
  if (kind === "failed") return FAILED[action];
  return LOCKED;
}

function ActionMenu({
  label,
  items,
  onSelect,
  onClose,
}: {
  label: string;
  items: MenuItem[];
  onSelect: (id: string) => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const buttons = () => Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);

  useEffect(() => {
    const start = Math.max(0, items.findIndex((item) => item.checked));
    buttons()[start]?.focus();
    // focus once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const group = ref.current?.closest("[data-action-group]");
      if (group && !group.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const onKeyDown = (event: KeyboardEvent) => {
    const all = buttons();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    };
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(all.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      onClose(true);
    } else if (event.key === "Tab") onClose(false);
  };

  return (
    <div ref={ref} className="dropdown-menu is-open" role="menu" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          aria-checked={item.checked}
          className="dropdown-item"
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function DefectDetailView({
  defect: initial,
  viewer = null,
  people = [],
}: {
  defect: DefectDetail;
  viewer?: Viewer | null;
  people?: Person[];
}) {
  const [defect, setDefect] = useState(initial);
  const [open, setOpen] = useState<ActionId | null>(null);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ActionId, Message>>>({});
  const [toast, setToast] = useState("");
  const triggers = useRef<Record<ActionId, HTMLButtonElement | null>>({ assign: null, status: null });

  const allowed = canManageDefect(viewer) && !locked;
  const status = STATUS_BADGE[defect.status];
  const severity = SEVERITY_BADGE[defect.severity];

  const assignItems: MenuItem[] = [
    { id: UNASSIGNED_ID, label: "Unassigned", checked: defect.assignee === null },
    ...people
      .filter((person) => person.roles.some((role) => ASSIGN_ROLES.includes(role)))
      .map((person) => ({ id: person.name, label: person.name, checked: defect.assignee === person.name })),
  ];
  const statusItems: MenuItem[] = STATUS_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    checked: defect.status === option.value,
  }));

  const toggle = (action: ActionId) => {
    setToast("");
    setErrors({});
    setOpen((current) => (current === action ? null : action));
  };

  const close = (action: ActionId) => (restoreFocus: boolean) => {
    setOpen((current) => (current === action ? null : current));
    if (restoreFocus) triggers.current[action]?.focus();
  };

  const choose = async (action: ActionId, id: string) => {
    const change =
      action === "assign"
        ? { assignee: id === UNASSIGNED_ID ? null : id }
        : { status: id as DefectStatus };
    const unchanged = action === "assign" ? change.assignee === defect.assignee : id === defect.status;
    setOpen(null);
    triggers.current[action]?.focus();
    if (unchanged || saving) return;

    setSaving(true);
    setErrors({});
    setToast("");
    const result = await saveDefectChange(defect.id, change, defect.version);
    setSaving(false);
    if (result.ok) {
      setDefect(result.defect);
      setToast(action === "assign" ? "Assignee updated" : "Status updated");
      return;
    }
    if (result.kind === "conflict" && result.defect) setDefect(result.defect);
    if (result.kind === "forbidden" || result.kind === "unauthenticated") setLocked(true);
    setErrors({ [action]: messageFor(action, result.kind) });
  };

  const group = (action: ActionId, buttonLabel: string, buttonClass: string, items: MenuItem[], menuLabel: string) => (
    <div className="stack stack-sm" data-action-group data-testid={`${action}-group`}>
      <div className="dropdown">
        <button
          type="button"
          id={`${action}-defect`}
          ref={(el) => {
            triggers.current[action] = el;
          }}
          className={`btn ${buttonClass}`}
          aria-haspopup="menu"
          aria-expanded={open === action}
          disabled={!allowed}
          aria-disabled={!allowed}
          aria-describedby={canManageDefect(viewer) ? undefined : HELPER_ID}
          onClick={() => toggle(action)}
        >
          {buttonLabel}
        </button>
        {open === action && allowed ? (
          <ActionMenu
            label={menuLabel}
            items={items}
            onSelect={(id) => void choose(action, id)}
            onClose={close(action)}
          />
        ) : null}
      </div>
      {errors[action] ? (
        <div className={`alert ${errors[action]!.tone}`} role="alert">
          {errors[action]!.text}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/defects">Defects</Link> / <span>{defect.id}</span>
      </nav>
      <div className="page-head">
        <h1>{`${defect.id} ${defect.title}`}</h1>
        <div className="cluster" data-testid="actions">
          {group("assign", "Assign", "btn-secondary", assignItems, "Assign to")}
          {group("status", "Change status", "btn-primary", statusItems, "Change status to")}
          <Link className="btn btn-ghost" href="/defects">
            <Icon name="chevron-left" />
            Back to list
          </Link>
        </div>
      </div>
      {canManageDefect(viewer) ? null : (
        <p id={HELPER_ID} className="text-sm text-muted">
          Only testers, managers and leads can assign or change status.
        </p>
      )}
      {toast ? (
        <div className="toast is-open" role="status">
          {toast}
        </div>
      ) : null}
      <div className="stack stack-sm">
        <div>
          <span className={`badge ${status.badge}`} data-testid="defect-status">
            <Icon name={status.icon} /> {status.label}
          </span>{" "}
          <span className={`badge ${severity.badge}`}>{severity.label}</span>
        </div>
        <p className="text-sm">{`Assignee: ${defect.assignee ?? "Unassigned"}`}</p>
        <p className="text-sm">{`Area: ${defect.area}`}</p>
        <p>{defect.description}</p>
      </div>
      <section className="card stack stack-sm" aria-labelledby="attachments-title">
        <h2 id="attachments-title" className="card-title">
          Attachments
        </h2>
        {defect.attachments.length ? (
          <ul>
            {defect.attachments.map((a) => (
              <li key={a.url}>
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No attachments yet</p>
        )}
      </section>
      <section className="card stack stack-sm" aria-labelledby="comments-title">
        <h2 id="comments-title" className="card-title">
          Comments
        </h2>
        {defect.comments.length ? (
          <ul className="stack stack-sm">
            {defect.comments.map((c) => (
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
      </section>
    </div>
  );
}
