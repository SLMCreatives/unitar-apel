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
   `.env.local` and fill in the values from **Project Settings → API Keys**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=your-secret-key
   RESEND_API_KEY=            # optional locally
   EMAIL_FROM=                # optional locally
   ```

   Without `RESEND_API_KEY` / `EMAIL_FROM`, `npm run dev` prints sign-in codes
   in the terminal instead of emailing them.

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

The Supabase project is shared with another UNITAR app, so APEL does **not**
use Supabase Auth. Instead:

- **Login** is a 6-digit code emailed to a UNITAR address (sent with Resend).
  A first sign-in creates a *pending* account; a superadmin activates it and
  assigns a role under **Admin**. Accounts, codes and sessions live in
  `apel_users`, `apel_login_codes` and `apel_sessions`
  ([0009](supabase/migrations/0009_custom_auth.sql)).
- **Database access** happens only on the server, with the secret key. Every
  page, Server Action and Route Handler checks the session first
  (`src/lib/auth.ts`).
- **The APEL tables are closed to the public anon key** by
  [0010](supabase/migrations/0010_lock_down_apel_tables.sql). Apply it only
  after the app is deployed with `SUPABASE_SECRET_KEY`; the file explains the
  order.
