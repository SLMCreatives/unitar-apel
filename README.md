# UNITAR APEL.Q Tracker

A CRM tracker for the UNITAR APEL unit to monitor and track APEL.Q learners'
progress and status.

Built with Next.js (App Router) + Supabase (Postgres).

## Features

- **Learners** — full learner records: details, screening outcome, payment,
  assessor appointments, progress (self-assessment, instrument level, GPA/CGPA,
  AEB & Senate dates), and milestone/claim tracking. Searchable list with
  status/stage filters and a 12-month completion window meter that counts from
  the offer letter issue date.
- **Notes & follow-ups** — an activity log per learner with follow-up dates and
  overdue flags.
- **Advisors** — advisor directory with payment mode (teaching load/payment),
  remarks, and each advisor's assigned learners.
- **Assessors & Moderators** — selection lists for internal/external assessors
  and moderators used in learner assignments.

## Database

The app uses the existing Supabase tables:

- `public.apel` — learner records (one row per APEL.Q candidate)
- `public.apel_advisors` — advisor directory

It adds two more via
[`supabase/migrations/0001_assessors_and_notes.sql`](supabase/migrations/0001_assessors_and_notes.sql):

- `public.apel_assessors` — internal/external assessor and moderator lists
- `public.apel_notes` — notes & follow-ups per learner

## Setup

1. **Create the two new tables**: open the Supabase project's **SQL Editor**,
   paste the contents of
   [`supabase/migrations/0001_assessors_and_notes.sql`](supabase/migrations/0001_assessors_and_notes.sql),
   and run it.

2. **Configure environment variables**: copy `.env.local.example` to
   `.env.local` and fill in the values from **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Install and run**:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Suggested first steps in the app

1. Add advisors on the **Advisors** page and assessors/moderators on the
   **Assessors & Moderators** page (these become dropdown options).
2. Add learners on the **Learners** page.

## Security note

v1 has no login — the database policies allow full access with the anon key,
so anyone with the app URL can read and edit data. Keep it on a private
machine/network, or add Supabase Auth (and tighten the RLS policies in the
migration) before deploying it publicly.
