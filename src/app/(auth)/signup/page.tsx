import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { SetupNotice, envReady } from "@/components/setup-notice";

export const metadata = { title: "Sign up — UNITAR APEL.Q Tracker" };

export default function SignupPage() {
  if (!envReady()) return <SetupNotice />;
  return <AuthForm mode="signup" action={signup} />;
}
