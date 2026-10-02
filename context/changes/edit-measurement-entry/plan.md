# Trainee edits an entry Implementation Plan

## Overview

A trainee can open a measurement entry they created, change its date, eight numbers, and note, and save it. The journal then shows each row's arrow and difference against the previous remaining entry, using the edited values. A linked trainer sees that updated list and cannot edit it.

## Current State Analysis

Create and list already exist. `POST /api/measurements` validates `multipart/form-data` with `createMeasurementInputSchema` and inserts one row (`src/pages/api/measurements/index.ts`). `listMeasurements` loads the trainee's rows and `withDeltas` orders them by `measured_on`, then `created_at`, then `id`, and compares each numeric field to the previous row (`src/lib/measurement-deltas.ts`). Notes are not compared. The oldest row has no delta.

The journal at `/measurements` renders `MeasurementForm` (React island, horizontal fields) and a server-rendered `MeasurementList`. The trainer panel renders that same list and does not render the form. The measurements table grants `select` and `insert` only. There is no update policy, no update grant, no update service, and no edit control.

S-02 stored entries so this comparison could exist. S-04 kept the trainer preview read-only. S-06 (delete) is a separate slice.

## Desired End State

A signed-in trainee on `/measurements` sees **Edit** on each of their rows. Choosing it opens `/measurements?edit=<id>` and fills the existing form with that entry's date, eight numbers, and note. **Save measurement** updates that row. **Cancel** returns to the add form and writes nothing.

After a successful save the list reloads. `withDeltas` runs again, so the edited row and every row whose previous entry changed show the new arrow and difference. The list prints that with `formatDelta`: `↑ 2.0`, `↓ 2.0`, or `0.0`. Example: entry A is 2026-01-01 at 80.0 kg and entry B is 2026-01-08 at 82.0 kg, so B shows `↑ 2.0` versus A. Saving A as 81.0 kg makes B show `↑ 1.0`. Saving B's date as 2025-12-28 makes B the oldest row, with no delta, rendered below A. A is the top row and its weight shows `↓ 2.0` versus B. Saving a row, even when no other field changes, sets `created_at` to the time of that save. Among rows that share `measured_on`, that row is then the newest: it sits above the others for that date, and they compare against it. A later `measured_on` still stays above it.

A trainer linked to that trainee sees the same updated rows and arrows, and no Edit control. Another trainee's id in `edit` does not open their data.

### Key Discoveries:

- Create validation already covers the edit payload: required date not later than UTC now plus one day, eight required numbers, optional note trimmed to null (`src/lib/measurement-input.ts`).
- Delta reorder tests already cover `measured_on`, then `created_at`, then `id` (`src/lib/measurement-deltas.test.ts`). This slice does not change that function.
- `MeasurementList.astro` is shared. Edit links must be opt-in or the trainer panel gains them (`src/components/trainer/TrainerPanel.astro`).
- The date input's `max` is the browser's local today (`MeasurementForm.tsx`). A stored date inside the server window can sit after that local today.
- Migrations apply before the new Worker. An additive `UPDATE` grant is safe for the previous Worker, which only selects and inserts.

## What We're NOT Doing

- Deleting an entry (S-06 / FR-005).
- Letting a trainer create, edit, or delete measurements.
- Adding `updated_at`, or writing `id` or `trainee_id` on update.
- Changing `withDeltas`, arrow formatting, units, or good/bad coloring.
- A date filter (FR-009).
- A partial payload that omits a number. The form is prefilled and still submits all eight numbers. Clearing the note stores null, which create already does.
- Overloading `POST /api/measurements`. Create stays insert-only.
- A measurement detail route, inline row editor, or JSON API.
- A new kitchen-sink fixture for the editing form. The add-mode sink stays the add form.

## Implementation Approach

