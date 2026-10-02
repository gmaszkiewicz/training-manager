# Trainee deletes an entry Implementation Plan

## Overview

A trainee can delete a measurement entry they created. The delete is permanent and asks for confirmation on that row before the row is removed. Each remaining entry then compares to the previous remaining entry. A linked trainer sees that updated list and cannot delete.

## Current State Analysis

Create, list, and edit already exist. `listMeasurements` loads the trainee's rows and `withDeltas` orders them by `measured_on`, then `created_at`, then `id`, and compares each numeric field to the previous row (`src/lib/measurement-deltas.ts`). The oldest row has no delta. Notes are not compared.

The journal at `/measurements` renders `MeasurementForm` and a server-rendered `MeasurementList`. Edit is opt-in: `TraineeJournal` passes `editHref`, and `?edit=<id>` prefills the form. `TrainerPanel` renders the same list with no `editHref`. Save posts to `POST /api/measurements/[id]` and redirects. A failed save keeps `edit` and shows a generic error.

The measurements table grants `select`, `insert`, and `update`. `measurements_update_own_trainee` allows update only when `auth.uid() = trainee_id` and the profile role is `trainee` (`supabase/migrations/20261002120000_measurements_update_own.sql`). There is no delete grant, no delete policy, no delete service, and no delete control.

## Desired End State

A signed-in trainee on `/measurements` sees **Delete** under **Edit** on each of their rows. Choosing it opens `/measurements?delete=<id>` (keeping `edit` when the journal is already editing) and shows `Delete measurement from <measured_on>?` on that row, with a **Delete** submit and a **Cancel** link. Cancel writes nothing. Delete removes that row.

After a successful delete the list reloads. `withDeltas` runs again on the rows that remain. The list prints that with `formatDelta`: `↑ 2.0`, `↓ 1.0`, or `0.0`. Example: entry A is 2026-01-01 at 80.0 kg, entry B is 2026-01-08 at 82.0 kg, and entry C is 2026-01-15 at 81.0 kg. Before the delete, A has no comparison, B shows `↑ 2.0` versus A, and C shows `↓ 1.0` versus B. Deleting B leaves A with no comparison and C showing `↑ 1.0` versus A. Deleting C instead leaves B showing `↑ 2.0` versus A. Deleting A leaves B with no comparison and C showing `↓ 1.0` versus B. Deleting the only remaining entry shows `No measurements yet`.

A trainer linked to that trainee sees the same remaining rows and arrows, and no Delete control. Another trainee's id in `delete` does not remove their data and does not show a confirm form.

### Key Discoveries:

- Delta tests already cover order by `measured_on`, then `created_at`, then `id`, including a single remaining entry with null deltas (`src/lib/measurement-deltas.test.ts`). This slice does not change that function.
- `MeasurementList.astro` is shared. Delete links must be opt-in or the trainer panel gains them (`src/components/trainer/TrainerPanel.astro` renders `<MeasurementList entries={entries} />`).
- The date column is `w-36`. Edit is a block link under the date (`src/components/measurements/MeasurementList.astro`). A confirm sentence does not fit in that column; the note already spans the row below the fields.
- Mutations are HTML `POST` forms (`MeasurementForm`, trainer link, sign-out). There is no dialog component under `src/components/ui/`. Edit mode is the query `edit`, not a client modal.
- Migrations apply before the new Worker. An additive `DELETE` grant is safe for the previous Worker, which never deletes.

## What We're NOT Doing

- A soft delete, `deleted_at`, undo, or a trash list.
- Letting a trainer create, edit, or delete measurements.
- Changing `withDeltas`, arrow formatting, units, or good/bad coloring.
- A date filter (FR-009).
- Putting Delete on the edit form. The control is on the row.
- A browser `confirm()` dialog or a new dialog component.
- A new kitchen-sink section for the confirm step. The sink keeps showing the row links, as it does for Edit.
- Overloading `POST /api/measurements` or `POST /api/measurements/[id]`. Create stays insert-only. Update stays the edit save.
- Writing `created_at` on any remaining row. Delete removes one row and leaves the others untouched.
- A measurement detail route or a JSON API.
- Extending `scripts/smoke.mjs`. Smoke stays the create and preview flow.

## Implementation Approach

