import { login } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { SetupNotice, envReady } from "@/components/setup-notice";

export const metadata = { title: "Sign in — UNITAR APEL.Q Tracker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!envReady()) return <SetupNotice />;
  const { error } = await searchParams;

  return (
    <div className="space-y-3">
      {error === "link" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That link was invalid or has expired. Request a new password reset
          below.
        </p>
      )}
      <AuthForm mode="login" action={login} />
    </div>
  );
}
