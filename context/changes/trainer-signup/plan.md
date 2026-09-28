# Trainer registers Implementation Plan

## Overview

A person registering with email and password must choose the trainee or trainer role, and that choice is what gets stored. Trainees still open the measurement journal. Trainers open a confirmation on `/dashboard` and do not get the journal. This is roadmap slice S-03 (FR-002).

## Current State Analysis

Email and password sign-up, cookie sessions, and a protected `/dashboard` already exist. Sign-up submits only email and password. The first authenticated visit to `/dashboard` inserts `public.profiles.role = 'trainee'` and then shows the journal. A trainer row cannot be stored, and if one existed the page would treat it as a failure.

## Desired End State

On `/auth/signup`, Trainee and Trainer are both required and neither is pre-selected. Submitting without one of those two values does not create an account. A session-bearing registration as trainer opens `/dashboard` with the heading `Trainer`, the signed-in email, and Sign out, and without the journal heading, the measurement form, or `No measurements yet`. A registration as trainee still opens the journal. A registration that returns no session still shows `/auth/confirm-email`, and the first sign-in uses the role chosen at sign-up. An existing profile row is never rewritten. An account with no role metadata still becomes a trainee on the first journal open.

### Key Discoveries:

- `POST /api/auth/signup` calls `signUp({ email, password })` and redirects to `/dashboard` only when `data.session` is set (`src/pages/api/auth/signup.ts:13-23`). Nothing writes `user_metadata`.
- The only profile insert is `ensureTraineeProfile`, which writes `role: "trainee"` and returns failure when `role !== "trainee"` (`src/lib/services/ensure-trainee-profile.ts:16-38`). `/dashboard` then shows `Could not open your journal` (`src/pages/dashboard.astro:19-58`).
- `profiles_role_check` and `profiles_insert_own_trainee` allow only `role = 'trainee'` (`supabase/migrations/20260927065512_trainee_profile.sql:5-20`). There is no update or delete policy.
- Measurement insert already requires a trainee profile (`supabase/migrations/20260928043200_trainee_measurements.sql:41`). A trainer cannot save an entry through that policy.
- Smoke posts `{ email, password }` and expects the trainee journal text `No measurements yet` (`scripts/smoke.mjs:62-76`). Its body check can only require a substring, not forbid one.
- S-01 stored the role on the first authenticated dashboard visit, not in the sign-up handler, because a confirmation-required sign-up has no session and the insert policy needs `auth.uid()`.

## What We're NOT Doing

- A default of trainee on the form, or a separate trainer sign-up page.
- A `/trainer` route, or renaming the Dashboard nav link.
- Linking a trainee, or previewing a trainee's measurements. That is S-04.
- Editing or deleting measurements, or changing the measurement insert policy.
- Updating or deleting a profile, or rewriting an existing role.
- Creating the profile inside the sign-up request.
- An email-confirmation callback route.
- Unit tests, or zod on the auth form.

## Implementation Approach

Keep one write path. The sign-up form submits `role` as `trainee` or `trainer`. The API rejects any other value before `signUp`, and passes a valid choice as `options.data.role`, which `getUser()` later exposes as `user.user_metadata.role`. That metadata survives the confirm-email gap. The new migration only widens the check and the insert policy so either role can be inserted for `auth.uid()`. On `/dashboard`, resolve the profile once: return an existing row unchanged; if it is missing, insert the metadata role; if the role key is absent, insert `trainee`. Render the journal only when the resolved role is `trainee`. Render the trainer confirmation when it is `trainer`. Do not call `listMeasurements` for a trainer.

## Critical Implementation Details

- **Timing.** Do not insert `profiles` in the sign-up handler. Confirmation-required sign-up has no session, and the insert policy checks `auth.uid()`. Write the choice to auth metadata at `signUp`, and insert the row on the first authenticated `/dashboard` visit, which is also the sign-in landing.
- **Fallback order.** Absent `user_metadata.role` means a pre-S-03 account and inserts `trainee`. Any other present value is not a trainee and must not be inserted. Check for the two exact strings before treating a missing key as trainee.

---

## Phase 1: Trainer profile

### Overview

Allow `trainer` on `public.profiles`, resolve that role without overwriting an existing row, and show the trainer confirmation on `/dashboard`. Sign-up does not offer the choice yet, so new registrations still become trainees.

### Changes Required:

#### 1. Role constraint and insert policy

**File**: `supabase/migrations/YYYYMMDDHHmmss_trainer_role.sql` (new file, timestamp later than `20260928043200_trainee_measurements.sql`)

**Intent**: Let an authenticated user insert their own `trainer` row while the previous worker, which only inserts `trainee`, keeps working.

**Contract**: New migration only. Do not edit `20260927065512_trainee_profile.sql`. Drop and re-add `profiles_role_check` so `role in ('trainee', 'trainer')`. Drop `profiles_insert_own_trainee` and create `profiles_insert_own` for `authenticated` with `auth.uid() = id and role in ('trainee', 'trainer')`. Leave the select policy, and leave the grants from `20260927100031_profiles_explicit_grants.sql` (authenticated `select` and `insert` only). No update or delete policy.

