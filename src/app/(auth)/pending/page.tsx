import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Awaiting approval — UNITAR APEL.Q Tracker" };

export default async function PendingPage() {
  const user = await getCurrentUser();

  // Already approved — nothing to wait for.
  if (user?.status === "active") redirect("/dashboard");

  const disabled = user?.status === "disabled";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-bold text-gray-900">
        {disabled ? "Account disabled" : "Awaiting approval"}
      </h1>
      <p className="mt-3 text-sm text-gray-600">
        {disabled
          ? "Your account has been disabled. Contact an administrator if you think this is a mistake."
          : "Your account has been created but needs to be approved by an administrator before you can access the tracker. You'll be able to sign in once a superadmin activates your account and assigns a role."}
      </p>
      {user?.email && (
        <p className="mt-3 text-xs text-gray-400">Signed in as {user.email}</p>
      )}
      <form action={logout} className="mt-5">
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
