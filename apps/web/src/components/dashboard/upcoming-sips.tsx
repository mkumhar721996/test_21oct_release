import type { UpcomingSip } from "@/lib/portfolio";

export function UpcomingSips({ sips }: { sips: UpcomingSip[] }) {
  return (
    <section className="card stack stack-sm">
      <h3>Upcoming SIPs</h3>
      <ul className="plain-list">
        {sips.map((s) => (
          <li key={s.id}>
            <div className="li-main">
              <div>{s.name}</div>
              <div className="text-sm text-muted">Next debit {s.nextDebit}</div>
            </div>
            <span className="li-amount">{s.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