#### 2. Profile ensure

**File**: `src/lib/services/ensure-profile.ts`, `src/types.ts`, `src/lib/services/ensure-trainee-profile.ts`

**Intent**: Resolve the caller's row as either role, and stop treating `trainer` as a broken journal.

**Contract**: `Profile.role` is `"trainee" | "trainer"`. `ensureProfile(supabase, userId, requestedRole)` takes `requestedRole` of `"trainee"`, `"trainer"`, or `null` and returns `{ ok: true, role }` or `{ ok: false }`. Select by id first. When the row exists and its role is one of the two, return that role and do not write. When it is missing and `requestedRole` is `trainee` or `trainer`, insert that role. When it is missing and `requestedRole` is `null`, insert `trainee`. A unique-violation race selects again and returns the existing row. No update and no delete. Remove `ensureTraineeProfile` so the `role !== "trainee"` failure cannot remain in use. `dashboard.astro` is the only caller.

#### 3. Dashboard branch

**File**: `src/pages/dashboard.astro`

**Intent**: Show the journal only to a trainee, and show a trainer their confirmation instead of `Could not open your journal`.

**Contract**: Read `Astro.locals.user.user_metadata.role`. Pass `trainee` or `trainer` into `ensureProfile` only when the value is exactly one of those strings. Pass `null` when the key is absent. For any other present value, do not call `ensureProfile` and do not insert; show `Could not open your journal`. When the resolved role is `trainee`, keep the current journal: heading `Journal`, email, `MeasurementForm`, `No measurements yet` or `MeasurementList`, and the load-error sentence. When it is `trainer`, skip `listMeasurements`. Heading is exactly `Trainer`. Show the email and Sign out. Do not render the measurement form, `No measurements yet`, or a link control. Sign-in and sign-up redirects stay on `/dashboard`.

#### 4. README

**File**: `README.md`

**Intent**: Document that a profile is no longer trainee-only.

**Contract**: Replace the sentence that `public.profiles` stores the trainee role with one that says it stores `trainee` or `trainer`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- Local Supabase applies the new migration, and `profiles_role_check` accepts `trainee` and `trainer` and rejects any other role
- As `authenticated`, inserting the caller's own `profiles` row with `role = 'trainer'` succeeds, and inserting another user's id or `role = 'admin'` is rejected

#### Manual Verification:

- A signed-in user whose `profiles.role` is `trainer` sees the heading `Trainer`, their email, and Sign out, and does not see the heading `Journal`, the measurement form, or `No measurements yet`
- A signed-in trainee still sees the heading `Journal` and the measurement form
- A second open of `/dashboard` does not change an existing profile role

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Required role at signup

### Overview

The existing sign-up form requires an explicit role, the API stores that choice, and smoke covers the trainee journal, the rejection of a missing role, and the trainer confirmation.

### Changes Required:

#### 1. Sign-up form

**File**: `src/components/auth/SignUpForm.tsx`

**Intent**: Make the person choose a role before an account is created.

**Contract**: Add a required control named `role` with visible options Trainee (`trainee`) and Trainer (`trainer`). Neither option is pre-selected. `FormField` stays the email and password inputs; the role control is a separate pair of inputs that submit `role`. Client validation blocks submit when `role` is empty, with a visible message. The existing email and password validation stays.

#### 2. Sign-up API

**File**: `src/pages/api/auth/signup.ts`

**Intent**: Persist the chosen role across both the immediate-session path and the confirm-email path, and refuse any other value before an auth user exists.

**Contract**: Read `role` from the form. If it is not exactly `trainee` or `trainer`, redirect to `/auth/signup?error=` and do not call `signUp`. Otherwise call `signUp` with `options.data.role` set to that string, which `getUser()` returns as `user.user_metadata.role`. Keep the current redirects: `/dashboard` when `data.session` is set, `/auth/confirm-email` otherwise. Do not insert into `profiles` here.

#### 3. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Lock the trainee journal, the required role, and the trainer confirmation into the existing auth smoke run.

