import type { Organization } from "@/lib/organizations";

const MISSING = "—";

export function ConsultantSection({ consultant }: { consultant: Organization["consultant"] }) {
  return (
    <section className="card stack stack-sm" aria-labelledby="consultant-title">
      <h2 id="consultant-title">Fundraising Consultant</h2>
      {consultant ? (
        <dl className="stack stack-sm">
          <div>
            <dt className="text-muted">Name</dt>
            <dd data-testid="consultant-name">{consultant.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd data-testid="consultant-email">{consultant.email ?? MISSING}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd data-testid="consultant-phone">{consultant.phone ?? MISSING}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-muted">Unassigned</p>
      )}
    </section>
  );
}
