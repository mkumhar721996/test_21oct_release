export function DashboardSkeleton() {
  return (
    <div className="stack stack-lg" aria-busy="true">
      <h1>Dashboard</h1>
      <div className="summary">
        {["40%", "60%", "60%"].map((width, i) => (
          <div key={i} className="card stat-tile">
            <span className="skeleton sk-line" style={{ width }} />
            <span className="skeleton sk-big" />
          </div>
        ))}
      </div>
      <div className="lower">
        {[3, 4].map((lines) => (
          <div key={lines} className="card">
            {Array.from({ length: lines }, (_, i) => (
              <span key={i} className="skeleton sk-line" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
