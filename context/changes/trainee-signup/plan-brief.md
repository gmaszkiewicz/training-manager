# Trainee signup — Plan Brief

> Full plan: `context/changes/trainee-signup/plan.md`

## What & Why

A trainee needs an account the later measurement journal can attach to. Sign-up already accepts email and password, but it does not record a trainee role, and the only signed-in page is a welcome stub. This slice records the role and opens an empty journal.

## Starting Point

`POST /api/auth/signup` always redirects to `/auth/confirm-email` and ignores the session. Sign-in goes to `/`. `/dashboard` is protected and shows a welcome. There is no profile table and no migration directory. Local and CI Supabase have email confirmation off, and smoke expects the old redirects.

## Desired End State

Someone who registers while a session already exists lands on `/dashboard` and sees a journal with no measurements and no way to add one. Someone who must confirm email still sees the confirm page, then reaches that same journal on first sign-in. Either path creates one trainee profile if it is missing, and does not change a profile that already exists.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Role control | No picker; always store `trainee` | S-01 only records the trainee role; the trainer picker is S-03 | Plan |
| Journal surface | Empty journal replaces the welcome on `/dashboard` | One protected page for S-02 to extend; the nav link stays `Dashboard` | Plan |
| When it opens | `/dashboard` when `signUp` returns a session; otherwise confirm-email, and sign-in opens the journal | Matches "register and open an empty journal" without skipping a required email confirmation | Plan |
| Pre-existing accounts | Create a trainee row on the first authenticated journal open; never overwrite an existing role | Scaffold accounts are not stranded, and a future trainer row stays put | Plan |
| Write path | App insert on the dashboard render, not an `auth.users` trigger | A trigger would create a profile before a session exists | Plan |
| Scope | FR-001 only | Trainer registration and measurement entries are later slices | Roadmap |

## Scope

**In scope:**

- `public.profiles` with RLS, role constrained to `trainee`
- Create-if-missing on authenticated `/dashboard`
- Empty journal copy `No measurements yet`, heading `Journal`, no measurement form
- Sign-up redirect follows `data.session`; sign-in redirects to `/dashboard`
- Smoke, plus README lines for tables, the signup landing page, and the hosted `supabase db push` step

**Out of scope:**

- Role picker, trainer role, measurements, add form, `/journal`, renaming the nav link
- Profile creation before a session, or rewriting an existing role
- Unit tests, zod on the current auth forms, an email-confirmation callback

## Architecture / Approach

`profiles.id` is the auth user id. RLS allows that user to select the row and to insert it only as `trainee`. There is no update or delete policy. `/dashboard` selects and, if needed, inserts. Sign-up and sign-in only choose the redirect; they do not write the profile.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Trainee profile | Migration, RLS, and create-if-missing on `/dashboard` | An upsert-style write would overwrite a later role |
| 2. Empty journal | Empty state, session redirects, smoke | CI has confirmations off, so smoke must expect `/dashboard` |

**Prerequisites:** Auth scaffold and local Supabase are already in place. No earlier slice.
**Estimated effort:** About 1–2 sessions across 2 phases.

## Open Risks & Assumptions

- Nothing applies migrations to hosted Supabase. Run `npx supabase db push` before merging to `main`, or production `/dashboard` fails for everyone.
- The hosted "confirm email" setting is not in the repo. The plan branches on `data.session`, and the confirmation-on path is a manual check.
- Every pre-existing auth user who opens the journal becomes a trainee. That was accepted; none of those accounts have a stored role today.
- S-03 must widen the role check and the insert policy before it can store `trainer`.
- Rolling back the Worker does not drop `public.profiles`.

## Success Criteria (Summary)

- A session-bearing registration opens `/dashboard` and shows `No measurements yet` with no measurement form.
- A registration without a session still shows `/auth/confirm-email`, and the first sign-in opens that same journal.
- The visit creates one `role = trainee` row when missing, leaves an existing row unchanged, and an anonymous visit neither opens the page nor creates a row.
