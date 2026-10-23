import { ConsultantSection } from "@/components/organizations/consultant-section";
import { canViewConsultant, type CurrentUser } from "@/lib/consultant-visibility";
import type { Organization } from "@/lib/organizations";

export function OrganizationDetailPanel({
  organization,
  currentUser,
}: {
  organization: Organization;
  currentUser: CurrentUser;
}) {
  return (
    <div className="stack">
      <div className="card stack stack-sm" data-testid="organization-fields">
        <h1>{organization.name}</h1>
      </div>
      {canViewConsultant(currentUser, organization.id) && <ConsultantSection consultant={organization.consultant} />}
    </div>
  );
}
