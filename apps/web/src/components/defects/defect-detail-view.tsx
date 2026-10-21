import Link from "next/link";
import { DATE_FORMAT, SEVERITY_BADGE, STATUS_BADGE } from "@/components/defects/defect-row";
import { Icon } from "@/components/icon";
import type { DefectDetail } from "@/lib/defects";

export function DefectDetailView({ defect }: { defect: DefectDetail }) {
  const status = STATUS_BADGE[defect.status];
  const severity = SEVERITY_BADGE[defect.severity];

  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/defects">Defects</Link> / <span>{defect.id}</span>
      </nav>
      <div className="page-head">
        <h1>{`${defect.id} ${defect.title}`}</h1>
        <Link className="btn btn-ghost" href="/defects">
          <Icon name="chevron-left" />
          Back to list
        </Link>
      </div>
      <div className="stack stack-sm">
        <div>
          <span className={`badge ${status.badge}`}>
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
