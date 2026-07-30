-- UNITAR APEL.Q Tracker — TEMPORARY: reopen the tracker tables while auth off.
-- Run this in the Supabase SQL Editor.
--
-- Why this exists
-- ---------------
-- Migration 0003 was applied to this project, so every tracker table now has
-- the "active users full access" policy, which is granted `to authenticated`
-- only. With auth switched off in the app (AUTH_ENABLED in
-- src/lib/auth-config.ts) all requests use the public anon key, which that
-- policy can never satisfy — so saving a learner fails with:
--
--   new row violates row-level security policy for table "apel"
--
-- Reads kept working only because of a separate read-only policy left over on
-- these tables, which made the breakage look write-only.
--
-- This migration restores the open anon policies from 0001/0002 so the app runs
-- without login again. It is the exact inverse of 0003's data-table lockdown;
-- the profiles / app_roles policies from 0003 are left alone since those tables
-- are unused while auth is off.
--
-- WARNING: while these policies are in place, anyone holding the public anon
-- key can read and write all learner data. This is only acceptable because the
-- app is not exposed yet. To lock it back down: set AUTH_ENABLED = true and
-- re-run 0003_auth_and_roles.sql, which drops these policies again.

-- ---------------------------------------------------------------------------
-- Tracker tables: drop 0003's authenticated-only policy, restore open access.
-- Policies are OR'd, so any other leftover read-only policy on these tables is
-- harmless once a permissive "for all" policy exists.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'apel', 'apel_advisors', 'apel_assessors', 'apel_notes',
    'apel_assignments', 'apel_documents'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "active users full access" on %I;', t);
    execute format('drop policy if exists "tracker anon full access" on %I;', t);
    execute format(
      'create policy "tracker anon full access" on %I
         for all using (true) with check (true);', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: reopen the private apel-documents bucket so uploads and signed-URL
-- downloads work with the anon key (inverse of 0003, matches 0002).
-- ---------------------------------------------------------------------------
drop policy if exists "apel documents authenticated access" on storage.objects;
drop policy if exists "apel documents bucket access" on storage.objects;
create policy "apel documents bucket access" on storage.objects
  for all
  using (bucket_id = 'apel-documents')
  with check (bucket_id = 'apel-documents');