Follow the edit path's ownership boundary and its form-POST-then-redirect shape, with a separate delete route. A new migration grants `delete` and adds one RLS policy for the owning trainee, mirroring the update policy's role check. The service deletes one owned row. Success and failure both redirect to `/measurements`. The page resolves `delete` against the trainee's own list and shows the confirm step only for a matching row.

`withDeltas` is unchanged. Removing the row is what makes each remaining entry compare to the previous remaining entry.

## Critical Implementation Details

- **The confirm prompt sits under the fields.** The date column is `w-36` and already holds the date plus Edit. The prompt `Delete measurement from <measured_on>?`, the submit, and Cancel span the row the way the note does, immediately after the field row and before an existing note. Only the matching row confirms. Other rows keep their Delete links.

- **An open edit survives only when a different row is deleted.** The Delete link and Cancel keep the current `edit` value. The confirm form posts that id in a hidden `edit` field, including when it equals the row being deleted. Success redirects to `/measurements?edit=<edit>` when that value is a UUID and is not the deleted id. Success redirects to `/measurements` when `edit` is missing, not a UUID, or equal to the deleted id. The navigation reloads the page, so typed values that were not saved are discarded. A kept `edit` shows the stored row again.

- **A failed delete stays on the confirm step.** A UUID path that deletes zero rows, or a configured-client error, redirects to `/measurements?delete=<id>&error=Could%20not%20delete%20the%20measurement`, and includes `edit` when the hidden field is a UUID. A path id that is not a UUID redirects to `/measurements?error=Could%20not%20delete%20the%20measurement` with neither `delete` nor `edit`. The message does not include the id. A `delete` id that is not in this trainee's list renders no confirm form.

## Phase 1: Persist a delete

### Overview

The owning trainee can delete one measurement row through a POST route. The journal UI stays as it is.

### Changes Required:

#### 1. Delete policy

**File**: `supabase/migrations/20261002150000_measurements_delete_own.sql`

**Intent**: Let the signed-in trainee delete their own rows, and leave every other operation as it is.

**Contract**: Additive migration only. `grant delete on public.measurements to authenticated`. One policy, `measurements_delete_own_trainee`, `for delete to authenticated`. `using` requires `auth.uid() = trainee_id` and a `profiles` row for `auth.uid()` with `role = 'trainee'`, matching `measurements_update_own_trainee`. No `with check`. No column changes, no change to the select, insert, or update policies, and no revoke of existing grants.

#### 2. Delete service

**File**: `src/lib/services/measurements.ts`

**Intent**: Delete one row owned by the trainee and report failure when the write does not remove a row.

**Contract**: `deleteMeasurement(supabase, traineeId, measurementId)` returns `{ ok: true } | { ok: false }`. It deletes where `id` and `trainee_id` match and selects the deleted `id`. Zero rows or a client error is `{ ok: false }`. It does not insert, update, or change `listMeasurements`. It does not write `created_at` on any row.

#### 3. Delete route

**File**: `src/pages/api/measurements/[id]/delete.ts`

**Intent**: Remove the entry in the path after a form post, and redirect back to the journal.

**Contract**: `prerender = false`. `POST` only. Unauthenticated requests redirect to `/auth/signin`. Missing Supabase config redirects to `/measurements?delete=<id>&error=Supabase%20is%20not%20configured`, plus `edit` when the form field `edit` is a UUID. The path `id` must be a UUID; otherwise redirect to `/measurements?error=Could%20not%20delete%20the%20measurement` with no `delete` and no `edit`. `deleteMeasurement` success redirects to `/measurements?edit=<edit>` when form `edit` is a UUID other than the path id, and to `/measurements` otherwise. Failure redirects to `/measurements?delete=<id>&error=Could%20not%20delete%20the%20measurement`, plus `edit` when form `edit` is a UUID. The route does not parse measurement fields. `POST /api/measurements` and `POST /api/measurements/[id]` stay as they are.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes
- `npm run lint` passes

#### Manual Verification:

- The new migration grants delete to authenticated and adds one delete policy for the owning trainee; it does not grant further privileges, drop select, insert, or update, or change columns, and it is applied to the local database with `npx supabase migration up`, or by stopping and starting Supabase, before the journal test

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Confirm and delete from the journal

