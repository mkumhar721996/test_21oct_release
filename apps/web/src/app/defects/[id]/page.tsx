import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DefectDetailView } from "@/components/defects/defect-detail-view";
import { getAssignablePeople, getDefect, getViewer } from "@/lib/defects-api";
import { canManageDefect } from "@/lib/defects";

export default async function DefectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await headers()).get("cookie") ?? undefined;
  const [defect, viewer] = await Promise.all([getDefect(id), getViewer(cookie)]);
  if (!defect) notFound();
  const people = canManageDefect(viewer) ? await getAssignablePeople(cookie) : [];
  return <DefectDetailView defect={defect} viewer={viewer} people={people} />;
}
