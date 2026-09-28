# Trainee measurement delta Implementation Plan

## Overview

A trainee can add a body-measurement entry (date, weight, seven circumferences, optional note) on `/dashboard` and see, for every numeric field, an up/down arrow and the difference versus the previous entry. The oldest entry shows no comparison. This is roadmap slice S-02 (US-01, FR-003, FR-006) — the comparison the PRD calls the product.

## Current State Analysis

S-01 left an empty journal: `/dashboard` ensures a `trainee` profile row and shows `Journal` plus `No measurements yet`. There is no measurement storage, form, API route, or delta logic.

- `/dashboard` renders the journal only after `ensureTraineeProfile` succeeds, and `Could not open your journal` otherwise (`src/pages/dashboard.astro:9-31`).
- `ensureTraineeProfile` casts the client to a hand-written `ProfilesDatabase` shim (`src/lib/services/ensure-trainee-profile.ts:6-39`). Follow-up F5 from S-01 asks this slice to replace it with generated types (`context/archive/2026-09-26-trainee-signup/follow-ups/review-fixes.md`).
- `createClient` returns an untyped `createServerClient` or `null` when env is missing (`src/lib/supabase.ts:5-21`).
- Middleware protects only `/dashboard` (`src/middleware.ts:4`); API routes must check `locals.user` themselves.
- Forms are React islands that validate on the client and do a native `POST` to an API route, which redirects with `?error=` on failure (`src/components/auth/SignUpForm.tsx:50-66`, `src/pages/api/auth/signup.ts`). `FormField` and `ServerError` are reusable (`src/components/auth/FormField.tsx`, `src/components/auth/ServerError.tsx`).
- `public.profiles` is the only table: per-operation RLS plus explicit grants (`supabase/migrations/20260927065512_trainee_profile.sql`, `supabase/migrations/20260927100031_profiles_explicit_grants.sql`).
- zod is required by `CLAUDE.md` for API input but is not installed (`package.json`).
- No unit-test runner. `npm run smoke` (`scripts/smoke.mjs`) runs in CI against the production preview with local Supabase; its location check is `startsWith`, so `/dashboard` also matches `/dashboard?error=…` (`scripts/smoke.mjs:66-67`).
- ESLint runs `strictTypeChecked` plus `eslint-plugin-prettier`, so an unformatted file fails lint (`eslint.config.js:17,89`).

## Desired End State

A signed-in trainee on `/dashboard` sees an add-entry form and, below it, their entries newest first. Each entry shows the date, weight (kg), chest, waist, arm, thigh, calf, hips, navel (cm), and the note if any. Every entry except the oldest shows per field `↑ <diff>` or `↓ <diff>` (absolute difference, one decimal) or `0.0` with no arrow when unchanged. The oldest entry shows no delta. With no entries the page still says `No measurements yet`.

"Previous" means the entry immediately before it when entries are ordered by `measured_on` ascending, then `created_at` ascending (same-date entries: the later-added one counts as later), then `id` for determinism. A backfilled older date slots into that order, and later entries' deltas change accordingly.

Invalid input (a missing number, out of range, more than one decimal, a future date, a note over 1000 characters) is rejected on the client, and again on the server with a redirect to `/dashboard?error=…` that the form shows. Entries are readable and insertable only by the owning trainee.

Verify with: `npm test` (delta and input rules), `npm run smoke` (add → delta visible, invalid rejected, anonymous rejected), and the manual checks in each phase.

### Key Discoveries:

- Ensure-then-render already gates the journal (`src/pages/dashboard.astro:10-13`); the list loads only after that succeeds.
- The native POST + redirect pattern (`src/pages/api/auth/signin.ts`) is what smoke can drive with a form body.
- The insert policy can require a `trainee` profile, so S-03 trainers cannot write measurements even before S-04 exists.
- The Worker runs on UTC. Just after local midnight in Poland (UTC+1/+2), a strict UTC "today" would reject the trainee's real today.

## What We're NOT Doing

- Editing or deleting entries (S-05, S-06); no `UPDATE`/`DELETE` grants or policies.
- Trainer linking or preview (S-04).
- Date filter on the list (FR-009).
- Good/bad coloring of deltas, charts, or trend summaries.
- Unit choice (lb, inch) or conversion — kg and cm only.
- Partial entries: all eight numbers are required on every entry.
- Pagination or limits on the list.
- Keeping typed values in the form after a server-side error redirect.
- A JSON API or client-side list rendering.
- A database-level future-date check. A CHECK on `current_date` is evaluated only on write, and in UTC it would contradict the +1 day tolerance, so the rule lives in the zod schema.

