# Trainee deletes an entry — Plan Brief

> Full plan: `context/changes/delete-measurement-entry/plan.md`

## What & Why

A trainee can delete a measurement entry they created. The product keeps the up/down difference against the previous entry that is still there, which is the comparison FR-005 already requires. The trainer's preview stays read-only.

## Starting Point

Create, list, edit, and `withDeltas` are live on `/measurements`. Edit is a per-row link and a `?edit=` form, only on the trainee journal. The measurements table can be selected, inserted, and updated by the owning trainee. Nothing grants or performs delete.

## Desired End State

On each of their rows the trainee sees Delete under Edit. The link opens a confirm line on that row: `Delete measurement from <date>?`, then Delete or Cancel. Cancel leaves the row. Delete removes it.

With A on 2026-01-01 at 80.0 kg, B on 2026-01-08 at 82.0 kg (`↑ 2.0` versus A), and C on 2026-01-15 at 81.0 kg (`↓ 1.0` versus B), deleting B leaves A with no comparison and C showing `↑ 1.0` versus A. A linked trainer sees that list and no Delete control.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Confirmation | Second step on the row via `?delete=` | An accidental click must not remove the row, and the UI kit has no dialog | Plan |
| Control placement | Delete beside Edit on the trainee row only | The trainee can delete without opening the form, and the trainer list stays read-only | Plan |
| Removal | Hard delete of the owned row | FR-005 compares remaining entries, and the table has no `deleted_at` | PRD |
| Comparison | Existing `withDeltas`, unchanged | Order is already `measured_on`, then `created_at`, then `id` | PRD |
| Open edit | Keep `edit` when deleting another row; drop it when deleting the open row | The form must not keep pointing at a row that is gone | Plan |
| Errors | Generic `Could not delete the measurement` | A failed delete does not reveal whether another trainee owns that id | Plan |

## Scope

**In scope:**

- Additive delete grant and an owner-only trainee RLS policy
- `deleteMeasurement` and `POST /api/measurements/[id]/delete`
- Delete link, confirm line, and Cancel on the trainee list
- Keeping or clearing `edit` as in the decisions table
- Kitchen-sink captions for the new link

**Out of scope:**

- Soft delete, undo, and Delete on the edit form
- Trainer delete, delta-rule changes, and a new dialog component
- A kitchen-sink section for the confirm step
- Smoke-script coverage

## Architecture / Approach

The confirm step is the same kind of server round-trip as edit. `?delete=<id>` renders one confirm form on the matching row. That form posts to a new delete route, which removes one owned row and redirects to `/measurements`. The next load runs the existing `withDeltas` pass. `TrainerPanel` does not receive the delete props, so its list stays read-only.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Persist a delete | RLS delete policy, service, and POST route | A policy wider than the owning trainee |
| 2. Confirm and delete from the journal | Row link, confirm step, and reloaded arrows | Delete showing up on the shared trainer list |

**Prerequisites:** S-02 is done. The journal already edits, so this plan keeps `edit` working beside delete.
**Estimated effort:** about two sessions across two phases.

## Open Risks & Assumptions

- The local database needs the new migration before the journal manual test. Until then a delete fails closed and shows the generic error.
- Choosing Delete, Cancel, or the confirm submit reloads the page, so unsaved numbers in the edit form are discarded. A kept `edit` shows the stored row.

## Success Criteria (Summary)

- The trainee confirms, then removes an entry they created, and Cancel removes nothing.
- Each remaining entry shows the arrow and difference versus the previous remaining entry, and the oldest remaining entry has none.
- A linked trainer sees that list and has no Delete control.
