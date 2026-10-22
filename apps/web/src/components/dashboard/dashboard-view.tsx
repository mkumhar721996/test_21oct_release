import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UpcomingSips } from "@/components/dashboard/upcoming-sips";
import { formatInr, formatSignedInr, toHoldingRows, toUpcomingSips, todaysChange } from "@/lib/portfolio";
import type { DashboardData } from "@/lib/portfolio-api";

export function DashboardView({ totals, holdings, sips, stocks, now }: DashboardData & { now: Date }) {
  const change = todaysChange(holdings, totals.currentValue);
  const sign = change.direction === "up" ? "+" : change.direction === "down" ? "−" : "";
  const percent = `${sign}${Math.abs(change.percent).toFixed(2)}%`;
  const tone = change.direction === "flat" ? undefined : change.direction;
  return (
    <div className="stack stack-lg">
      <h1>Dashboard</h1>
      <section className="summary" aria-label="Portfolio summary">
        <StatTile testId="portfolio-value" label="Portfolio value" value={formatInr(totals.currentValue)} primary />
        <StatTile
          testId="todays-change"
          label="Today's change"
          value={
            <span className={tone}>
              {tone && <><span aria-hidden="true">{tone === "up" ? "▲" : "▼"}</span>{" "}</>}
              {formatSignedInr(change.amount)}
            </span>
          }
        >
          <span className={tone ? `stat-sub ${tone}` : "stat-sub"}>{percent} today</span>
        </StatTile>
        <StatTile testId="active-sips" label="Active SIPs" value={sips.length} />
      </section>
      <div className="lower">
        <UpcomingSips sips={toUpcomingSips(sips, stocks, now)} />
        <HoldingsTable rows={toHoldingRows(holdings, stocks)} />
      </div>
    </div>
  );
}
