import Link from "next/link";
import { Icon } from "@/components/icon";

export function EmptyState() {
  return (
    <div className="empty-state" data-wf-id="no-defects">
      <Icon name="info" />
      <h2>No defects reported yet.</h2>
      <p>Found something that isn&apos;t working? Report the first defect and it will show up here for everyone to follow.</p>
      <Link className="btn btn-primary" href="/defects/new" data-wf-id="report-first">
        <Icon name="plus" />
        Report a defect
      </Link>
    </div>
  );
}
