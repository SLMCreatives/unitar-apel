// TEMPORARY: authentication kill switch.
//
// Auth is fully built (login/signup, roles, per-section permissions, RLS in
// supabase/migrations/0003) but switched OFF while the app is still being
// developed. With it off the whole app is open: no login, every section
// visible, every guard passes as the bypass user below.
//
// 0003 has already been applied to the live project, so its authenticated-only
// RLS policies had to be reopened for the anon key — see
// supabase/migrations/0004_auth_off_reopen_rls.sql. Both halves matter: the app
// bypass here and the open policies there.
//
// To turn auth back on:
//   1. set AUTH_ENABLED = true here
//   2. re-run supabase/migrations/0003_auth_and_roles.sql in the Supabase SQL
//      editor (it drops the open policies 0004 restored and locks the tables
//      back down)
//   3. sign up with the superadmin email seeded in that migration
//
// Kept in its own module with no imports so it is safe to read from the proxy
// (edge runtime), Server Components and Client Components alike.
export const AUTH_ENABLED = false;
