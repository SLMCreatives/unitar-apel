// Authentication settings.
//
// APEL signs people in with a 6-digit code emailed to them — it does NOT use
// Supabase Auth, because the Supabase project is shared with another UNITAR app
// (see supabase/migrations/0009_custom_auth.sql). Accounts live in apel_users,
// sessions in apel_sessions; src/lib/auth.ts and src/app/auth/actions.ts hold
// the logic.
//
// Kept in its own module with no imports so it is safe to read from the proxy,
// Server Components and Client Components alike.

// Kill switch. With it false the whole app is open: no login, every section
// visible, every guard passes as a stand-in superadmin (src/lib/auth.ts). Only
// for local development — once migration 0010 has locked the tables, the app
// still reads data with the secret key, so turning this off in production
// would publish every learner record to anyone with the URL.
export const AUTH_ENABLED = true;

// Who may request a sign-in code. Anyone whose email ends in one of these
// domains can sign in; a first sign-in creates a *pending* account that a
// superadmin must activate before it sees any data. Emails that already have a
// row in apel_users may always request a code, whatever their domain — so an
// outside address can be let in by inserting its row in Supabase.
export const ALLOWED_EMAIL_DOMAINS = ["unitar.my"];

// Name of the httpOnly cookie that holds the session token. Read by the proxy
// (presence only) and by src/lib/auth.ts (validated against apel_sessions).
export const SESSION_COOKIE = "apel_session";
