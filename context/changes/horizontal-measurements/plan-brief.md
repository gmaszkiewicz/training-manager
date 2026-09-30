# Horizontal Measurements — Plan Brief

> Full plan: `context/changes/horizontal-measurements/plan.md`

## What & Why

The trainee journal stacks Date and the eight body measurements in a column, and the shared list stacks each entry's fields the same way. The trainer panel also stacks each linked trainee under the previous one. MS-06 asks for the measurement fields in a horizontal row, and for those linked trainees to sit beside each other.

## Starting Point

`MeasurementForm` stacks Date, eight measurements, Note, and Add measurement. `MeasurementList` puts the date above eight lines such as `Weight 82.4 kg ↑ 1.2`. The trainer panel renders that list and, above it, stacks linked emails with `space-y-2`. Both cards are `max-w-2xl`, which cannot show a date plus eight fields, or several emails, on one line at the current size.

## Desired End State

The trainee enters Date and the eight measurements in one row that scrolls sideways inside the current card. Note and Add measurement stay full width underneath. Each listed entry, for the trainee and a linked trainer, shows the date and those eight phrases in one scrolling row. The earliest entry has no delta. A note stays under the row. Linked trainees sit in one scrolling row of emails above that list. The link form stays stacked above them. Saved values, deltas, and who is linked do not change.

## Key Decisions Made

| Decision        | Choice                                                                 | Why (1 sentence)                                                                                          |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Row contents    | Date plus the eight measurements; note and Add measurement below       | A long note would squash the number inputs, and the date belongs with the values it labels.              |
| Narrow screens  | One non-wrapping row that scrolls horizontally at every width          | Wrapping or stacking on a phone would turn the row back into a column.                                   |
| List cell       | The current phrase, side by side, such as `Weight 82.4 kg ↑ 1.2`       | Only the direction of the list changes; the earliest entry still omits the delta.                        |
| Card width      | Keep `max-w-2xl` and add `min-w-0` on both cards                       | Both cards are flex items, so without `min-w-0` the row can grow the card past `max-w-2xl`.             |
| Date column     | The date scrolls away with the row                                     | A sticky date would be a second column, and the agreed row is one scrolling line.                        |
| Linked trainees | One non-wrapping scrolling row of emails                               | The same narrow-screen rule as the measurement row: beside each other, not stacked, including on a phone. |

## Scope

**In scope:**

- Horizontal scrolling entry row on the trainee form
- Horizontal scrolling read row on the shared measurement list
- Same measurement row on the trainer preview, because it uses that list
- Linked trainees in one scrolling row on the trainer panel

**Out of scope:**

- Sticky date, wrapping, or a phone-only column
- A wider card
- Note, Add measurement, or the link form inside a scrolling row
- Stored values, validation, delta math, who is linked, edit, or delete

## Architecture / Approach

Edit `MeasurementForm.tsx`, `MeasurementList.astro`, and the linked-trainee list in `TrainerPanel.astro`. Add `min-w-0` to both cards and keep `max-w-2xl`. Field order stays `measurementFields`. Trainee order stays the `trainerLinks` array. The link form stays above the trainee row. Kitchen sink trainer Default gains a second link so that row is visible.

## Phases at a Glance

| Phase              | What it delivers                                              | Key risk                                                                 |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Form row        | Trainee enters Date and eight measurements in a scrolling row | The nowrap row widens the card unless the card has `min-w-0` and the row scrolls |
| 2. Shared list row | Trainee and trainer read each entry in that same kind of row | A long error or delta phrase stretches a cell if its width is not stable |
| 3. Linked trainee row | Linked trainees sit beside each other in one scrolling row | A long email wraps under the next trainee unless each email stays on one line |

**Prerequisites:** S-09 and S-10 are done. Local app via `npm run dev`.
**Estimated effort:** One session across three phases.

## Open Risks & Assumptions

- Hips and Navel stay off-screen until the user scrolls, including on a wide monitor. That was accepted with the single scrolling row.
- A field error, including a long date message, must wrap inside its cell. If it does not, the row gains a much wider cell and the other fields move.
- The date is not pinned. Scrolling to Navel hides the date until the user scrolls back.
- A later linked trainee stays off-screen until the trainer scrolls the email row. That is the same tradeoff as the measurement row.

## Success Criteria (Summary)

- A trainee can enter Date and the eight measurements in one sideways-scrolling row, with Note and Add measurement full width below.
- The trainee and a linked trainer read each entry's date and fields in one sideways-scrolling row, deltas included, inside the current card.
- Submitting an entry still stores the same values, and the earliest entry still has no delta.
- A trainer with two linked trainees sees their emails beside each other, and the link form stays above that row.
