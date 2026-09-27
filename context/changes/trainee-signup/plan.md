# Trainee signup Implementation Plan

## Overview

A person can register with email and password as a trainee and open an empty journal. Sign-up already creates a Supabase auth user; this change records the trainee role and makes `/dashboard` that empty journal, so later slices can attach measurements to the account.

## Current State Analysis

Email and password sign-up, sign-in, cookie sessions, and a protected `/dashboard` already exist. Nothing stores a role, and the dashboard is a welcome stub rather than a journal.

- `POST /api/auth/signup` reads only `email` and `password`, calls `signUp`, and always redirects to `/auth/confirm-email`. It ignores `data.session` (`src/pages/api/auth/signup.ts`).
- `POST /api/auth/signin` redirects to `/` on success (`src/pages/api/auth/signin.ts`).
- Middleware protects only `/dashboard` and sets `context.locals.user` from `getUser()` (`src/middleware.ts`).
- `/dashboard` renders a welcome and a sign-out form. It does not mention measurements (`src/pages/dashboard.astro`).
- The signed-in top bar links to `/dashboard` with the label `Dashboard` (`src/components/Topbar.astro`).
- There is no `supabase/migrations/` directory, no `src/types.ts`, and no profile table. README states the app uses `auth.users` only.
- Local and CI Supabase set `enable_confirmations = false` (`supabase/config.toml`). `supabase start` in `.github/workflows/ci.yml` applies migrations before `npm run smoke`.
- `scripts/smoke.mjs` expects signup to land on `/auth/confirm-email` and sign-in to land on `/`. It checks status codes, not page text.

## Desired End State

A new registration with a session opens `/dashboard`, which shows the heading `Journal`, the signed-in email, the sentence `No measurements yet`, and sign-out, and does not show a measurement form. The same page is what sign-in opens. That visit creates one `public.profiles` row with `role = trainee` when the row is missing, and does not change a row that already exists.

When sign-up returns no session, the user still sees `/auth/confirm-email`, and the first successful sign-in opens the same empty journal. An anonymous request to `/dashboard` still redirects to `/auth/signin` and creates no profile.

### Key Discoveries:

- The session-or-confirm split is already implied by Supabase, but the handler throws the session away and always redirects to `/auth/confirm-email` (`src/pages/api/auth/signup.ts`).
- CI smoke runs with confirmations off, so after this change signup must expect `/dashboard` or CI fails (`scripts/smoke.mjs`, `.github/workflows/ci.yml`).
- New tables require `YYYYMMDDHHmmss_short_description.sql` and RLS with per-operation policies (`CLAUDE.md`).
- There is no unit-test runner. Auth behavior is verified by `npm run smoke`.

## What We're NOT Doing

- A role control on the sign-up form. This slice always stores `trainee`.
- The trainer role, a trainer option, or widening the role check. That is S-03.
- Measurement fields, an add form, notes, or deltas. That is S-02.
- A `/journal` route, or renaming the top-bar link away from `Dashboard`.
- A profile row before a session exists, including a trigger on `auth.users`.
- Overwriting an existing profile role.
- Redirecting every signed-in visit to `/` onto the journal. Home stays the public welcome; sign-in and a session-bearing sign-up are what open the journal.
- Retrofitting zod onto the existing auth forms.
- A unit-test framework.
- An in-app email-confirmation callback. The confirm page stays as it is.

## Implementation Approach

Add `public.profiles` keyed by the auth user id, with the role constrained to `trainee` and with RLS that allows a user to insert and read only their own trainee row. There is no update or delete policy, so a later role cannot be written back to `trainee` by the ensure path.

The only write is on the server render of `/dashboard`, and only when `locals.user` is set. If no row exists, insert `{ id, role: 'trainee' }`. If it exists, leave it. Sign-up redirects to `/dashboard` when `signUp` returns a session, and to `/auth/confirm-email` otherwise. Sign-in redirects to `/dashboard`. The page then shows the empty journal only after the ensure succeeds.

This is an application insert rather than an `auth.users` trigger because the agreed rule is "the first visit that has a session". A trigger would create the row at sign-up even when email confirmation means there is no session yet.

## Critical Implementation Details

- **Session redirect.** Read `data.session` from `signUp`. Redirect to `/dashboard` only when it is non-null; otherwise redirect to `/auth/confirm-email`. Do not branch on `import.meta.env.DEV`. Local and CI Supabase have confirmations off, so those environments take the session branch. A hosted project with confirmations on takes the confirm page.
- **Insert must not update.** Do not use an upsert that updates on conflict. That needs an UPDATE policy and would reset a future non-trainee role on the next visit. Select by id; insert only when missing; on unique violation, select again and return the existing row.
- **Empty-state string.** The success page contains the exact sentence `No measurements yet` and no measurement form. A failed ensure renders `Could not open your journal`, still offers sign-out, and does not render `No measurements yet`.

## Phase 1: Trainee profile

### Overview

Store the trainee role and create the missing row the first time an authenticated user opens `/dashboard`. The welcome copy stays until Phase 2.