Follow the create path. A new migration grants `update` and adds one RLS policy for the owning trainee, mirroring the insert policy's role check, with `using` and `with check` both requiring `auth.uid() = trainee_id`. The service updates one owned row and sets `created_at` to the time of the save, so that row becomes the newest among rows that share `measured_on`. A different date still reorders only because `withDeltas` sorts on `measured_on` first.

`POST /api/measurements/[id]` reuses `createMeasurementInputSchema` and the form-POST-then-redirect pattern. Success redirects to `/measurements`. Failure redirects to `/measurements?edit=<id>&error=...` so the journal stays on that entry.

The trainee page resolves `edit` against the trainee's own list. A match prefills `MeasurementForm` and points the form at the update route. Each trainee row links to `?edit=<id>`. `TrainerPanel` does not pass that link.

## Critical Implementation Details

- **Date input max while editing.** The create form caps the date picker at the browser's local today, while the server accepts a date through UTC now plus one day. When the form is editing, `max` is the later of local today and that entry's stored `measured_on`, so an already saved date can be submitted unchanged. The server schema is still the create schema. A newly chosen date cannot pass the server window.
- **A failed save must keep the edit id.** Validation and write failures redirect to `/measurements?edit=<id>&error=...`. Dropping `edit` would show the add form and discard which row failed. Client-side validation still prevents a normal invalid submit, as it does for create; the redirect is the server fallback. The reloaded form shows the stored row plus the error, not the rejected typed values.
- **A save is the newest report of that date.** The update payload is `measured_on`, the eight numbers, `note`, and `created_at` set to the time of the save. `withDeltas` is unchanged and already orders by `measured_on`, then `created_at`, then `id`, newest first on the page. Among rows that share `measured_on`, the saved row is the newest, including when the trainee changes nothing else and saves. `id` and `trainee_id` are not written.

## Phase 1: Persist an edit

### Overview

The owning trainee can update one measurement row. Create, list, and the journal UI stay as they are.

### Changes Required:

#### 1. Update policy

**File**: `supabase/migrations/20261002120000_measurements_update_own.sql`

**Intent**: Let the signed-in trainee update their own rows, and leave every other operation as it is.

**Contract**: Additive migration only. `grant update on public.measurements to authenticated`. One policy, `measurements_update_own_trainee`, `for update to authenticated`. Both `using` and `with check` require `auth.uid() = trainee_id` and a `profiles` row for `auth.uid()` with `role = 'trainee'`, matching `measurements_insert_own_trainee`. No `delete` grant, no column changes, no change to the select policies.

#### 2. Update service

**File**: `src/lib/services/measurements.ts`

**Intent**: Update one row owned by the trainee and report failure when the write does not change a row.