### Overview

The trainee confirms on a row, deletes or cancels, and the reloaded list shows arrows from the entries that remain. The trainer list stays read-only. The files this phase edits are already in the token scan.

### Changes Required:

#### 1. Resolve the delete query

**File**: `src/pages/measurements.astro`

**Intent**: Show the confirm step only for a row in the trainee's own list, and ignore `delete` for a trainer.

**Contract**: Read `delete` only when `role === "trainee"`. If it equals an `id` in `entries`, pass that entry to `TraineeJournal` as the entry being confirmed and pass `serverError` from the `error` query. If `delete` is present and no entry matches, pass no confirming entry. `serverError` is the `error` query when present, otherwise `Could not delete the measurement`. Do not include the raw id in the message. That missing-delete message wins over the edit-miss message when both ids miss and `error` is absent. Edit resolution is otherwise unchanged. Trainer rendering ignores `delete`.

#### 2. Turn on Delete links

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Offer delete only on the trainee journal, and keep an open edit in the links around it.

**Contract**: New optional confirming entry. `MeasurementList` receives a delete-link builder and the confirming id only from this component. Each delete href is `/measurements?delete=<id>`, and includes `edit` when an entry is being edited. Empty and load-error states stay as they are. The heading and `MeasurementForm` stay on the add or edit copy they already use. `serverError` still renders through the form.

#### 3. Confirm on the matching row

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Let the trainee start and confirm a delete without adding that control to the trainer list.

**Contract**: Optional delete href per entry, and an optional confirming id, both default absent. When the href is present and this row is not the confirming id, the date column includes an anchor under Edit whose visible text is `Delete` and whose accessible name is `Delete measurement from <measured_on>`. Use the same focus ring as Edit. When this row is the confirming id, the date column does not show that Delete link. Immediately after the field row, and before the note when the entry has one, the row shows `Delete measurement from <measured_on>?`, a `POST` form to `/api/measurements/<id>/delete`, a submit whose visible text is `Delete`, and a Cancel anchor. The form includes hidden `edit` when a preserve-edit id was passed. Cancel goes to `/measurements`, or to `/measurements?edit=<id>` when that preserve-edit id is set. No delete href means the row markup stays as it is today. `src/components/trainer/TrainerPanel.astro` keeps `<MeasurementList entries={entries} />` and is not given these props.

#### 4. Kitchen-sink captions

**File**: `src/pages/kitchen-sink/journal.astro`

**Intent**: Keep the sink's captions true once a trainee row contains a Delete link.

**Contract**: The Default journal shows Delete because it renders `TraineeJournal` with a sample entry. Update the Default caption so the sample row shows Edit and Delete. Update the Hover caption so the Edit and Delete links underline on hover and the row chrome still has no hover. Update the Focus-visible caption so the tab order includes those Edit and Delete links. Do not add a confirm-step section.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes
- `npm run lint` passes
- `npm run check:home-tokens` passes

#### Manual Verification:

- Deleting B from A 2026-01-01 at 80.0 kg, B 2026-01-08 at 82.0 kg, and C 2026-01-15 at 81.0 kg removes B, leaves A with no comparison, and makes C show `↑ 1.0` versus A
- Deleting C from that same trio leaves B showing `↑ 2.0` versus A
- Deleting A from that same trio leaves B with no comparison and C showing `↓ 1.0` versus B
- Deleting the only remaining entry shows `No measurements yet`
- Cancel on the confirm step leaves the entry and its arrows unchanged
- A linked trainer sees the remaining entries and arrows and has no Delete control
- A delete id that is not in this trainee's list shows no confirm form and `Could not delete the measurement`
- Deleting a different entry while editing A returns to the edit form for A, and deleting the entry that is open for editing returns to the add form

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Existing `measurement-deltas` tests already cover reorder by `measured_on`, then `created_at`, then `id`, and a single entry with null deltas. Do not add a second comparison implementation, and do not add a test whose only job is to restate that.

### Integration Tests:

- No service-level Supabase test exists today. Do not add a mocked client for `deleteMeasurement`. The route and policy are checked by the phase 1 migration review and the phase 2 journal pass.

### Manual Testing Steps:

