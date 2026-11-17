"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/auth/actions";

const INPUT_CLASS =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const PRIMARY_BUTTON =
  "w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60";

const LINK_BUTTON =
  "text-sm font-medium text-blue-600 hover:underline disabled:opacity-60";

// Two-step sign-in card: email → 6-digit code. All state lives in the
// `signIn` server action's return value; the buttons' `intent` value tells it
// which step to run.
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    { step: "email" }
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 text-center">
        <h1 className="text-lg font-bold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">UNITAR APEL.Q Tracker</p>
      </div>

      {state.step === "email" ? (
        <form key="email" action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="name@unitar.my"
              defaultValue={state.email}
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-gray-400">
              We&apos;ll email you a 6-digit code. No password needed.
            </p>
          </div>

          {state.error && <ErrorText>{state.error}</ErrorText>}

          <button
            type="submit"
            name="intent"
            value="request"
            disabled={pending}
            className={PRIMARY_BUTTON}
          >
            {pending ? "Sending code…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form key="code" action={formAction} className="space-y-4">
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="is_new" value={state.isNew ? "1" : "0"} />
          {next && <input type="hidden" name="next" value={next} />}

          <p className="text-sm text-gray-600">
            We sent a code to{" "}
            <span className="font-medium text-gray-900">{state.email}</span>. It
            expires in 10 minutes.
          </p>

          <div>
            <label
              htmlFor="code"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\s*(\d\s*){6}"
              maxLength={9}
              className={`${INPUT_CLASS} text-center font-mono text-lg tracking-[0.4em]`}
            />
          </div>

          {state.isNew && (
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Your name <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                defaultValue={state.fullName}
                className={INPUT_CLASS}
              />
              <p className="mt-1 text-xs text-gray-400">
                First time here: an administrator will approve your account
                after you sign in.
              </p>
            </div>
          )}

          {state.notice && !state.error && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              {state.notice}
            </p>
          )}
          {state.error && <ErrorText>{state.error}</ErrorText>}

          {/* First submit button = the one Enter triggers. */}
          <button
            type="submit"
            name="intent"
            value="verify"
            disabled={pending}
            className={PRIMARY_BUTTON}
          >
            {pending ? "Checking…" : "Sign in"}
          </button>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              name="intent"
              value="resend"
              formNoValidate
              disabled={pending}
              className={LINK_BUTTON}
            >
              Send a new code
            </button>
            <button
              type="submit"
              name="intent"
              value="change-email"
              formNoValidate
              disabled={pending}
              className={LINK_BUTTON}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}
