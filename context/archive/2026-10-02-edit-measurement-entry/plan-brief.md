# Trainee edits an entry — Plan Brief

> Full plan: `context/changes/edit-measurement-entry/plan.md`

## What & Why

A trainee can correct a measurement entry they created. The list then shows each arrow and difference against the previous remaining entry, using the edited values. That is S-05 (US-01, FR-004): the comparison stays honest after a correction, and only the owner can make it.

## Starting Point

Create, list, and `withDeltas` already exist. The form posts to `POST /api/measurements`, the list is server-rendered, and the trainer panel reuses that list. The table grants select and insert only. There is no update path and no Edit control.

## Desired End State

Each trainee row has Edit. It opens `/measurements?edit=<id>` and fills the existing form with that entry. Save updates the row; Cancel returns to adding and writes nothing. Reloading the list recomputes every arrow.

Entry A is 2026-01-01 at 80.0 kg. Entry B is 2026-01-08 at 82.0 kg, so B shows `↑ 2.0` versus A. Saving A as 81.0 kg makes B show `↑ 1.0`. Saving B's date as 2025-12-28 makes B the oldest row, with no delta, rendered below A. A is the top row and its weight shows `↓ 2.0` versus B. A linked trainer sees those rows and arrows, and no Edit control.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| Date on edit | Editable, same rules as create | A wrong date is fixable, and `withDeltas` already reorders by `measured_on`. |
| How edit starts | Prefill the existing form from `?edit=` | Reuses the horizontal form and the POST-then-redirect path. |
| Who can edit | The owning trainee only | The trainer list stays read-only and does not receive Edit. |
| Same-day order | `created_at` is not written | Editing numbers or the note does not reshuffle rows that share a date. |
| Payload | Full create payload, form prefilled | All eight numbers stay required; clearing the note stores null. |
| Write route | `POST /api/measurements/[id]` | Create's `POST /api/measurements` stays insert-only. |
| Deltas | Existing `withDeltas` on reload | Neighbor arrows follow the edited values without a second comparison. |

## Scope

**In scope:**

- Additive update grant and an owning-trainee RLS policy
- Update service and `POST /api/measurements/[id]`
- Trainee Edit link, prefilled form, Save, and Cancel
- Kitchen-sink captions that would otherwise say a row is not a control

**Out of scope:**

- Delete (S-06)
- Trainer edit, `updated_at`, and writing `created_at`
- Delta coloring, a date filter, and a new comparison implementation
- A separate edit page or an editing-form kitchen-sink fixture

## Architecture / Approach

The journal stays a form post and a full-page redirect. The update route reuses the create schema. The service writes the date, eight numbers, and note, and leaves `created_at` alone. The trainee page resolves `edit` against that trainee's own rows. `MeasurementList` renders Edit only when the trainee journal passes a href, so the trainer panel is unchanged.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Persist an edit | Update policy, service, and POST route | A policy that allows more than the owning trainee |
| 2. Edit from the journal | Prefill, Save, Cancel, trainee-only Edit | Edit leaking onto the shared trainer list, or a failed save dropping `edit` |

**Prerequisites:** S-02 is done (storage, list, deltas). S-04 is done, so the trainer preview must be checked. Manual checks need a running app, the new migration applied locally, and a trainee account.
**Estimated effort:** ~1–2 sessions across 2 phases.

## Open Risks & Assumptions

- The date picker's `max` is local today, while the server allows UTC now plus one day. Edit mode uses the later of local today and the stored date so an already saved date can be submitted unchanged.
- A failed save must redirect with `edit` still set. Otherwise the trainee lands on the add form.
- Assumption: zero updated rows is the same generic save failure as any other write error. The page does not reveal whether the id belonged to someone else.

## Success Criteria (Summary)

- The trainee can change the date, the numbers, and the note on an entry they created.
- After save, every affected row shows the arrow and difference versus its new previous entry, including the A/B examples above.
- Cancel writes nothing, and a linked trainer sees the updated list without an Edit control.
