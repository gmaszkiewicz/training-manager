# Trainer links a trainee and previews the list — Implementation Plan

## Overview

A trainer links an existing trainee by email and previews that trainee's measurement list, including notes and the arrow and difference versus the previous entry. The trainer can keep many protégés and see one list at a time. The trainer cannot create, edit, or delete entries.

## Current State Analysis

Sign-up stores `trainee` or `trainer` on `public.profiles`, created on the first authenticated `/dashboard` visit (`src/lib/services/ensure-profile.ts`). Middleware only checks the session (`src/middleware.ts`). `/dashboard` shows the journal to a trainee and a welcome line to a trainer (`src/pages/dashboard.astro`).

`public.measurements` is readable and insertable only by the owning trainee. Insert also requires `profiles.role = 'trainee'` (`supabase/migrations/20260928043200_trainee_measurements.sql`). `listMeasurements` loads the row, including `note`, and `withDeltas` computes the comparison (`src/lib/services/measurements.ts`, `src/lib/measurement-deltas.ts`). `MeasurementList.astro` only formats those deltas. There is no update or delete grant.

`profiles` has no email column, and each user can select only their own profile (`supabase/migrations/20260927065512_trainee_profile.sql`). The Worker has `SUPABASE_URL` and `SUPABASE_KEY` (the anon key). It cannot look up `auth.users` by email. S-02 reserved a trainer `SELECT` policy based on a link table (`context/archive/2026-09-27-trainee-measurement-delta/plan.md`).

The trainer branch of `/dashboard` does not render the `error` query. That text is passed only into `MeasurementForm`, which a trainer does not see.

## Desired End State

A signed-in trainer sees an email field and every linked trainee's email, A–Z. Opening `/dashboard` with no `trainee` query shows the measurement list of the protégé linked most recently. Submitting an email, or opening `?trainee=<id>` for one of their links, shows that trainee's list for this visit, including notes and deltas. Sign-in lands on `/dashboard` with no query, so the next visit shows the most recently linked protégé again.

An email that is unknown, belongs to a trainer, is the caller's own, or belongs to someone who signed up as a trainee but never opened the journal shows exactly `No trainee with that email`. Submitting an email that is already linked does not add a row and shows that trainee's list. A trainer still cannot save a measurement. A trainee's own journal is unchanged.

### Key Discoveries:

- Role and journal already split on one route: `src/pages/dashboard.astro`.
- Deltas and notes are already on the list the trainer should see: `src/lib/measurement-deltas.ts`, `src/components/measurements/MeasurementList.astro`.
- Email lookup cannot be a normal client query. `profiles` has no email, RLS is owner-only, and the app key is the anon key (`astro.config.mjs`).
- A repeat link must not refresh `linked_at`, or the next plain `/dashboard` visit would treat a retry as the latest link.
- The trainer template drops `?error=` today, so the failure sentence has to be rendered on that branch before the preview UI exists.

## What We're NOT Doing

- Removing a link.
- An invite, a pending state, or an accept step.
- A different message for an unknown email, a trainer email, the caller's own email, or a trainee who has not opened the journal.
- Remembering which protégé was clicked after sign-in.
- Letting the trainer create, edit, or delete measurements, or reply to notes.
- A date filter, good/bad coloring, or a separate `/trainer` route.
- Creating a `profiles` row for someone who has not opened the journal.
- Replacing an older link when a new email is linked.
- Showing the trainer's identity on the trainee's journal.

## Implementation Approach

Add `public.trainer_links` and a `SECURITY DEFINER` function that resolves a normalized email to a trainee profile and inserts the link. The function is the only insert path. A second `measurements` `SELECT` policy lets a trainer read rows for trainees they linked. The existing trainee policies and grants stay.

The dashboard posts the email. Success redirects to `/dashboard?trainee=<id>`. Failure redirects with the single sentence above. The page lists stored emails A–Z and passes the selected trainee's rows through the existing `listMeasurements` and `MeasurementList` path.

This stays on `/dashboard` because S-03 already put the trainer there, and sign-in already redirects to `/dashboard` with no query (`src/pages/api/auth/signin.ts`).

