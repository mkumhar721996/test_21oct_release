import { SignInForm } from "@/components/auth/sign-in-form";

const NOTICES: Record<string, string> = {
  "signed-out": "You have been signed out",
  idle: "You were signed out after 30 minutes of inactivity. Sign in again to continue.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const notice = reason ? NOTICES[reason] : undefined;

  return (
    <div className="signin-wrap">
      <SignInForm />
      {notice ? (
        <div className="toast is-open" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