## Implementation Approach

One additive migration creates `public.measurements`, owned by a trainee profile, with range CHECKs that mirror the app rules, per-operation RLS, and explicit `SELECT`/`INSERT` grants. Generated Supabase types replace the hand-written shim, and `createClient` becomes typed.

Two pure modules carry the rules so Vitest can test them and S-04/S-05/S-06 can reuse them: a zod input schema (ranges, one decimal, date cap, note length), used by both the API route and the form island, and a delta function that orders the entries, compares each to its predecessor in integer tenths, and returns them newest first. A thin service reads and inserts through Supabase.

`POST /api/measurements` validates, inserts, and redirects back to `/dashboard`. The dashboard renders the form island and a static list. Smoke drives the whole path with form POSTs.

## Critical Implementation Details

- **Rounding.** Compute differences as `Math.round(current * 10) - Math.round(previous * 10)` and divide by 10 only for display; float subtraction shows `80.3 − 80.1` as `0.19999…`. Zero tenths → `none` (no arrow, `0.0`).
- **Date cap across timezones.** The date input's `max` is the browser's local today. The schema rejects `measured_on` later than UTC today + 1 day, so a Polish trainee at 00:30 local can still log that local date, while clearly future dates are refused. The schema takes `now` as a parameter so tests can fix it.
- **Smoke location check.** `startsWith("/dashboard")` also accepts `/dashboard?error=…`. The success steps must assert the location is exactly `/dashboard`, and the error step asserts it starts with `/dashboard?error=`.
- **Generated types on Windows.** `supabase gen types … > file` in Windows PowerShell 5 writes UTF-16. Run it only through the `npm run db:types` script (npm uses `cmd.exe`), which also runs Prettier on the output so lint does not fail on formatting.

## Phase 1: Measurement storage

### Overview

Create the private measurements table and switch the Supabase client to generated types. The UI does not change.

### Changes Required:

#### 1. Measurements table

**File**: `supabase/migrations/YYYYMMDDHHmmss_trainee_measurements.sql`

**Intent**: Store one row per body-measurement entry, visible and insertable only by the trainee who owns it, and reject values the app would reject.

