import { ResetPasswordForm } from "@/components/reset-password-form";
import { SetupNotice, envReady } from "@/components/setup-notice";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Set new password — UNITAR APEL.Q Tracker" };

export default async function ResetPasswordPage() {
  if (!envReady()) return <SetupNotice />;
  // Reachable only with the recovery session created by /auth/confirm. Any
  // signed-in session is fine (even a pending account resetting its password);
  // no session → back to login.
  await requireUser();
  return <ResetPasswordForm />;
}
