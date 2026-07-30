import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SetupNotice, envReady } from "@/components/setup-notice";

export const metadata = { title: "Reset password — UNITAR APEL.Q Tracker" };

export default function ForgotPasswordPage() {
  if (!envReady()) return <SetupNotice />;
  return <ForgotPasswordForm />;
}
