-- UNITAR APEL.Q Tracker — per-instrument assessment results.
-- Run this in the Supabase SQL Editor after 0005_learner_external_links.sql.
--
-- Learners are graded at each assessment instrument, not once overall. The
-- learner form used to hold a single Assessment Instrument Level with one
-- Status / GPA / CGPA beside it; it now shows a row per instrument, so each
-- instrument needs its own result columns.
--
-- Column names follow the existing milestone columns (portfolio_date,
-- fvv_date, challenge_test_date, capstone_date), so the four instruments are
-- portfolio / fvv / challenge_test / capstone.
--
-- The legacy columns (assessment_instrument_level, result_status, gpa, cgpa)
-- are deliberately NOT dropped. Their values are copied onto the matching
-- instrument below, and the app stops reading them — but they stay on the
-- table so nothing is lost and the backfill can be re-checked or redone.

alter table apel add column if not exists portfolio_result_status text;
alter table apel add column if not exists portfolio_gpa numeric;
alter table apel add column if not exists portfolio_cgpa numeric;

alter table apel add column if not exists fvv_result_status text;
alter table apel add column if not exists fvv_gpa numeric;
alter table apel add column if not exists fvv_cgpa numeric;

alter table apel add column if not exists challenge_test_result_status text;
alter table apel add column if not exists challenge_test_gpa numeric;
alter table apel add column if not exists challenge_test_cgpa numeric;

alter table apel add column if not exists capstone_result_status text;
alter table apel add column if not exists capstone_gpa numeric;
alter table apel add column if not exists capstone_cgpa numeric;

-- ---------------------------------------------------------------------------
-- Backfill: move each learner's single recorded result onto the instrument it
-- was recorded against. coalesce() keeps this safe to re-run — a value already
-- entered per instrument is never overwritten.
-- ---------------------------------------------------------------------------

update apel set
  portfolio_result_status = coalesce(portfolio_result_status, result_status),
  portfolio_gpa           = coalesce(portfolio_gpa, gpa::numeric),
  portfolio_cgpa          = coalesce(portfolio_cgpa, cgpa::numeric)
where assessment_instrument_level = 'PORTFOLIO'
  and (result_status is not null or gpa is not null or cgpa is not null);

update apel set
  fvv_result_status = coalesce(fvv_result_status, result_status),
  fvv_gpa           = coalesce(fvv_gpa, gpa::numeric),
  fvv_cgpa          = coalesce(fvv_cgpa, cgpa::numeric)
where assessment_instrument_level = 'FVV'
  and (result_status is not null or gpa is not null or cgpa is not null);

update apel set
  challenge_test_result_status = coalesce(challenge_test_result_status, result_status),
  challenge_test_gpa           = coalesce(challenge_test_gpa, gpa::numeric),
  challenge_test_cgpa          = coalesce(challenge_test_cgpa, cgpa::numeric)
where assessment_instrument_level = 'CHALLENGE TEST'
  and (result_status is not null or gpa is not null or cgpa is not null);

update apel set
  capstone_result_status = coalesce(capstone_result_status, result_status),
  capstone_gpa           = coalesce(capstone_gpa, gpa::numeric),
  capstone_cgpa          = coalesce(capstone_cgpa, cgpa::numeric)
where assessment_instrument_level = 'CAPSTONE'
  and (result_status is not null or gpa is not null or cgpa is not null);

-- ---------------------------------------------------------------------------
-- Rows the backfill could not place: a result was recorded but the level was
-- blank, or was 'COMPLETED', which is a terminal state rather than one of the
-- four instruments. Guessing an instrument for these would invent data, so
-- they are left alone — their values are still in the legacy columns.
--
-- Run this to see which learners need the results entering by hand:
--
--   select id, name, assessment_instrument_level, result_status, gpa, cgpa
--   from apel
--   where (result_status is not null or gpa is not null or cgpa is not null)
--     and coalesce(assessment_instrument_level, '') not in
--         ('PORTFOLIO', 'FVV', 'CHALLENGE TEST', 'CAPSTONE');
-- ---------------------------------------------------------------------------

do $$
declare
  unplaced int;
begin
  select count(*) into unplaced
  from apel
  where (result_status is not null or gpa is not null or cgpa is not null)
    and coalesce(assessment_instrument_level, '') not in
        ('PORTFOLIO', 'FVV', 'CHALLENGE TEST', 'CAPSTONE');

  if unplaced > 0 then
    raise notice
      '0006: % learner(s) have a result with no matching instrument level. Their values remain in the legacy result_status / gpa / cgpa columns — see the query above.',
      unplaced;
  end if;
end;
$$;