1. Apply the migration with `npx supabase migration up`, or by stopping and starting local Supabase.
2. As a trainee, add entry A on 2026-01-01 at 80.0 kg, entry B on 2026-01-08 at 82.0 kg, and entry C on 2026-01-15 at 81.0 kg. Confirm A has no comparison, B shows `↑ 2.0`, and C shows `↓ 1.0`.
3. Choose Delete on B, then Cancel. Confirm B is still there and the arrows are unchanged.
4. Choose Delete on B and submit Delete. Confirm B is gone, A has no comparison, and C shows `↑ 1.0` versus A.
5. Restore the trio. Delete C. Confirm B still shows `↑ 2.0` versus A.
6. Restore the trio. Delete A. Confirm B has no comparison and C shows `↓ 1.0` versus B.
7. Delete entries until none remain. Confirm the journal shows `No measurements yet`.
8. As a linked trainer, open that trainee. Confirm the remaining rows and arrows appear and no Delete control does.
9. Open `/measurements?delete=` with an id that is not in the trainee's list. Confirm there is no confirm form and the text is `Could not delete the measurement`.
10. Open Edit on A, choose Delete on B, and submit. Confirm the journal returns to Edit for A. Open Edit on B and delete B. Confirm the journal returns to the add form.

## Performance Considerations

The journal already loads every measurement for one trainee, and the roadmap's expected scale is small. A delete removes one row and the next page load runs the same `withDeltas` pass as create. No extra query or cache.

## Migration Notes

The new migration only grants `delete` and adds a policy. It is backward compatible: the previous Worker never deletes, so it keeps selecting, inserting, and updating after the migration lands and before this Worker deploys. Rollback of the feature is a later migration that drops the policy and revokes `delete`; this slice does not ship that rollback. Existing rows need no backfill. A deleted row is gone, including its note.

## References

- Roadmap slice: `context/foundation/roadmap.md` — S-06, Change ID `delete-measurement-entry`, PRD refs US-01, FR-005
- Product rule: `context/foundation/prd.md` — US-01, FR-005, Business Logic (comparison after deletes), Access Control
- Edit path this follows: `src/pages/api/measurements/[id].ts`, `src/lib/services/measurements.ts`, `src/pages/measurements.astro`
- Update policy to mirror: `supabase/migrations/20261002120000_measurements_update_own.sql`
- Delta rule: `src/lib/measurement-deltas.ts`
- Journal UI: `src/components/journal/TraineeJournal.astro`, `src/components/measurements/MeasurementList.astro`
- Trainer reuse: `src/components/trainer/TrainerPanel.astro`
- Prior edit plan: `context/archive/2026-10-02-edit-measurement-entry/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Persist a delete

#### Automated

- [ ] 1.1 `npm run test` passes
- [ ] 1.2 `npm run lint` passes

#### Manual

- [ ] 1.3 The new migration grants delete to authenticated and adds one delete policy for the owning trainee; it does not grant further privileges, drop select, insert, or update, or change columns, and it is applied to the local database with `npx supabase migration up`, or by stopping and starting Supabase, before the journal test

### Phase 2: Confirm and delete from the journal

#### Automated

- [ ] 2.1 `npm run test` passes
- [ ] 2.2 `npm run lint` passes
- [ ] 2.11 `npm run check:home-tokens` passes

#### Manual

- [ ] 2.3 Deleting B from A 2026-01-01 at 80.0 kg, B 2026-01-08 at 82.0 kg, and C 2026-01-15 at 81.0 kg removes B, leaves A with no comparison, and makes C show `↑ 1.0` versus A
- [ ] 2.4 Deleting C from that same trio leaves B showing `↑ 2.0` versus A
- [ ] 2.5 Deleting A from that same trio leaves B with no comparison and C showing `↓ 1.0` versus B
- [ ] 2.6 Deleting the only remaining entry shows `No measurements yet`
- [ ] 2.7 Cancel on the confirm step leaves the entry and its arrows unchanged
- [ ] 2.8 A linked trainer sees the remaining entries and arrows and has no Delete control
- [ ] 2.9 A delete id that is not in this trainee's list shows no confirm form and `Could not delete the measurement`
- [ ] 2.10 Deleting a different entry while editing A returns to the edit form for A, and deleting the entry that is open for editing returns to the add form
