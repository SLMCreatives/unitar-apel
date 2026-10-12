-- UNITAR APEL.Q Tracker — let a note's follow-up be marked done.
-- Run this in the Supabase SQL Editor after 0007_learner_updated_at.sql.
--
-- Until now a follow-up could only leave the Dashboard by deleting its note,
-- which also deleted the record of what was done. follow_up_done_at keeps the
-- note and its follow-up date, and marks when the follow-up was closed. Null
-- means still open.
--
-- The app works before this runs: the Dashboard falls back to listing every
-- follow-up, and only the Mark done button reports the missing column.
-- Marking done counts as activity on the learner for lead ageing (the 0007
-- note trigger fires on update).

alter table apel_notes add column if not exists follow_up_done_at timestamptz;