## Critical Implementation Details

- **State sequencing.** `ON CONFLICT DO NOTHING` keeps the original `linked_at`. A successful submit, including a duplicate, redirects to `?trainee=` for the matched id so the list on screen is that trainee even when they are not the latest link. A failed submit keeps the current `trainee` query when the form sent one, so a typo does not jump the view back to the latest link.
- **User experience spec.** Every lookup miss uses the exact sentence `No trainee with that email`. A blank or whitespace-only email uses `Enter an email address` and does not call the function. A `trainee` query that is not one of this trainer's links is ignored. It must not render `No measurements yet`, which is only for a linked trainee who has zero entries.

---

## Phase 1: Link storage

### Overview

Add the link table, the email-link function, and a trainer read policy on measurements. No page changes.

### Changes Required:

#### 1. Link table, function, and trainer read

**File**: `supabase/migrations/YYYYMMDDHHmmss_trainer_links.sql` (new file, timestamp later than `20260928100000_trainer_role.sql`)

**Intent**: Let the database resolve an email to a trainee and record the link, without giving the client a way to attach an arbitrary user id.

**Contract**: New migration only. Do not edit earlier migration files. Table `public.trainer_links`: `trainer_id uuid not null references public.profiles(id) on delete cascade`, `trainee_id uuid not null references public.profiles(id) on delete cascade`, `email text not null`, `linked_at timestamptz not null default now()`, primary key `(trainer_id, trainee_id)`, check `trainer_id <> trainee_id`, check `char_length(email) between 3 and 320`. Enable RLS. One policy, `trainer_links_select_own`: `for select to authenticated using (auth.uid() = trainer_id)`. No insert, update, or delete policy. `revoke all on public.trainer_links from anon, authenticated; grant select on public.trainer_links to authenticated`.

Function `public.link_trainee_by_email(p_email text) returns uuid`. `SECURITY DEFINER`, `search_path` empty, schema-qualified names. `revoke all` from `public` and `anon`; `grant execute` to `authenticated`. Caller is `auth.uid()`. Return null when the caller has no `profiles` row or the role is not `trainer`. Normalize with `lower(btrim(p_email))`. Return null when that is null or empty. Find `auth.users` by the same normalization of `email`. Return null unless that id has a `profiles` row with role `trainee`. Insert `(trainer_id, trainee_id, email)` using the caller, that id, and the normalized email. On conflict, do nothing. Return the trainee id in both the insert and the conflict cases. Do not insert a profile. Do not raise a distinct error for the miss cases.

Add policy `measurements_select_linked_trainer` on `public.measurements`: `for select to authenticated using (exists (select 1 from public.trainer_links l where l.trainer_id = auth.uid() and l.trainee_id = measurements.trainee_id))`. Leave `measurements_select_own`, the insert policy, and the existing grants unchanged. Do not grant update or delete.

#### 2. Generated database types

**File**: `src/db/database.types.ts`

**Intent**: Let the app call the function and read the link table with the generated schema.

**Contract**: Run `npm run db:types` and commit the result. The generated `Database` includes `trainer_links` and `link_trainee_by_email`. Do not hand-edit the generated file.

#### 3. README

**File**: `README.md`

**Intent**: Record that a trainer can read a linked trainee's measurements.

**Contract**: Extend the schema sentence so `public.trainer_links` stores a trainer's link to a trainee, and a trainer can select that trainee's `measurements` rows. Keep the existing `db:types` instruction.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- Regenerating with `npm run db:types` leaves `src/db/database.types.ts` unchanged (`git diff --exit-code src/db/database.types.ts`)

#### Manual Verification:

- Local Supabase applies the new migration; `trainer_links` has RLS enabled; `authenticated` can select and cannot insert, update, or delete; `anon` has no privileges
- As a trainer, `link_trainee_by_email` returns the trainee id when that email has a `profiles` row with role `trainee`; returns null for an unknown email, a trainer email, the caller's own email, and an auth user who signed up as trainee but has no profile row; a second call inserts no row and does not change `linked_at`
- A trainer select on `measurements` returns rows only for linked trainees; a trainee select still returns only that trainee's rows; a trainer insert into `measurements` is rejected; a direct insert into `trainer_links` as `authenticated` is rejected

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Link request