### Changes Required:

#### 1. Profile table

**File**: `supabase/migrations/YYYYMMDDHHmmss_trainee_profile.sql`

**Intent**: Give each auth user a role row that later slices can attach a journal to, and keep that role limited to trainee for this slice.

**Contract**: Table `public.profiles` with `id uuid primary key references auth.users(id) on delete cascade`, `role text not null`, and `created_at timestamptz not null default now()`. Check constraint: `role = 'trainee'`. Enable RLS. Authenticated `SELECT` where `auth.uid() = id`. Authenticated `INSERT` where `auth.uid() = id` and `role = 'trainee'`. No `UPDATE` policy and no `DELETE` policy. The filename uses the `YYYYMMDDHHmmss_trainee_profile.sql` convention. The SQL editor runs as `postgres` and bypasses RLS, so check the policies in a transaction with `set local role authenticated` and `set local request.jwt.claims` carrying a real user `sub`, then attempt an insert with a non-trainee role and an insert with another user's id.

#### 2. Ensure helper and page call

**File**: `src/lib/services/ensure-trainee-profile.ts`

**Intent**: Create the trainee row on the first authenticated journal open, and leave any existing row unchanged.

**Contract**: `ensureTraineeProfile(supabase, userId: string)` returns `{ ok: true, role: "trainee" }` when the row exists or was just inserted, and `{ ok: false }` on any other failure. It selects by `id` first. It inserts `{ id: userId, role: "trainee" }` only when absent. A unique-violation race selects again and returns the existing row. It does not update or delete. Shared type `Profile` with `id: string` and `role: "trainee"` lives in `src/types.ts`.

**File**: `src/pages/dashboard.astro`

**Intent**: Run the ensure for the signed-in user so Phase 1 is visible in the database before the copy changes.

**Contract**: Call the helper with the cookie Supabase client and `Astro.locals.user.id`. Middleware already guarantees a user on this route. When `createClient` returns `null`, render the same failure state without calling the helper. On `{ ok: false }`, render `Could not open your journal` and the existing sign-out form, and do not throw. On success, keep the current welcome until Phase 2. Do not call the helper from middleware or from the sign-up handler.

#### 3. Docs that deny migrations

**File**: `README.md`

**Intent**: Stop telling the next reader that the app has no tables, that signup always lands on the confirm page, or that migrations reach production on their own.

**Contract**: Replace the sentence that says no database tables or migrations are required and that the project uses only `auth.users`. State that `public.profiles` stores the trainee role and that migrations under `supabase/migrations/` apply locally on `supabase start`. Add that the hosted project needs a one-time `npx supabase link --project-ref <ref>`, then `npx supabase db push` before merging to `main`, because Workers Builds deploys the Worker and nothing applies SQL to hosted Supabase. Rewrite the line that documents `/auth/confirm-email` as the post-signup page: signup opens `/dashboard` when it returns a session, and `/auth/confirm-email` otherwise.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes

#### Manual Verification:

- Local Supabase applies the migration and `public.profiles` has RLS enabled
- A signed-in open of `/dashboard` creates one `role = trainee` row, and a second open leaves it unchanged
- An insert with a role other than `trainee`, or with another user's id, is rejected
- An anonymous `GET /dashboard` redirects to `/auth/signin` and creates no profile row

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Empty journal

### Overview

Make `/dashboard` the empty journal and open it whenever a session exists after sign-up or sign-in. Smoke matches the confirmation-off path that CI actually runs.

### Changes Required:

#### 1. Empty journal page

**File**: `src/pages/dashboard.astro`

**Intent**: Replace the welcome stub with the empty journal once the trainee profile is in place.

**Contract**: On ensure success, the page heading is `Journal`, the signed-in email is still shown, the body contains the exact sentence `No measurements yet`, sign-out remains, and there is no measurement form or measurement inputs. On ensure failure, keep Phase 1's `Could not open your journal` and do not show `No measurements yet`. Do not add an add-entry form.

#### 2. Open the journal when a session exists

**File**: `src/pages/api/auth/signup.ts`

**Intent**: Send the user to the empty journal when registration already has a session, and keep the confirm page when it does not.

**Contract**: After `signUp`, redirect to `/auth/signup?error=` on error, to `/dashboard` when `data.session` is non-null, and to `/auth/confirm-email` when `data.session` is null. The sign-up form gains no fields (`src/components/auth/SignUpForm.tsx` stays email, password, and confirm-password).

**File**: `src/pages/api/auth/signin.ts`

**Intent**: The first successful sign-in opens the journal, including for accounts that existed before the profile table.

**Contract**: On success, redirect to `/dashboard` instead of `/`. Wrong-password and missing-config redirects stay on `/auth/signin?error=`. Do not insert the profile in this handler; the dashboard render does that.

#### 3. Smoke expectations

**File**: `scripts/smoke.mjs`

**Intent**: Lock the confirmation-off path CI runs, including the empty-journal sentence.

