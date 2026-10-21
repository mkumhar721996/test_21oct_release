import { Breadcrumbs } from "@/components/breadcrumbs";
import { NewDefectForm } from "@/components/defects/new-defect-form";

export default function NewDefectPage() {
  return (
    <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
      <Breadcrumbs items={[{ label: "Defects", href: "/defects" }, { label: "New defect" }]} />
      <h1>New defect</h1>
      <NewDefectForm />
    </div>
  );
}
