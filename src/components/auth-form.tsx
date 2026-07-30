"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthFormState } from "@/app/auth/actions";

const INPUT_CLASS =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

type Action = (
  state: AuthFormState,
  formData: FormData
) => Promise<AuthFormState>;

// Shared login / signup card. `mode` toggles the extra name field, button
// label and the footer link.
export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    undefined
  );
  const isSignup = mode === "signup";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 text-center">
        <h1 className="text-lg font-bold text-gray-900">
          {isSignup ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          UNITAR APEL.Q Tracker
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {isSignup && (
          <div>
            <label htmlFor="full_name" className="mb-1 block text-xs font-medium text-gray-600">
              Full name
            </label>
            <input id="full_name" name="full_name" type="text" autoComplete="name" className={INPUT_CLASS} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-600">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-medium text-gray-600">
              Password
            </label>
            {!isSignup && (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={INPUT_CLASS}
          />
          {isSignup && (
            <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
          )}
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {pending
            ? isSignup
              ? "Creating account…"
              : "Signing in…"
            : isSignup
              ? "Sign up"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