### Overview

A trainer can submit an email. Success opens that trainee's id for this visit. Every lookup miss shows one sentence. The preview list is still absent.

### Changes Required:

#### 1. Link service

**File**: `src/lib/services/trainer-links.ts`

**Intent**: Call the database function and hide its internal result behind one success or failure.

**Contract**: `linkTraineeByEmail(supabase, email)` returns `{ ok: true, traineeId: string }` or `{ ok: false }`. It calls `link_trainee_by_email` with the submitted string. A null result or a client error is `{ ok: false }`. It does not read `auth.users` and it does not insert into `trainer_links` from the client.

#### 2. Link endpoint

**File**: `src/pages/api/trainer-links/index.ts`

**Intent**: Accept the email from a signed-in user and redirect back to the dashboard.

**Contract**: `POST`, `prerender = false`. No session redirects to `/auth/signin`. Missing Supabase config redirects to `/dashboard?error=Supabase%20is%20not%20configured`. Read form field `email`. If `lower(trim(email))` is empty, redirect to `/dashboard?error=Enter%20an%20email%20address` and do not call the function. Otherwise call `linkTraineeByEmail`. Success redirects to `/dashboard?trainee=<traineeId>` with no `error`. Failure redirects to `/dashboard?error=No%20trainee%20with%20that%20email`. Optional form field `trainee`: when failure happens and the value is a uuid, keep it on the error redirect as `trainee`. Do not use that field to decide whether the link succeeded. A non-trainer caller gets the same failure sentence, because the function returns null.

#### 3. Trainer error line

**File**: `src/pages/dashboard.astro`

**Intent**: Make the redirect sentence visible to a trainer. Today only the measurement form receives `error`.

**Contract**: When the resolved role is `trainer` and the `error` query is non-empty, show that text on the trainer branch. Leave the trainee branch passing `error` into `MeasurementForm` only. Do not add the link form or a measurement list in this phase.

#### 4. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Lock the redirect contract, including the single failure sentence and the blank-email sentence.

