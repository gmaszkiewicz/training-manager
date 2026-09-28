# Trainer registers — Plan Brief

> Full plan: `context/changes/trainer-signup/plan.md`

## What & Why

A trainer needs an account before they can link a trainee. Sign-up already accepts email and password, but the first visit to `/dashboard` always stores `trainee`, and the database rejects any other role. This slice records an explicit trainer or trainee choice and gives the trainer a confirmation that is not the measurement journal.

## Starting Point

`POST /api/auth/signup` sends no role and redirects to `/dashboard` when a session exists, otherwise to `/auth/confirm-email`. `/dashboard` inserts `role = trainee` when the profile is missing, then shows the journal. The check constraint, the insert policy, and `ensureTraineeProfile` all reject a non-trainee. Measurement insert already requires a trainee profile. Smoke expects the trainee text `No measurements yet`.

## Desired End State

The sign-up form requires Trainee or Trainer, with neither pre-selected. A trainer with a session lands on `/dashboard` and sees the heading `Trainer`, their email, and Sign out, without the journal, the measurement form, or `No measurements yet`. A trainee still sees the journal. A confirmation-required sign-up still shows the confirm-email page, and the first sign-in uses the role chosen at sign-up. An existing profile is never rewritten. An account with no role metadata still becomes a trainee.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Role control | Required Trainee or Trainer on the existing form, neither pre-selected | The PRD says anyone registers and picks a role, and S-01 deferred that picker to this slice |
| Landing | Trainer confirmation on `/dashboard`; trainees keep the journal | One protected page, which S-04 can extend, and no second route before linking exists |
| When the row is written | `user_metadata.role` at `signUp`; insert on the first authenticated `/dashboard` visit | A confirmation-required sign-up has no session, so the sign-up request cannot pass the insert policy |
| Existing rows | Never update; a missing role key still inserts `trainee` | Accounts from S-01 stay trainees, and a later metadata edit cannot flip the stored role |
| Invalid role | Reject before `signUp`; a present value other than the two roles inserts nothing | A bad value must not silently become a trainee |
| Scope | FR-002 only | Linking and the measurement preview are S-04 |

## Scope

**In scope:**

- Widen `profiles_role_check` and the insert policy to `trainee` or `trainer`
- `ensureProfile` returns the existing row or inserts the chosen role, and inserts `trainee` only when the role key is absent
- `/dashboard` branches: journal for `trainee`, heading `Trainer` plus email and Sign out for `trainer`
- Required `role` on the sign-up form and in `POST /api/auth/signup`
- Smoke for the trainee journal, a missing role, `role=admin`, the trainer confirmation, and a rejected trainer measurement POST

**Out of scope:**

- A default role, a separate sign-up page, a `/trainer` route, renaming the nav link
- Linking a trainee, previewing measurements, editing or deleting entries
- Profile updates, profile creation inside the sign-up handler, an email-confirmation callback
- Unit tests, zod on the auth form

## Architecture / Approach

The sign-up handler validates `role` and stores it on the auth user. `/dashboard` is still the only profile write. It inserts once, then the row wins over metadata. Trainees keep the current journal, including the measurement form. Trainers skip the measurement query. The measurement insert policy is unchanged and still requires `trainee`, so a trainer POST fails closed.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Trainer profile | Migration, ensure, and the trainer confirmation on `/dashboard` | Treating a missing role key and an invalid role the same way would turn a bad value into a trainee |
| 2. Required role at signup | Form, API metadata, and smoke for both roles | The current smoke runner can only require a substring, so the trainer step needs a negative check |

**Prerequisites:** S-01 is done. Local Supabase is available. The trainee journal already lives on `/dashboard`.
**Estimated effort:** About 1 session across 2 phases.

## Open Risks & Assumptions

- The hosted confirm-email setting is not in the repo. Metadata is written at `signUp`, and the confirmation-on path is a manual check.
- `user_metadata` is writable by the user before the first dashboard visit. Only `trainee` or `trainer` can be inserted, and an existing row is not updated.
- Widening the check is safe for the previous Worker, which only inserts `trainee`. Rolling the Worker back does not restore the old check, and this slice has no down migration.
- Workers Builds applies the migration on `main` before the new Worker. A local push from this workspace is not the hosted path.

## Success Criteria (Summary)

- Choosing Trainer opens `/dashboard` with the heading `Trainer`, the email, and Sign out, and without the journal or `No measurements yet`.
- Choosing Trainee still opens the journal, including after the existing smoke sign-up.
- Submitting no role, or any role other than `trainee` or `trainer`, creates no account. An existing profile role does not change on a later visit.
