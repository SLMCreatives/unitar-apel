import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { SECTIONS } from "@/lib/permissions";

export const metadata = { title: "No access — UNITAR APEL.Q Tracker" };

// Shown to a signed-in, active user who tries to reach a section their role
// does not grant. (Distinct from /login, which is for signed-out users.)
export default async function ForbiddenPage() {
  // No sections are restricted while auth is off (src/lib/auth-config.ts).
  if (!AUTH_ENABLED) redirect("/");

  const user = await getCurrentUser();
  // First section this user actually can reach, so "go back" never bounces
  // them straight back here.
  const landing = user
    ? SECTIONS.find((s) => user.isSuperadmin || user.sections.includes(s.key))
    : undefined;

  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-bold text-gray-900">No access</h1>
      <p className="mt-3 text-sm text-gray-600">
        You don&apos;t have permission to view this section. If you need access,
        ask a superadmin to update your role.
      </p>
      {landing ? (
        <Link
          href={landing.href}
          className="mt-5 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to {landing.label}
        </Link>
      ) : (
        <form action={logout} className="mt-5">
          <p className="mb-3 text-xs text-gray-400">
            No sections are assigned to your role yet.
          </p>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}
