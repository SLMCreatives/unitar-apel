import { redirect } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/auth-config";

// Centered shell for the signed-out auth pages (login / signup / pending /
// forbidden). Nests inside the root layout, so the auth-aware header renders
// above it with just the brand while logged out.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nothing to sign in to while auth is off (src/lib/auth-config.ts).
  if (!AUTH_ENABLED) redirect("/");

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
