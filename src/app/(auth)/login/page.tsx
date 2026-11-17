import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SetupNotice, envReady } from "@/components/setup-notice";
import { getCurrentUser, landingPath, safeNextPath } from "@/lib/auth";

export const metadata = { title: "Sign in — UNITAR APEL.Q Tracker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Already signed in → skip the form. This check lives here (with a real
  // session lookup) rather than in the proxy: the proxy only sees whether a
  // cookie exists, and bouncing on a stale cookie would loop with the page
  // guards' redirect back to /login. It runs before the env check because it
  // reads the session cookie, which keeps this page rendered per request.
  const user = await getCurrentUser();
  if (user) {
    redirect(
      user.status === "active"
        ? landingPath(user.sections, user.isSuperadmin)
        : "/pending"
    );
  }

  if (!envReady()) return <SetupNotice />;

  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next) ?? undefined} />;
}
