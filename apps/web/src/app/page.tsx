import { SessionCard } from "@/components/auth/session-card";
import { greeting } from "@/lib/greeting";

export default function Home() {
  return (
    <div className="stack">
      <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
        <h1 className="text-3xl font-bold">{greeting()}</h1>
      </div>
      <SessionCard />
    </div>
  );
}
