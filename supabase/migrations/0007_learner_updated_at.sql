-- UNITAR APEL.Q Tracker — last-update timestamp on learners, for lead ageing.
-- Run this in the Supabase SQL Editor after 0006_instrument_results.sql.
--
-- Lead ageing is how long a learner had been in the system at their last
-- update: apel.updated_at − apel.created_at. apel has never had an updated_at
-- column, so this adds one and keeps it current.
--
-- What counts as an update
-- ------------------------
--   * Any change to the learner record itself.
--   * Adding or changing a note, assignment or document for the learner — work
--     on a lead often happens there rather than on the record.
--
-- A save that changes nothing does NOT count. The learner editor and the bulk
-- importer write every field on save, and syncAssignments rewrites the
-- learner's assignments each time, so without this guard simply pressing Save
-- would reset a lead's age. Rows are compared as jsonb rather than with row
-- equality so columns of types without an equality operator cannot break it.

alter table apel add column if not exists updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- Backfill. Edits made before this migration were never recorded, so the best
-- available evidence of a learner's last update is the latest of:
--   * when the record was created,
--   * the latest note or document added for it,
--   * the latest edit to one of its assignments.
-- Assignment *creation* times are not used: 0002 backfilled assignments for
-- every learner in one go, so those timestamps are the date 0002 was run, not
-- real activity. Only rows still null are filled, so this is safe to re-run.
-- ---------------------------------------------------------------------------

-- The outer coalesce only matters for a legacy row with no created_at and no
-- activity, which would otherwise block the not-null constraint below.
update apel l set updated_at = coalesce(greatest(
  l.created_at,
  (select max(n.created_at) from apel_notes n where n.learner_id = l.id),
  (select max(d.created_at) from apel_documents d where d.learner_id = l.id),
  (select max(a.updated_at) from apel_assignments a
     where a.learner_id = l.id and a.updated_at > a.created_at)
), now())
where l.updated_at is null;

alter table apel alter column updated_at set default now();
alter table apel alter column updated_at set not null;

-- ---------------------------------------------------------------------------
-- Touch apel.updated_at when the learner row actually changes. A change to
-- updated_at alone (from the child-table trigger below) also counts.
-- ---------------------------------------------------------------------------

create or replace function apel_touch_learner_updated_at() returns trigger
language plpgsql as $$
begin
  if to_jsonb(new) is distinct from to_jsonb(old) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists apel_touch on apel;
create trigger apel_touch
  before update on apel
  for each row execute function apel_touch_learner_updated_at();

-- ---------------------------------------------------------------------------
-- Bump the learner when a note, assignment or document is added or changed.
-- The child tables' own updated_at is ignored in the comparison: their touch
-- trigger always moves it, even on a no-op rewrite. Security definer so the
-- bump goes through whatever RLS policy is on apel — anyone allowed to write
-- the child row is working on that learner.
-- ---------------------------------------------------------------------------

create or replace function apel_bump_learner_updated_at() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;
  update apel set updated_at = now() where id = new.learner_id;
  return null;
end;
$$;

drop trigger if exists apel_notes_bump_learner on apel_notes;
create trigger apel_notes_bump_learner
  after insert or update on apel_notes
  for each row execute function apel_bump_learner_updated_at();

drop trigger if exists apel_assignments_bump_learner on apel_assignments;
create trigger apel_assignments_bump_learner
  after insert or update on apel_assignments
  for each row execute function apel_bump_learner_updated_at();

drop trigger if exists apel_documents_bump_learner on apel_documents;
create trigger apel_documents_bump_learner
  after insert or update on apel_documents
  for each row execute function apel_bump_learner_updated_at();
