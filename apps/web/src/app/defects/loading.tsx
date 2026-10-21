export default function Loading() {
  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <div className="page-head">
        <h1>Defects</h1>
      </div>
      <div className="stack stack-sm">
        <div className="table-wrap">
          <table className="defect-table">
            <tbody>
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <span className="skeleton" style={{ height: "var(--size-icon)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className="pager" aria-label="Defect list pages">
          <span className="text-bold" aria-live="polite">
            Loading…
          </span>
        </nav>
      </div>
    </div>
  );
}