**Contract**: After the existing trainer measurement POST check, post `/api/trainer-links` as that trainer with a trainee email that already has a profile. Expect 302 to a location starting with `/dashboard?trainee=` whose id is that trainee's. Post the same email again and expect the same id. Post an unknown email, post the trainer's own email, and post from the trainee session: each is 302 to a location starting with `/dashboard?error=`, and the following `GET` contains `No trainee with that email`. Post a blank email: 302 to `/dashboard?error=`, the dashboard contains `Enter an email address`, and it does not contain `No trainee with that email`. The existing trainer measurement POST still redirects to `/dashboard?error=`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run smoke` passes: a trainer POST of a trainee email redirects to `/dashboard?trainee=` with that trainee's id; repeating the POST redirects to the same id; an unknown email, the trainer's own email, and a POST from a trainee session each redirect to `/dashboard?error=` and the following dashboard contains `No trainee with that email`; a blank email redirects to `/dashboard?error=` and the dashboard contains `Enter an email address` and does not contain `No trainee with that email`; a trainer measurement POST still redirects to `/dashboard?error=`

#### Manual Verification:

- While a protégé id is posted as `trainee`, a failed link redirects with both `error` and that `trainee` id, and the trainer dashboard shows `No trainee with that email`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Trainer preview

### Overview

The trainer dashboard lists protégés A–Z and shows one measurement list: the `trainee` query when it is one of their links, otherwise the most recently linked protégé.

### Changes Required:

#### 1. Preview selection

**File**: `src/lib/trainer-preview.ts`, `src/lib/trainer-preview.test.ts`

**Intent**: Keep the "which list" rule out of the page so the tie and the unknown-id fallback are tested.

**Contract**: Input is the caller's links (`traineeId`, `email`, `linkedAt`) and an optional trainee id. Output is the links sorted by `email` ascending, plus the selected link or null when there are no links. A param that equals one of the link ids selects that link. A missing param, or a param that matches no link, selects the greatest `linked_at`. When `linked_at` ties, the lower `trainee_id` string wins. Tests cover a matching param, a missing param, an unknown param, a `linked_at` tie, and an empty list.

#### 2. List the caller's links

**File**: `src/lib/services/trainer-links.ts`

**Intent**: Read the rows the trainer is allowed to see.

**Contract**: `listTrainerLinks(supabase)` selects `trainee_id`, `email`, and `linked_at` from `trainer_links` with no client-side filter beyond RLS. It returns `{ ok: true, links }` or `{ ok: false }`. It does not join `profiles` or `auth.users`.

#### 3. Trainer dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Show the link form, the protégé emails, and one existing measurement list.

**Contract**: Trainee branch stays as it is, including `MeasurementForm` and `listMeasurements(supabase, user.id)`. Trainer branch still shows heading `Trainer`, the email, and Sign out. Add a form `POST` to `/api/trainer-links` with field `email` and submit label `Link trainee`. When a protégé is selected, include hidden `trainee` with that id. Render the `error` query on this branch. List the sorted emails as links to `/dashboard?trainee=<id>`. Mark the selected email. Load `listMeasurements(supabase, selected.traineeId)` and render `MeasurementList` with those entries, so notes and deltas stay the trainee's list. Zero entries shows `No measurements yet`. A failed load shows `Could not load measurements`. No links: show the form and the error line only, not `No measurements yet` and not a measurement list. Do not render `MeasurementForm` for a trainer. Ignore a `trainee` query that is not in the loaded links.

#### 4. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Lock one-list preview, the latest-link default, and the unchanged trainee journal.

**Contract**: Link the trainee already used by smoke first, and give that trainee a note that appears on their list. Link a second trainee after the first. The later trainee gets two measurements with different weights, so the newer entry has an arrow, and a different note. `GET /dashboard` as the trainer, with no query, contains the later-linked email, that trainee's note, and a delta marker (`↑` or `↓`), and does not contain `Add measurement` or the earlier trainee's note. `GET /dashboard?trainee=<earlier id>` contains the earlier note and does not contain the later note. The trainee's own `GET /dashboard` still contains `Add measurement`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm test` passes, including preview selection: a matching `trainee` param wins; a missing or unknown param selects the greatest `linked_at` and, on a tie, the lower `trainee_id`; an empty link list selects nothing
- `npm run smoke` passes: with two protégés, `/dashboard` with no query contains the later-linked email, that trainee's note, and a delta marker, and does not contain `Add measurement` or the earlier trainee's note; opening the earlier protégé's `?trainee=` contains that trainee's note and not the later trainee's note; a trainee dashboard still contains `Add measurement`

#### Manual Verification:

- Linked emails are listed A–Z
- Sign out and sign in shows the most recently linked protégé, not a protégé only chosen earlier in the previous visit
- A linked trainee with no entries shows `No measurements yet` and no measurement form
- A trainer with no links sees the email form and does not see `No measurements yet`
- `?trainee=` for an id this trainer has not linked does not show `No measurements yet` for that id; it shows the latest linked protégé, or the form alone when the trainer has no links

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `selectTrainerPreview`: matching param, missing param, unknown param, equal `linked_at` with a lower `trainee_id` winning, empty list.
- Existing `withDeltas` tests stay the comparison contract. Do not reimplement deltas in the trainer path.

### Integration Tests:

- `npm run smoke` against the preview server: link redirects, the single failure sentence, the blank-email sentence, trainer measurement POST still rejected, two-protégé preview, trainee journal unchanged.

### Manual Testing Steps:

1. Apply the migration and run the RLS and function checks as `authenticated` with a real `sub`.
2. Link a trainee who has two entries and confirm the arrow, the difference, and the note match the trainee's journal.
3. Link a second trainee and confirm A–Z order, the latest-link default after sign-in, and that a click does not stick after sign-out.
4. Submit an unknown email, a trainer email, and a blank email.
5. Sign in as a trainee the trainer did not link and confirm that trainee's journal is unchanged and the trainer does not see it.

## Performance Considerations

`target_scale.users` is small. A trainer dashboard load is one select of that trainer's links plus one select of the selected trainee's measurements. No pagination or caching.

## Migration Notes