**Contract**: The signup step expects `302` and a location that starts with `/dashboard`. The successful sign-in step expects `302` and a location that starts with `/dashboard`. The signed-in `GET /dashboard` step expects `200` and a body that contains `No measurements yet`. Anonymous `/dashboard` still expects `302` to `/auth/signin`. Wrong-password sign-in is unchanged. The request helper must expose the response body for the dashboard assertion.

#### 4. Nav label

**File**: `src/components/Topbar.astro`

**Intent**: Keep the existing entry point while the page itself is the journal.

**Contract**: No change. The signed-in link text remains `Dashboard` and the href remains `/dashboard`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm run smoke` passes with confirmation off: signup and sign-in redirect to `/dashboard`, and the signed-in dashboard body contains `No measurements yet`

#### Manual Verification:

- With confirmation off, signup lands on `/dashboard` showing `No measurements yet` and no measurement form
- With confirmation required, signup lands on `/auth/confirm-email`, and the first sign-in lands on `/dashboard` showing `No measurements yet`
- A pre-migration account that signs in and opens `/dashboard` gets a trainee profile and sees `No measurements yet`
- The top bar link still reads `Dashboard` and points at `/dashboard`
- Sign out returns to `/`, and the next `/dashboard` visit redirects to `/auth/signin`
- Hosted Supabase has `public.profiles` from `npx supabase db push` before the merge to `main`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No unit-test runner exists, and this slice does not add one.
- The ensure rule (insert when missing, do not update when present) is covered by the Phase 1 manual checks.

### Integration Tests:

- `npm run smoke` is the auth integration check. Phase 2 updates it for the session-bearing sign-up, the sign-in redirect, and the `No measurements yet` sentence.
- CI already starts local Supabase with confirmations off and applies `supabase/migrations` on `supabase start`, then runs smoke against the production preview.

### Manual Testing Steps:

1. Apply the migration with local Supabase and confirm RLS rejects a non-trainee role and a mismatched user id.
2. Register with confirmations off and confirm the browser opens the empty journal without a second sign-in.
3. Sign in as an auth user that has no profile row and confirm the journal open creates one trainee row and does not duplicate it.
4. If a hosted project requires email confirmation, register there and confirm the confirm page appears, then sign in and confirm the empty journal.

## Performance Considerations

`target_scale.users` is small. Each `/dashboard` render does one profile select and, only on the first visit, one insert. No caching and no extra work on other routes.

## Migration Notes

Nothing in the repo applies migrations to the hosted Supabase project; CI runs local Supabase only, and Workers Builds deploys the Worker on push to `main`. Run `npx supabase db push` against the linked hosted project before merging. The table is additive and nothing reads it before this Worker ships, so pushing first is safe. Merging first makes every production `/dashboard` show `Could not open your journal`.

There is no SQL backfill. Auth users created before this migration get a `profiles` row the first time they open `/dashboard` with a session. Unconfirmed sign-ups get no row until that visit. An existing row's role is never rewritten.

Worker rollback does not drop `public.profiles`. This slice does not ship a down migration. S-03 must widen both the `role = 'trainee'` check and the insert policy before it can store `trainer`.

## References

- Slice outcome: `context/foundation/roadmap.md` (S-01, change id `trainee-signup`)
- Requirement: `context/foundation/prd.md` (FR-001)
- Sign-up redirect: `src/pages/api/auth/signup.ts`
- Sign-in redirect: `src/pages/api/auth/signin.ts`
- Protected journal page: `src/pages/dashboard.astro`
- Smoke expectations: `scripts/smoke.mjs`
- CI applies migrations on `supabase start`: `.github/workflows/ci.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Trainee profile

#### Automated

- [x] 1.1 `npm run lint` passes — 84b8cfb
- [x] 1.2 `npx astro check` passes — 84b8cfb

#### Manual

- [x] 1.3 Local Supabase applies the migration and `public.profiles` has RLS enabled
- [x] 1.4 A signed-in open of `/dashboard` creates one `role = trainee` row, and a second open leaves it unchanged
- [x] 1.5 An insert with a role other than `trainee`, or with another user's id, is rejected
- [x] 1.6 An anonymous `GET /dashboard` redirects to `/auth/signin` and creates no profile row

### Phase 2: Empty journal

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npx astro check` passes
- [x] 2.3 `npm run smoke` passes with confirmation off: signup and sign-in redirect to `/dashboard`, and the signed-in dashboard body contains `No measurements yet`

#### Manual

- [x] 2.4 With confirmation off, signup lands on `/dashboard` showing `No measurements yet` and no measurement form
- [x] 2.5 With confirmation required, signup lands on `/auth/confirm-email`, and the first sign-in lands on `/dashboard` showing `No measurements yet`
- [x] 2.6 A pre-migration account that signs in and opens `/dashboard` gets a trainee profile and sees `No measurements yet`
- [x] 2.7 The top bar link still reads `Dashboard` and points at `/dashboard`
- [x] 2.8 Sign out returns to `/`, and the next `/dashboard` visit redirects to `/auth/signin`
- [x] 2.9 Hosted Supabase has `public.profiles` from `npx supabase db push` before the merge to `main`
