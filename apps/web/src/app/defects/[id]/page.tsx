import { notFound } from "next/navigation";
import { DefectDetailView } from "@/components/defects/defect-detail-view";
import { getDefect } from "@/lib/defects-api";

export default async function DefectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const defect = await getDefect(id);
  if (!defect) notFound();
  return <DefectDetailView defect={defect} />;
}
