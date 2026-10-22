import type { HoldingRow } from "@/lib/portfolio";

/** Display only: rows carry no links, buttons, tab stops or hover styling. */
export function HoldingsTable({ rows }: { rows: HoldingRow[] }) {
  return (
    <section className="card stack stack-sm">
      <h3>Stocks</h3>
      <div className="holdings-scroll">
        <table className="holdings">
          <thead>
            <tr>
              <th scope="col">Fund or stock</th>
              <th scope="col">Units owned</th>
              <th scope="col">Current value</th>
              <th scope="col">Gain or loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td>{r.name}</td>
                <td>{r.units}</td>
                <td>{r.value}</td>
                <td className={r.direction === "flat" ? undefined : r.direction}>
                  {r.direction !== "flat" && <><span aria-hidden="true">{r.direction === "up" ? "▲" : "▼"}</span>{" "}</>}
                  {r.gain}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
