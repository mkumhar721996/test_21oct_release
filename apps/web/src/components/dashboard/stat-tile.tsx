import type { ReactNode } from "react";

export function StatTile({
  testId,
  label,
  value,
  primary = false,
  children,
}: {
  testId: string;
  label: string;
  value: ReactNode;
  primary?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`card stat-tile${primary ? " is-primary" : ""}`} data-testid={testId}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {children}
    </div>
  );
}