The migration only adds a table, a function, and a permissive `SELECT` policy. Workers Builds applies it on `main` before the new Worker. The previous Worker never calls the function or the table, and the trainee's existing select policy still matches that trainee's rows. No backfill. Rollback of the Worker leaves the table and links in place. A later slice that removes links would add a delete path; this slice does not.

## References

- Slice outcome: `context/foundation/roadmap.md` (S-04, change id `trainer-link-preview`)
- Requirements: `context/foundation/prd.md` (FR-007, FR-008, Access Control, Business Logic)
- Reserved trainer select: `context/archive/2026-09-27-trainee-measurement-delta/plan.md`
- Trainer dashboard: `context/archive/2026-09-28-trainer-signup/plan.md`
- Journal page: `src/pages/dashboard.astro`
- List and deltas: `src/lib/services/measurements.ts`, `src/lib/measurement-deltas.ts`, `src/components/measurements/MeasurementList.astro`
- Measurement grants: `supabase/migrations/20260928043200_trainee_measurements.sql`
- Profile grants: `supabase/migrations/20260927065512_trainee_profile.sql`, `supabase/migrations/20260927100031_profiles_explicit_grants.sql`
- Smoke: `scripts/smoke.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Link storage

#### Automated

- [x] 1.1 `npm run lint` passes — f0a9deb
- [x] 1.2 `npx astro check` passes — f0a9deb
- [x] 1.3 Regenerating with `npm run db:types` leaves `src/db/database.types.ts` unchanged (`git diff --exit-code src/db/database.types.ts`) — f0a9deb

#### Manual

- [ ] 1.4 Local Supabase applies the new migration; `trainer_links` has RLS enabled; `authenticated` can select and cannot insert, update, or delete; `anon` has no privileges
- [ ] 1.5 As a trainer, `link_trainee_by_email` returns the trainee id when that email has a `profiles` row with role `trainee`; returns null for an unknown email, a trainer email, the caller's own email, and an auth user who signed up as trainee but has no profile row; a second call inserts no row and does not change `linked_at`
- [ ] 1.6 A trainer select on `measurements` returns rows only for linked trainees; a trainee select still returns only that trainee's rows; a trainer insert into `measurements` is rejected; a direct insert into `trainer_links` as `authenticated` is rejected

### Phase 2: Link request

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run smoke` passes: a trainer POST of a trainee email redirects to `/dashboard?trainee=` with that trainee's id; repeating the POST redirects to the same id; an unknown email, the trainer's own email, and a POST from a trainee session each redirect to `/dashboard?error=` and the following dashboard contains `No trainee with that email`; a blank email redirects to `/dashboard?error=` and the dashboard contains `Enter an email address` and does not contain `No trainee with that email`; a trainer measurement POST still redirects to `/dashboard?error=`

#### Manual

- [ ] 2.3 While a protégé id is posted as `trainee`, a failed link redirects with both `error` and that `trainee` id, and the trainer dashboard shows `No trainee with that email`

### Phase 3: Trainer preview

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npx astro check` passes
- [ ] 3.3 `npm test` passes, including preview selection: a matching `trainee` param wins; a missing or unknown param selects the greatest `linked_at` and, on a tie, the lower `trainee_id`; an empty link list selects nothing
- [ ] 3.4 `npm run smoke` passes: with two protégés, `/dashboard` with no query contains the later-linked email, that trainee's note, and a delta marker, and does not contain `Add measurement` or the earlier trainee's note; opening the earlier protégé's `?trainee=` contains that trainee's note and not the later trainee's note; a trainee dashboard still contains `Add measurement`

#### Manual

- [ ] 3.5 Linked emails are listed A–Z
- [ ] 3.6 Sign out and sign in shows the most recently linked protégé, not a protégé only chosen earlier in the previous visit
- [ ] 3.7 A linked trainee with no entries shows `No measurements yet` and no measurement form
- [ ] 3.8 A trainer with no links sees the email form and does not see `No measurements yet`
- [ ] 3.9 `?trainee=` for an id this trainer has not linked does not show `No measurements yet` for that id; it shows the latest linked protégé, or the form alone when the trainer has no links
