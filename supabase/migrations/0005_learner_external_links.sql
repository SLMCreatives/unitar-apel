-- UNITAR APEL.Q Tracker — external folder links on learners.
-- Run this in the Supabase SQL Editor after 0004_auth_off_reopen_rls.sql.
--
-- Learners usually have a shared Drive / SharePoint / OneDrive folder holding
-- evidence that is too large or too loosely organised to upload into the
-- apel-documents bucket. This column keeps pointers to those folders next to
-- the learner record.
--
-- Format: plain text, one link per line, optionally labelled with "Label | URL":
--
--   Portfolio evidence | https://drive.google.com/drive/folders/abc123
--   https://unitar.sharepoint.com/sites/apel/Shared%20Documents/xyz
--
-- Parsing and http(s)-only validation live in src/lib/external-links.ts — the
-- column itself is unconstrained so existing notes are never rejected on save.
--
-- No RLS change is needed: policies are per table, not per column, so the
-- existing apel policies already cover this column.

alter table apel add column if not exists external_links text;

comment on column apel.external_links is
  'External folder links, one per line, optionally "Label | URL". Parsed by src/lib/external-links.ts.';
