import Link from "next/link";
import { Icon } from "@/components/icon";

export default function ReportsPage() {
  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <h1>Reports</h1>
      <div className="empty-state">
        <Icon name="info" />
        <h2>Reports coming soon</h2>
        <p>We&apos;re still building this page. Defect counts are on the Defects page for now.</p>
        <Link className="btn btn-secondary" href="/defects">
          Back to defects
        </Link>
      </div>
    </div>
  );
}
