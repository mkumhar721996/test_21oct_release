"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import { STATUS_LABEL, type Defect, type DefectSeverity, type DefectStatus } from "@/lib/defects";

export const STATUS_BADGE: Record<DefectStatus, { label: string; badge: string; icon: IconName }> = {
  open: { label: STATUS_LABEL.open, badge: "badge-danger", icon: "alert" },
  in_progress: { label: STATUS_LABEL.in_progress, badge: "badge-warning", icon: "loader" },
  closed: { label: STATUS_LABEL.closed, badge: "badge-success", icon: "check" },
};

export const SEVERITY_BADGE: Record<DefectSeverity, { label: string; badge: string }> = {
  low: { label: "Low", badge: "badge-neutral" },
  medium: { label: "Medium", badge: "badge-neutral" },
  high: { label: "High", badge: "badge-warning" },
  critical: { label: "Critical", badge: "badge-danger" },
};

export const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function DefectRow({ defect }: { defect: Defect }) {
  const router = useRouter();
  const href = `/defects/${defect.id}`;
  const status = STATUS_BADGE[defect.status];
  const severity = SEVERITY_BADGE[defect.severity];

  return (
    <tr
      onClick={(e) => {
        // The title link navigates itself; don't push a second time.
        if ((e.target as Element).closest("a")) return;
        router.push(href);
      }}
    >
      <td className="title">
        <Link className="row-link" href={href}>
          {defect.title}
        </Link>
        <div className="text-sm text-muted">{defect.id}</div>
      </td>
      <td>
        <span className={`badge ${status.badge}`}>
          <Icon name={status.icon} /> {status.label}
        </span>
      </td>
      <td>
        <span className={`badge ${severity.badge}`}>{severity.label}</span>
      </td>
      <td>{defect.area}</td>
      <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
        {DATE_FORMAT.format(new Date(defect.reportedAt))}
      </td>
    </tr>
  );
}
