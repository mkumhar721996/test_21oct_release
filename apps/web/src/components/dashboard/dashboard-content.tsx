import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LoadFailure } from "@/components/defects/load-failure";
import { getDashboardData, type DashboardData } from "@/lib/portfolio-api";

export async function DashboardContent() {
  let data: DashboardData | null = null;
  try {
    data = await getDashboardData();
  } catch {
    data = null;
  }
  if (data === null) {
    return (
      <div className="stack stack-lg">
        <h1>Dashboard</h1>
        <LoadFailure
          title="We couldn't load your dashboard."
          detail="The server didn't respond. Your portfolio is safe. Check your connection and try again."
          retriedDetail="It still didn't load. Wait a moment and try again."
          loadingLabel="Loading dashboard"
        />
      </div>
    );
  }
  return <DashboardView {...data} now={new Date()} />;
}
