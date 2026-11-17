-- UNITAR APEL.Q Tracker — close the APEL tables to the public anon key.
--
-- !! APPLY THIS ONLY AFTER the app is deployed with SUPABASE_SECRET_KEY !!
-- (the email-code login release). The previous release reads and writes with
-- the anon key; the moment this runs, that release stops loading any data.
-- Rollout order:
--   1. Vercel: add SUPABASE_SECRET_KEY, RESEND_API_KEY and EMAIL_FROM
--   2. deploy the release that uses them, and check you can sign in
--   3. run this file in the Supabase SQL Editor
--
-- Why
-- ---
-- Until now (0001/0002/0004) every APEL table had a "tracker anon full access"
-- policy. The anon key is public by design — the other UNITAR app on this
-- Supabase project ships it in its web pages — so anyone could read and edit
-- every learner record straight through the Supabase REST API, whatever the
-- app's login said. The app now talks to Supabase only from the server, with
-- the secret key (service_role), which bypasses RLS. So the anon and
-- authenticated roles need no access to APEL data at all.
--
-- After this, each APEL table has RLS on, no policies, and no grants for anon
-- or authenticated: only the service role can reach it. The same as the
-- apel_users / apel_login_codes / apel_sessions tables from 0009.
--
-- Scope: ONLY the APEL tables. The other app's tables (students, payments, LMS
-- activity, …) and its is_sms_staff() function are not touched.
--
-- Checked before writing: in the Supabase API logs for the 24 hours before
-- this file was written (the project keeps no older logs), every request to
-- apel / apel_advisors came from this app's server (supabase-ssr, user agent
-- "node"). The leftover "Enable … " policies on those two tables predate the
-- tracker; if some other tool still reads them with the anon key, it will stop
-- working here and needs moving to a server-side key too.

do $$
declare
  t text;
  pol record;
  seq text;
begin
  foreach t in array array[
    'apel', 'apel_advisors', 'apel_assessors', 'apel_notes',
    'apel_assignments', 'apel_documents', 'app_roles', 'profiles'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- Every policy on the table: "tracker anon full access" (0001/0002/0004),
    -- the older "Enable read access for all users" / "Enable insert/delete
    -- for authenticated users only" on apel and apel_advisors, and the
    -- 0003 policies on app_roles and profiles.
    for pol in
      select polname from pg_policy where polrelid = format('public.%I', t)::regclass
    loop
      execute format('drop policy %I on public.%I;', pol.polname, t);
    end loop;

    execute format('revoke all on table public.%I from anon, authenticated;', t);

    -- Identity / serial sequence behind the id column, if any.
    seq := pg_get_serial_sequence(format('public.%I', t), 'id');
    if seq is not null then
      execute format('revoke all on sequence %s from anon, authenticated;', seq);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: the private apel-documents bucket. The app uploads and signs
-- download URLs with the secret key, which bypasses storage RLS, so the open
-- policy from 0002/0004 can go. Other buckets' policies are untouched.
-- ---------------------------------------------------------------------------
drop policy if exists "apel documents bucket access" on storage.objects;
drop policy if exists "apel documents authenticated access" on storage.objects;

-- ---------------------------------------------------------------------------
-- Supabase Auth hook from 0003. APEL no longer uses Supabase Auth, but this
-- trigger still fires on every signup to the *other* app and writes an APEL
-- profile row for it. Remove it so APEL has no hook into the shared auth.users.
--
-- Note: 0003 created this trigger with `drop trigger if exists
-- on_auth_user_created`, so if the other app ever had its own trigger by that
-- name, 0003 replaced it. Worth checking the other app's migrations.
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
