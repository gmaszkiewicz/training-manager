# Horizontal Measurements — Plan Brief

> Full plan: `context/changes/horizontal-measurements/plan.md`

## What & Why

Phases 1–3 put the form, each saved entry, and the linked trainees into sideways-scrolling rows. The list still prints `Hips 50.0 cm` beside the label. The next step puts the label above the value, the delta beside the value, and drops both scrollbars.

## Starting Point

The form and the list are already horizontal rows with `overflow-x-auto` and `w-48` columns. A list cell is one phrase plus a delta. Linked emails are a non-wrapping scrolling row. Both cards are `max-w-2xl`.

## Desired End State

The trainee still enters Date and the eight measurements in one row, and that row no longer scrolls. Each saved entry shows the label above a read-only box and the delta beside the box, for example `Hips` above `50.0 cm` with `↑ 0.5` next to it. The box matches the form field's border, radius, and height, and it is not editable. Columns are narrower than `w-48`. The card grows past `max-w-2xl` only if the row still cannot fit. Linked emails wrap to the next line and do not scroll. Saved values, deltas, and who is linked do not change.

## Key Decisions Made

| Decision        | Choice                                                                 | Why (1 sentence)                                                                                          |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Row contents    | Date plus the eight measurements; note and Add measurement below       | A long note would squash the number inputs, and the date belongs with the values it labels.              |
| List cell       | Label above the value; delta beside the value                          | `Hips 50.0 cm ↑ 0.5` on one line hides which part is the heading and which is the change.               |
| Read-only cue   | Input border, radius, and height, with no focus ring                   | The row should look like the form, and the missing ring shows the value cannot be edited.               |
| Measurement fit | Narrower than `w-48`, no horizontal scrollbar; widen the card if needed | Shrinking the columns is the first lever; `max-w-2xl` grows only when it is what causes the scrollbar.  |
| Linked trainees | Wrap to the next line, no horizontal scrollbar                         | A scrollbar hides later emails; wrapping keeps every address on the card.                                |

## Scope

**In scope:**

- Read-only measurement row: label above the value, delta beside the value, no horizontal scrollbar
- Narrower measurement columns, and a wider card only if the row still does not fit
- Form row aligned to those columns, also without a horizontal scrollbar
- Linked trainees wrapping onto the next line, without a horizontal scrollbar

**Out of scope:**

- Wrapping measurement fields onto a second line
- A horizontal scrollbar on the measurement row or the trainee list
- Widening the card further than the date and eight columns need
- Note, Add measurement, or the link form inside those rows
- Stored values, validation, delta math, who is linked, edit, or delete

## Architecture / Approach

Phase 4 edits `MeasurementList.astro`, the form column width in `MeasurementForm.tsx`, and the card plus trainee list in `TraineeJournal.astro` and `TrainerPanel.astro`. Field order stays `measurementFields`. Trainee order stays the `trainerLinks` array. The link form stays above the emails.

## Phases at a Glance

| Phase              | What it delivers                                              | Key risk                                                                 |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Form row        | Trainee enters Date and eight measurements in a scrolling row | The nowrap row widens the card unless the card has `min-w-0` and the row scrolls |
| 2. Shared list row | Trainee and trainer read each entry in that same kind of row | A long error or delta phrase stretches a cell if its width is not stable |
| 3. Linked trainee row | Linked trainees sit beside each other in one scrolling row | Superseded for overflow by phase 4: emails wrap, they do not scroll |
| 4. Fitted read-only row | Label above the value, delta beside it, no scrollbar | Columns can get too narrow to read if the card is not widened |

**Prerequisites:** Phases 1–3 are in the tree. Local app via `npm run dev`.
**Estimated effort:** One session for phase 4. Phases 1–2 are already done.

## Open Risks & Assumptions

- On a very narrow window the columns get small before a scrollbar is allowed. Widening the card cannot exceed the viewport.
- A field error, including a long date message, must still wrap inside its own form cell.
- A later linked trainee moves to the next line instead of sitting off-screen.

## Success Criteria (Summary)

- A trainee enters Date and the eight measurements in one row with no horizontal scrollbar.
- The trainee and a linked trainer read each field as a label above a read-only value, with the delta beside the value.
- Submitting an entry still stores the same values, and the earliest entry still has no delta.
- Linked trainee emails wrap to the next line, and the link form stays above them.