**Contract**: Table `public.measurements`: `id uuid primary key default gen_random_uuid()`, `trainee_id uuid not null references public.profiles(id) on delete cascade`, `measured_on date not null`, `weight_kg numeric(5,1) not null check (weight_kg between 20 and 400)`, `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, `navel_cm` each `numeric(5,1) not null check (<col> between 10 and 300)`, `note text null check (note is null or char_length(note) <= 1000)`, `created_at timestamptz not null default now()`. Index on `(trainee_id, measured_on, created_at)`. Enable RLS. Policy `measurements_select_own`: `for select to authenticated using (auth.uid() = trainee_id)`. Policy `measurements_insert_own_trainee`: `for insert to authenticated with check (auth.uid() = trainee_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainee'))`. No update or delete policy. `revoke all on public.measurements from anon, authenticated; grant select, insert on public.measurements to authenticated;`. Additive only, so the previous Worker keeps working on the new schema.

#### 2. Generated database types

**File**: `src/db/database.types.ts` (generated), `package.json`, `eslint.config.js`

**Intent**: One source of truth for table shapes instead of hand-written shims.

**Contract**: Script `"db:types": "supabase gen types typescript --local > src/db/database.types.ts && prettier --write src/db/database.types.ts"`. The generated file is committed and exports `Database`. Regenerate whenever a migration changes. The generated file is not linted: add `src/db/database.types.ts` to the ignores entry in `eslint.config.js` next to `.cursor/**` and `.agents/**`, because its `type Database = {…}` and index-signature `Json` break `consistent-type-definitions` and `consistent-indexed-object-style`.

#### 3. Typed client and profile helper

**File**: `src/lib/supabase.ts`, `src/lib/services/ensure-trainee-profile.ts`

**Intent**: Type every query against the generated schema and delete the S-01 shim (F5).

**Contract**: `createClient` calls `createServerClient<Database>(…)`; its return type is `SupabaseClient<Database> | null` and callers are unchanged. `ensureTraineeProfile(supabase: SupabaseClient<Database>, userId: string)` keeps its current return contract and behavior. `ProfileRow`, `ProfileInsert`, `ProfilesDatabase`, `ProfilesClient`, and `profilesClient()` are removed. The `role !== "trainee"` check stays, because the generated `role` is `string`.

#### 4. README

**File**: `README.md`

**Intent**: Document the new table and the types workflow next to the existing migrations note.

**Contract**: One sentence that `public.measurements` holds a trainee's entries (owner-only RLS), and that `npm run db:types` regenerates `src/db/database.types.ts` after a migration (local Supabase running).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- Regenerating with `npm run db:types` leaves `src/db/database.types.ts` unchanged (`git diff --exit-code src/db/database.types.ts`)
- `npm run smoke` passes against a local build (no regression in sign-up, sign-in, or the empty journal)

#### Manual Verification:

- Local Supabase applies the migration, and `public.measurements` has RLS enabled with only the select and insert policies
- As `authenticated` with a trainee's `sub` (`set local role authenticated` + `request.jwt.claims`), inserting a row with another user's `trainee_id` is rejected, and selecting returns only that trainee's rows
- An insert with `weight_kg = 800`, or with `chest_cm` missing, is rejected by the table
- `anon` cannot select from `public.measurements`, and `authenticated` cannot update or delete a row
- `ensure-trainee-profile.ts` contains no hand-written database type or cast

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Delta rule and tests

### Overview

Add the input schema and delta rule as pure modules with a unit-test runner, wired into CI. No UI change yet.

### Changes Required:

#### 1. Shared measurement types

**File**: `src/types.ts`

**Intent**: Name the entry and delta shapes the service, list, and later slices share.

**Contract**: `MeasurementField` = `"weight_kg" | "chest_cm" | "waist_cm" | "arms_cm" | "thigh_cm" | "calf_cm" | "hips_cm" | "navel_cm"`. `MeasurementEntry` = `Omit<Database["public"]["Tables"]["measurements"]["Row"], "trainee_id">`, derived from the generated types so the table has one definition. `FieldDelta` = `{ direction: "up" | "down" | "none"; difference: number }`, where `difference` is the absolute value in kg or cm with one decimal. `MeasurementWithDeltas` = `MeasurementEntry & { deltas: Record<MeasurementField, FieldDelta> | null }`, where `null` means the oldest entry.

#### 2. Input schema

**File**: `src/lib/measurement-input.ts`, `package.json` (add `zod`)

**Intent**: One validation rule for the form island and the API route.

**Contract**: `createMeasurementInputSchema(now: Date)` returns a zod object. `measured_on` is a valid `YYYY-MM-DD` calendar date not later than UTC `now` + 1 day. `weight_kg` is 20–400 inclusive. The seven `_cm` fields are 10–300 inclusive. Every number is required, accepts `,` or `.` as the decimal separator, and has at most one decimal (more is rejected, not rounded). `note` is trimmed; empty becomes `null`; at most 1000 characters. Each error message is a user-readable English sentence naming the field (e.g. `Weight must be between 20 and 400 kg`). Also export a field list with labels and units (`Weight` kg, `Chest`, `Waist`, `Arm`, `Thigh`, `Calf`, `Hips`, `Navel` cm) for the form and list.

#### 3. Delta rule

**File**: `src/lib/measurement-deltas.ts`

**Intent**: The product's core rule, pure and reusable by S-04/S-05/S-06.

**Contract**: `withDeltas(entries: MeasurementEntry[]): MeasurementWithDeltas[]` accepts any order. It sorts ascending by `measured_on`, then `created_at`, then `id`; compares each field to the predecessor in integer tenths; gives the first entry `deltas: null`; and returns newest first. `formatDelta(delta: FieldDelta): string` returns `↑ 1.5`, `↓ 0.2`, or `0.0`.

#### 4. Test runner

**File**: `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`

**Intent**: Run the rule tests locally and in CI.

**Contract**: Dev dependency `vitest`; script `"test": "vitest run"`; `vitest.config.ts` resolves `@` to `./src` and includes `src/**/*.test.ts`. The CI `ci` job gains `- run: npm test` after `npx astro check`.

#### 5. Unit tests

**File**: `src/lib/measurement-deltas.test.ts`, `src/lib/measurement-input.test.ts`

**Intent**: Lock the decided edge cases.

**Contract**: Deltas: an empty list; a single entry gives `deltas: null`; 80.0 → 78.5 gives `↓ 1.5`; 80.1 → 80.3 gives `↑ 0.2` (not a float artifact); equal values give `none`/`0.0`; unsorted input still returns newest first; a backfill (10 Sep 80.0, 20 Sep 78.0, then 15 Sep 79.0) gives 15 Sep ↓ 1.0 vs 10 Sep and 20 Sep ↓ 1.0 vs 15 Sep; two same-date entries compare in `created_at` order. Input: accepts boundaries 20/400 and 10/300; rejects 19.9, 400.1, `80.25`, an empty field, and a note of 1001 characters; accepts `80,5` as 80.5; with a fixed `now`, accepts UTC today + 1 day and rejects + 2 days.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm test` passes, covering every case listed in the unit-test contract

#### Manual Verification:

- The CI `ci` job on the pull request to `main` shows the `npm test` step running and passing

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add and list on the journal

### Overview

Wire the route, form, and list into `/dashboard`, and extend smoke to prove the add → delta path end to end.

### Changes Required:

#### 1. Measurement service

**File**: `src/lib/services/measurements.ts`

**Intent**: Keep the Supabase calls out of the route and page.

**Contract**: `listMeasurements(supabase, traineeId)` returns `{ ok: true; entries: MeasurementWithDeltas[] } | { ok: false }` (it selects the trainee's rows and applies `withDeltas`). `addMeasurement(supabase, traineeId, input)` inserts the parsed input with `trainee_id = traineeId` and returns `{ ok: true } | { ok: false }`. Neither throws.

#### 2. Add route

**File**: `src/pages/api/measurements/index.ts`

**Intent**: Accept the form POST, validate, insert, and return to the journal.

**Contract**: `export const prerender = false`; `POST` only. No `locals.user` → redirect `/auth/signin`. `createClient` is `null` → `/dashboard?error=Supabase is not configured`. Schema failure → `/dashboard?error=<first issue message>`. Insert failure → `/dashboard?error=Could not save the measurement`. Success → `/dashboard`.

#### 3. Form island

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Let the trainee enter an entry with immediate feedback, following the auth-form pattern.

**Contract**: `<form method="POST" action="/api/measurements">` with a date input (default and `max` = local today), eight number inputs (`step="0.1"`, labeled with units, via `FormField`), and a note `<textarea>` (`maxLength` 1000). On submit it validates with `createMeasurementInputSchema(new Date())` and calls `preventDefault` on errors, showing them per field. `ServerError` shows the `serverError` prop. `SubmitButton` reads `Add measurement`.

#### 4. List and page

**File**: `src/components/measurements/MeasurementList.astro`, `src/pages/dashboard.astro`

**Intent**: Show entries newest first with the delta next to each value.

**Contract**: After the ensure succeeds, the page calls `listMeasurements`. On failure it shows `Could not load your measurements` (not `No measurements yet`) and still shows sign-out. On success it renders `MeasurementForm` (`client:load`, `serverError` from `?error=`), then either `No measurements yet` (zero entries) or the list. Each entry shows the date, eight values with units, `formatDelta` output per field when `deltas` is not null, and the note when present. Values and deltas carry an accessible label (e.g. `aria-label="Weight down 1.5 kg"`). Each `formatDelta` output is rendered as one text node (e.g. `<span aria-label=…>↓ 1.5</span>`), never split across elements, because smoke matches the literal `↓ 1.5`. The heading stays `Journal`, the container widens to fit the form and list, and the failure states from S-01 are unchanged.

#### 5. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Prove the built app saves an entry and renders a delta.

**Contract**: Expectations gain an exact-location option. New steps: before signup, an anonymous `POST /api/measurements` expects `302` to `/auth/signin`. After the existing `No measurements yet` step: `weight_kg=800` expects `302` starting with `/dashboard?error=`; a first entry on `2026-01-01` (weight 80.0, all `_cm` 50.0) expects `302` exactly `/dashboard`; a second on `2026-01-02` (weight 78.5, `_cm` 50.0) expects `302` exactly `/dashboard`; then `GET /dashboard` expects `200` with a body containing `↓ 1.5`. The sign-out steps stay last.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm test` passes
- `npm run build` passes
- `npm run smoke` passes against the preview, including the anonymous POST, invalid weight, two saves, and `↓ 1.5` steps

#### Manual Verification:

- The first entry shows its values and no comparison; after a second entry, each field shows `↑`/`↓` with the difference, or `0.0` with no arrow when equal
- Backfilling an older date places it in date order, and the next entry's deltas change to compare against it
- Two entries on the same date: the later-added one compares to the earlier one
- An out-of-range value, a value with two decimals, or an empty field is blocked in the form with a field message; the same input sent past the client (e.g. devtools) returns to `/dashboard` with the server error shown
- The date picker does not offer tomorrow, and the note is shown on its entry
- A second trainee's journal does not show the first trainee's entries
- After merge, the Workers Build applies the migration, and adding an entry on production shows its delta

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `withDeltas` and `formatDelta`: first entry, up/down/zero, tenths rounding, unsorted input, backfill, same-date tie-break.
- `createMeasurementInputSchema`: inclusive range boundaries, one-decimal limit, comma separator, required fields, note length, and the UTC + 1 day date cap with a fixed `now`.

### Integration Tests:

- `npm run smoke` against the production preview with local Supabase (CI `smoke` job): anonymous POST rejected, invalid input rejected, two saves, delta rendered.

### Manual Testing Steps:

1. Apply the migration locally and run the RLS checks as `authenticated` with a real `sub`.
2. Add two entries, then a backfill and a same-date entry, and compare the arrows with the expected order.
3. Try invalid values in the form, and again with client validation bypassed.
4. Sign in as a second trainee and confirm the list is empty.

## Performance Considerations

`target_scale.users` is small. Each `/dashboard` render adds one indexed select of the trainee's rows plus in-memory sorting; no pagination or caching.

## Migration Notes

The migration only adds a table, so it is backward compatible: Workers Builds applies it on `main` before the new Worker, and the old Worker never touches it. No backfill. Worker rollback leaves the table and its data in place. S-05 and S-06 will add `UPDATE`/`DELETE` grants and policies. S-04 will add a trainer `SELECT` policy based on the link table.

## References

- Slice outcome: `context/foundation/roadmap.md` (S-02, change id `trainee-measurement-delta`)
- Requirements: `context/foundation/prd.md` (US-01, FR-003, FR-006, Business Logic)
- Generated-types follow-up: `context/archive/2026-09-26-trainee-signup/follow-ups/review-fixes.md` (F5)
- Prior slice plan: `context/archive/2026-09-26-trainee-signup/plan.md`
- Journal page: `src/pages/dashboard.astro`
- Form pattern: `src/components/auth/SignUpForm.tsx`, `src/pages/api/auth/signup.ts`
- RLS and grants pattern: `supabase/migrations/20260927065512_trainee_profile.sql`, `supabase/migrations/20260927100031_profiles_explicit_grants.sql`
- Smoke: `scripts/smoke.mjs`; CI: `.github/workflows/ci.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Measurement storage

#### Automated

- [x] 1.1 `npm run lint` passes — 989fe05
- [x] 1.2 `npx astro check` passes — 989fe05
- [x] 1.3 Regenerating with `npm run db:types` leaves `src/db/database.types.ts` unchanged (`git diff --exit-code src/db/database.types.ts`) — 989fe05
- [x] 1.4 `npm run smoke` passes against a local build (no regression in sign-up, sign-in, or the empty journal) — 989fe05

#### Manual

- [x] 1.5 Local Supabase applies the migration, and `public.measurements` has RLS enabled with only the select and insert policies — 989fe05
- [x] 1.6 As `authenticated` with a trainee's `sub` (`set local role authenticated` + `request.jwt.claims`), inserting a row with another user's `trainee_id` is rejected, and selecting returns only that trainee's rows — 989fe05
- [x] 1.7 An insert with `weight_kg = 800`, or with `chest_cm` missing, is rejected by the table — 989fe05
- [x] 1.8 `anon` cannot select from `public.measurements`, and `authenticated` cannot update or delete a row — 989fe05
- [x] 1.9 `ensure-trainee-profile.ts` contains no hand-written database type or cast — 989fe05

### Phase 2: Delta rule and tests

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npx astro check` passes
- [x] 2.3 `npm test` passes, covering every case listed in the unit-test contract

#### Manual

- [ ] 2.4 The CI `ci` job on the pull request to `main` shows the `npm test` step running and passing

### Phase 3: Add and list on the journal

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npx astro check` passes
- [ ] 3.3 `npm test` passes
- [ ] 3.4 `npm run build` passes
- [ ] 3.5 `npm run smoke` passes against the preview, including the anonymous POST, invalid weight, two saves, and `↓ 1.5` steps

#### Manual

- [ ] 3.6 The first entry shows its values and no comparison; after a second entry, each field shows `↑`/`↓` with the difference, or `0.0` with no arrow when equal
- [ ] 3.7 Backfilling an older date places it in date order, and the next entry's deltas change to compare against it
- [ ] 3.8 Two entries on the same date: the later-added one compares to the earlier one
- [ ] 3.9 An out-of-range value, a value with two decimals, or an empty field is blocked in the form with a field message; the same input sent past the client (e.g. devtools) returns to `/dashboard` with the server error shown
- [ ] 3.10 The date picker does not offer tomorrow, and the note is shown on its entry
- [ ] 3.11 A second trainee's journal does not show the first trainee's entries
- [ ] 3.12 After merge, the Workers Build applies the migration, and adding an entry on production shows its delta
