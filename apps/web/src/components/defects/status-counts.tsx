import { Icon, type IconName } from "@/components/icon";
import type { StatusCounts as Counts } from "@/lib/defects";

export function StatusCounts({ counts }: { counts: Counts }) {
  const tiles: { id: string; label: string; icon: IconName; value: number }[] = [
    { id: "open", label: "Open", icon: "alert", value: counts.open },
    { id: "in-progress", label: "In progress", icon: "loader", value: counts.inProgress },
    { id: "closed", label: "Closed", icon: "check", value: counts.closed },
  ];

  return (
    <section aria-label="Defect counts">
      <div className="count-grid">
        {tiles.map((tile) => (
          <div className="card count-tile" key={tile.id}>
            <span className="count-num">{tile.value}</span>
            <span className="count-label">
              <Icon name={tile.icon} />
              <span>{tile.label}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