**Contract**: The existing trainee sign-up posts `role=trainee` and still expects `/dashboard` and `No measurements yet`. After the existing sign-out, append steps that use a second email and the signed-out cookie jar. A post without `role` returns 302 to a location starting with `/auth/signup?error=`, and the following `GET /dashboard` still returns 302 to `/auth/signin`. A post with `role=admin` does the same, and it runs before the trainer signup. A post with `role=trainer` returns 302 to `/dashboard`. That dashboard returns 200, contains `Trainer`, and does not contain `No measurements yet`. Extend the step expectation so a step can forbid a substring; the current check only supports inclusion. A measurement POST from that trainer session returns 302 to a location starting with `/dashboard?error=` and not exactly `/dashboard`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run smoke` passes: trainee signup sends `role=trainee` and the dashboard contains `No measurements yet`; signup without `role` redirects to `/auth/signup?error=` and `/dashboard` still redirects to `/auth/signin`; signup with `role=admin` redirects to `/auth/signup?error=` and `/dashboard` still redirects to `/auth/signin`; a trainer account's dashboard contains `Trainer` and does not contain `No measurements yet`; that account's measurement POST redirects to `/dashboard?error=`

#### Manual Verification:

- `/auth/signup` shows Trainee and Trainer with neither selected, and submitting without a choice stays on the form
- Choosing Trainer with email confirmation off opens `/dashboard` with the heading `Trainer` and no journal
- Choosing Trainee still opens the journal
- With email confirmation required, choosing Trainer shows `/auth/confirm-email`, and the first sign-in opens the trainer confirmation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

No unit-test runner is in this slice. Role parsing stays in the sign-up handler and is covered by smoke.

### Integration Tests:

`npm run smoke` against a running server, after Phase 2, covers trainee registration, a missing role, `role=admin`, trainer registration, and a trainer measurement POST. Phase 1 checks the check constraint and insert policy with local Supabase under `set local role authenticated`.

### Manual Testing Steps:

1. Apply the migration. In Studio, create an auth user and do not open `/dashboard`. Insert `profiles` for that user with `role = 'trainer'` as `postgres`. Sign in. Confirm the heading `Trainer`, the email, and Sign out, and confirm the journal form and `No measurements yet` are absent.
2. Sign in as a trainee. Confirm the heading `Journal` and the measurement form. Reload and confirm the profile role is unchanged.
3. Open `/auth/signup`. Confirm neither role is selected. Submit without a role and confirm the form stays put.
4. Register as trainer with confirmation off. Confirm the trainer heading and that no measurement form is shown.
5. Register as trainee. Confirm the journal.
6. Where confirmation is required, register as trainer, confirm the email page, then sign in and confirm the trainer heading rather than the journal.

## Performance Considerations

`target_scale.users` is small. `/dashboard` still does one profile read and, only when the row is missing, one insert. Trainers skip the measurement list query.

## Migration Notes

There is no backfill. Auth users without a profile get `trainee` the first time they open `/dashboard` when `user_metadata.role` is absent. Users who already have a row keep that role, including when metadata later says something else. The row is authoritative after insert.

`user_metadata` can be changed by the user before that first visit. The insert accepts only `trainee` or `trainer`, so a tampered value creates no row. It cannot change a row that already exists, because this slice adds no update policy.

The new migration is backward compatible with the previous Worker: that Worker only inserts `trainee`, which still satisfies the widened check and insert policy. Worker rollback does not restore the old check. This slice does not ship a down migration. A trainer row would have to be removed before the old `role = 'trainee'` check could be restored.

Hosted Supabase receives the migration on `main` through Workers Builds (`npm run build:workers` runs `supabase db push` before the Worker build). Do not assume a local `db push` from this workspace.

## References

- Slice outcome: `context/foundation/roadmap.md` (S-03, change id `trainer-signup`)
- PRD: `context/foundation/prd.md` (FR-002, Access Control)
- Prior slice: `context/archive/2026-09-26-trainee-signup/plan.md` (profile-on-first-visit, no overwrite, S-03 widen note)
- Sign-up redirect: `src/pages/api/auth/signup.ts`
- Profile ensure: `src/lib/services/ensure-trainee-profile.ts`
- Journal page: `src/pages/dashboard.astro`
- Role constraint: `supabase/migrations/20260927065512_trainee_profile.sql`
- Measurement insert guard: `supabase/migrations/20260928043200_trainee_measurements.sql`
- Smoke: `scripts/smoke.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Trainer profile

#### Automated

- [ ] 1.1 `npm run lint` passes
- [ ] 1.2 Local Supabase applies the new migration, and `profiles_role_check` accepts `trainee` and `trainer` and rejects any other role
- [ ] 1.3 As `authenticated`, inserting the caller's own `profiles` row with `role = 'trainer'` succeeds, and inserting another user's id or `role = 'admin'` is rejected

#### Manual

- [ ] 1.4 A signed-in user whose `profiles.role` is `trainer` sees the heading `Trainer`, their email, and Sign out, and does not see the heading `Journal`, the measurement form, or `No measurements yet`
- [ ] 1.5 A signed-in trainee still sees the heading `Journal` and the measurement form
- [ ] 1.6 A second open of `/dashboard` does not change an existing profile role

### Phase 2: Required role at signup

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npm run smoke` passes: trainee signup sends `role=trainee` and the dashboard contains `No measurements yet`; signup without `role` redirects to `/auth/signup?error=` and `/dashboard` still redirects to `/auth/signin`; signup with `role=admin` redirects to `/auth/signup?error=` and `/dashboard` still redirects to `/auth/signin`; a trainer account's dashboard contains `Trainer` and does not contain `No measurements yet`; that account's measurement POST redirects to `/dashboard?error=`

#### Manual

- [ ] 2.3 `/auth/signup` shows Trainee and Trainer with neither selected, and submitting without a choice stays on the form
- [ ] 2.4 Choosing Trainer with email confirmation off opens `/dashboard` with the heading `Trainer` and no journal
- [ ] 2.5 Choosing Trainee still opens the journal
- [ ] 2.6 With email confirmation required, choosing Trainer shows `/auth/confirm-email`, and the first sign-in opens the trainer confirmation