**Contract**: `updateMeasurement(supabase, traineeId, measurementId, input)` returns `{ ok: true } | { ok: false }`, same input type as `addMeasurement`. The update sets `measured_on`, `weight_kg`, `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, `navel_cm`, `note`, and `created_at` to the time of the save. It filters `id` and `trainee_id`. It selects the updated `id`. Zero rows or a client error is `{ ok: false }`. It does not insert, delete, or change `listMeasurements`. It does not write `id` or `trainee_id`.

#### 3. Update route

**File**: `src/pages/api/measurements/[id].ts`

**Intent**: Accept the same form post as create and update the entry in the path.

**Contract**: `prerender = false`. `POST` only. Unauthenticated requests redirect to `/auth/signin`. Missing Supabase config redirects to `/measurements?edit=<id>&error=Supabase%20is%20not%20configured`. The path `id` must be a UUID; otherwise redirect to `/measurements?error=Could%20not%20save%20the%20measurement` with no `edit` param. Parse the form with `createMeasurementInputSchema(new Date())` and the same field names as `src/pages/api/measurements/index.ts`. The first schema issue redirects to `/measurements?edit=<id>&error=<message>`. `updateMeasurement` success redirects to `/measurements`. Failure redirects to `/measurements?edit=<id>&error=Could%20not%20save%20the%20measurement`. `POST /api/measurements` stays insert-only.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes
- `npm run lint` passes

#### Manual Verification:

- The new migration grants update to authenticated and adds one update policy for the owning trainee; it does not grant delete, drop select or insert, or change columns, and it is applied to the local database with `npx supabase migration up`, or by stopping and starting Supabase, before the journal test

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Edit from the journal

### Overview

The trainee opens an entry in the existing form, saves or cancels, and the reloaded list shows arrows from the edited values. The trainer list stays read-only.

### Changes Required:

#### 1. Resolve the edit query

**File**: `src/pages/measurements.astro`

**Intent**: Choose add or edit from the trainee's own list, and ignore `edit` for a trainer.

**Contract**: Read `edit` only when `role === "trainee"`. If it equals an `id` in `entries`, pass that entry to `TraineeJournal` as the entry being edited and pass `serverError` from the `error` query. If `edit` is present and no entry matches, pass no editing entry; `serverError` is the `error` query when present, otherwise `Could not open that measurement`. Do not include the raw id in the message. Trainer rendering ignores `edit`. Create's `?error=` behavior is unchanged when `edit` is absent.

#### 2. Switch the journal copy

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Show the add form or the edit form, and turn on Edit links only here.

**Contract**: New optional editing entry prop. When it is set, the heading is `Edit measurement` and `MeasurementForm` receives that entry. When it is absent, the heading stays `Add your next measurement` and the form stays the add form. `MeasurementList` receives an edit-link builder only from this component. Empty and load-error states stay as they are.

#### 3. Prefill the form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Reuse the horizontal form for a new entry or for the entry being edited.

**Contract**: Add mode is unchanged: empty numbers, note empty, date defaults to the browser's local today, `action="/api/measurements"`, button `Add measurement`, pending text `Adding measurement...`. Edit mode initial state is the entry: date is `measured_on`; each number is one decimal place (`toFixed(1)`); a null note is `""`. `action` is `/api/measurements/<id>`. The date input `max` is the later of browser-local today and the entry's `measured_on`. Button text is `Save measurement`, pending text `Saving measurement...`. **Cancel** is an anchor to `/measurements`, not a submit control. Client validation still uses `createMeasurementInputSchema` and still cancels the submit when it fails. `idPrefix` still applies to field ids.

#### 4. Edit link on trainee rows

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Let the trainee open one row for editing without adding that control to the trainer list.

**Contract**: Optional edit href per entry, default absent. When present, the date column includes an anchor whose visible text is `Edit` and whose accessible name is `Edit measurement from <measured_on>`, linking to `/measurements?edit=<id>`. Use the same focus ring as the trainer email links. No href means the row markup stays as it is today. `src/components/trainer/TrainerPanel.astro` keeps `<MeasurementList entries={entries} />` and is not given this prop.

#### 5. Kitchen-sink captions

**File**: `src/pages/kitchen-sink/journal.astro`

**Intent**: Keep the sink's captions true once a trainee row contains an Edit link.

**Contract**: The Default journal shows Edit because it renders `TraineeJournal` with a sample entry. Update the Hover caption so the Edit link underlines on hover and the row chrome still has no hover. Update the Focus-visible caption so the tab order includes that Edit link. Leave the Disabled and Loading captions on the add-form pending text `Adding measurement...`. Do not add an editing-form section.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes
- `npm run lint` passes

#### Manual Verification:

- Changing entry A from 80.0 kg to 81.0 kg makes entry B show `↑ 1.0` versus A
- Changing entry B's date from 2026-01-08 to 2025-12-28 makes B the oldest row, with no delta, below A. A is the top row and its weight shows `↓ 2.0` versus B
- Saving an entry without changing its date makes that entry the newest among rows that share that date
- Cancel returns to the add form and does not save
- A linked trainer sees the edited values and arrows and has no Edit control
- An edit id that is not in this trainee's list shows the add form and "Could not open that measurement"

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Existing `measurement-deltas` tests already cover reorder by `measured_on`, then `created_at`, then `id`. Do not add a second comparison implementation, and do not add a test whose only job is to restate that.
- Existing `measurement-input` tests cover the schema the update route reuses. No schema change is in this slice.

### Integration Tests:

- No service-level Supabase test exists today. Do not add a mocked client for `updateMeasurement`. The route and policy are checked by the phase 1 migration review and the phase 2 journal pass.

### Manual Testing Steps:

1. As a trainee, add entry A on 2026-01-01 at 80.0 kg and entry B on 2026-01-08 at 82.0 kg. Confirm B shows `↑ 2.0`.
2. Edit A to 81.0 kg and save. Confirm B shows `↑ 1.0` and A's date is unchanged.
3. Edit B's date to 2025-12-28 and save. Confirm A is the top row and its weight shows `↓ 2.0` versus B, and B is below A with no delta.
4. Add two entries on the same date. Edit the earlier one without changing its date and save. Confirm it moves above the other row for that date, and that other row compares against it.
5. Open Edit and choose Cancel. Confirm the add form is empty of that entry's values and the row is unchanged.
6. As a linked trainer, open that trainee. Confirm the edited rows and arrows appear and no Edit control does.
7. Open `/measurements?edit=` with an id that is not in the trainee's list. Confirm the add form and the text `Could not open that measurement`.

## Performance Considerations

The journal already loads every measurement for one trainee, and the roadmap's expected scale is small. An update writes one row and the next page load runs the same `withDeltas` pass as create. No extra query or cache.

## Migration Notes

The new migration only grants `update` and adds a policy. It is backward compatible: the previous Worker never updates, so it keeps selecting and inserting after the migration lands and before this Worker deploys. Rollback of the feature is a later migration that drops the policy and revokes `update`; this slice does not ship that rollback. Existing rows need no backfill.

## References

- Roadmap slice: `context/foundation/roadmap.md` — S-05, Change ID `edit-measurement-entry`, PRD refs US-01, FR-004
- Product rule: `context/foundation/prd.md` — US-01, FR-004, Business Logic (comparison after edits), Access Control
- Create path: `src/pages/api/measurements/index.ts`, `src/lib/services/measurements.ts`, `src/lib/measurement-input.ts`
- Delta rule: `src/lib/measurement-deltas.ts`
- Journal UI: `src/pages/measurements.astro`, `src/components/journal/TraineeJournal.astro`, `src/components/measurements/MeasurementForm.tsx`, `src/components/measurements/MeasurementList.astro`
- Trainer reuse: `src/components/trainer/TrainerPanel.astro`
- Prior storage plan: `context/archive/2026-09-27-trainee-measurement-delta/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Persist an edit

#### Automated

- [x] 1.1 `npm run test` passes — c191a61
- [x] 1.2 `npm run lint` passes — c191a61

#### Manual

- [x] 1.3 The new migration grants update to authenticated and adds one update policy for the owning trainee; it does not grant delete, drop select or insert, or change columns, and it is applied to the local database with `npx supabase migration up`, or by stopping and starting Supabase, before the journal test — c191a61

### Phase 2: Edit from the journal

#### Automated

- [x] 2.1 `npm run test` passes
- [x] 2.2 `npm run lint` passes

#### Manual

- [x] 2.3 Changing entry A from 80.0 kg to 81.0 kg makes entry B show `↑ 1.0` versus A
- [x] 2.4 Changing entry B's date from 2026-01-08 to 2025-12-28 makes B the oldest row, with no delta, below A. A is the top row and its weight shows `↓ 2.0` versus B
- [x] 2.5 Saving an entry without changing its date makes that entry the newest among rows that share that date
- [x] 2.6 Cancel returns to the add form and does not save
- [x] 2.7 A linked trainer sees the edited values and arrows and has no Edit control
- [x] 2.8 An edit id that is not in this trainee's list shows the add form and "Could not open that measurement"
