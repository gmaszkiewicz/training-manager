# Horizontal Measurements Implementation Plan

## Overview

The trainee enters the date and the eight body measurements in one horizontal row, and both the trainee and a linked trainer read each entry in a row that looks like that form. On the read-only row the label sits above the value and the delta sits beside the value. That row has no horizontal scrollbar; columns are narrower, and the measurement card widens past `max-w-2xl` only when that is what makes the row fit. Linked trainees sit beside each other and wrap to the next line instead of scrolling. Stored values, deltas, and who is linked stay as they are.

## Current State Analysis

Phases 1–3 already turned the form, the shared list, and the linked-trainee list into non-wrapping rows with `overflow-x-auto`. Each measurement column is `w-48`. A list cell is one phrase, `Hips 50.0 cm`, with `↑ 0.5` beside that phrase. Both cards are still `max-w-2xl min-w-0`. The link form (email, then Link trainee) sits above the trainee row. The earliest entry has no delta. An empty note is omitted.

## Desired End State

A trainee on `/dashboard` sees Date and the eight measurements in one row. Note, the server error, and Add measurement sit full width under that row. The row has no horizontal scrollbar. Columns are narrower than `w-48`. The journal card and the trainer card grow past `max-w-2xl` only far enough for that row to fit.

Each saved entry, for the trainee and for a linked trainer, uses the same column order. The label (`Hips`, `Navel`, and the rest, plus `Date`) sits above the value. The value sits in a box that matches the form field's border, radius, and height, and the delta sits beside that box (`50.0 cm` with `↑ 0.5` next to it). The box is not an input, is not in tab order, and has no focus ring. The earliest entry omits the delta. The note stays full width under the row. Saving, validation, and the arrow-and-difference calculation are unchanged.

On the trainer panel, linked trainees sit beside each other. When the emails do not fit on one line, they wrap to the next line. That list has no horizontal scrollbar. A selected trainee stays marked and still opens that trainee's measurements. The email field and Link trainee stay stacked above the emails. An empty link list still shows no names.

### Key Discoveries:

- `measurementFields` in `src/lib/measurement-input.ts` is Weight, Chest, Waist, Arm, Thigh, Calf, Hips, Navel, in that order. Date and note are separate controls.
- The form date input is local-today with `max` set to that day (`src/components/measurements/MeasurementForm.tsx`). The eight fields go through `FormField`, which auth screens also use.
- `MeasurementList` is the only list. `TraineeJournal.astro` and `TrainerPanel.astro` both render it. One list change covers both readers.
- Kitchen sink journal and trainer render those same components, so they pick up the measurement row without a separate layout. The trainer sink's Default state passes one `TrainerLink`, so it does not show two trainees beside each other until that fixture gains a second link.
- The linked-trainee list is local to `TrainerPanel.astro`. It is not `MeasurementList`. Order is the `trainerLinks` array as passed in. Selection is `aria-current="page"` plus `font-semibold` on the matching `traineeId`.
- List deltas are `↑ 1.2`, `↓ 1.2`, or `0.0` from `formatDelta`. Absence of `entry.deltas` means the earliest entry, which shows no delta text.

## What We're NOT Doing

- A sticky date column. The measurement row fits, so the date stays on screen without being pinned.
- Wrapping measurement fields onto a second line, or bringing back a horizontal scrollbar on that row or on the trainee list.
- Putting the email field or Link trainee inside the trainee list.
- Widening the measurement card further than the date and eight columns need.
- Putting the note or Add measurement inside the measurement row.
- Changing stored values, validation rules, delta math, or who can create an entry. The trainer still cannot add measurements.
- Edit and delete (S-05, S-06), a date filter, or a second color palette.
- Restyling `FormField` for the auth screens.

## Implementation Approach

Phases 1–3 shipped the scrolling rows. Phase 4 changes the read-only measurement row and the trainee list. Keep field order, copy, validation, the POST to `/api/measurements`, and the existing role tokens. Do not add a shared row component: the form is React and the list is Astro.

The measurement row is Date plus the eight measurements, in `measurementFields` order, narrow enough to fit without `overflow-x-auto`. On a listed entry the label is above the value and `formatDelta` is beside the value. The trainee emails keep `trainerLinks` order and wrap. The link form stays above them.

## Critical Implementation Details

### User experience spec

The date is the first column and stays visible. Do not pin it.

Phases 1–2 added `min-w-0` and kept `max-w-2xl`, and the rows scroll. Phase 4 removes `overflow-x-auto` from the measurement row and from the trainee list. Narrow each measurement column below `w-48`. Raise the card max-width on `TraineeJournal.astro` and `TrainerPanel.astro` only if the row still cannot fit. A long validation message still wraps inside its own form cell.

Tab order stays date, then the eight measurements in `measurementFields` order, then note, then Add measurement. The read-only value boxes are not in that tab order. Do not add a separate scroll button.

## Phase 1: Form row

### Overview

The trainee enters the date and the eight measurements in one non-wrapping row that scrolls horizontally inside the current card. Note, server error, and Add measurement stay full width below.

### Changes Required:

#### 1. Measurement entry form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Turn the vertical stack of Date and the eight measurements into one horizontal row, so entry matches the slice without changing what gets submitted.

**Contract**: One non-wrapping horizontal row contains the existing date control and then `measurementFields` in their current order. That row scrolls horizontally at every viewport width. Note, `ServerError`, and Add measurement stay outside the scrollport, full width, in that order. The date cell and each measurement cell keep a stable width; each error renders under its control and wraps inside that cell. Keep `method="POST"`, `action="/api/measurements"`, `idPrefix`, local-today default and `max`, client-side schema checks, and `FormField` props. Do not change `src/components/auth/FormField.tsx`.

#### 2. Journal card shrink

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Let the journal card shrink so the form row scrolls inside it instead of widening the page.

**Contract**: Add `min-w-0` to the existing card classes. Keep `w-full max-w-2xl` and every other class on that card. Do not change the trainer card in this phase.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes
- `src/components/journal/TraineeJournal.astro` keeps `max-w-2xl` and includes `min-w-0` on the card

#### Manual Verification:

- On `/dashboard` as a trainee, Date and the eight measurements are one row that scrolls horizontally inside the card
- Note, a server error, and Add measurement sit full width under the row and do not scroll with it
- A validation error stays under its own field inside the row
- At a narrow viewport the fields do not wrap; sideways scroll reaches Navel
- A valid submit still saves the same values as before this layout

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Shared list row

### Overview

Each measurement entry shows its date and eight fields in one horizontal scrolling row. The trainee journal and the trainer preview both get that row because they share `MeasurementList`. The note stays under the row. The cards stay `max-w-2xl`.

### Changes Required:

#### 1. Shared measurement list

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Show each entry's date and measurements across one row so the trainee and a linked trainer read the same horizontal layout the form uses.

**Contract**: Entries stay a vertical list. Inside each entry, one non-wrapping horizontal row scrolls at every viewport width. The first item is the existing `time` for `measured_on`. The next items follow `measurementFields` order. Visible text stays `Label value unit`, then `formatDelta` in the same cell when `entry.deltas` is present, for example `Weight 82.4 kg ↑ 1.2`. When `entry.deltas` is absent, the cell has no delta text. Keep the current accessible names. The note paragraph stays outside the scrollport, full width, and is omitted when empty. Do not change `formatDelta` or how deltas are computed.

#### 2. Card width

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Keep the shrink behavior from Phase 1 so the list row scrolls inside the same card.

**Contract**: The card still has `w-full max-w-2xl` and `min-w-0` from Phase 1. No further journal change is required, because the journal already renders `MeasurementList`.

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Let the trainer card shrink the same way, so the preview row scrolls inside it.

**Contract**: Add `min-w-0` to the existing card classes. Keep `w-full max-w-2xl` and every other class. The trainer still has no measurement form. The preview uses the updated `MeasurementList` only.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes
- `src/components/journal/TraineeJournal.astro` and `src/components/trainer/TrainerPanel.astro` keep `max-w-2xl` and include `min-w-0` on their cards

#### Manual Verification:

- On the trainee journal, an entry with a previous entry shows the date and eight phrases in one scrolling row, including a cell that reads like `Weight 82.4 kg ↑ 1.2`
- The earliest entry shows the same row with no delta text
- A note sits full width under the row and is absent when the entry has none
- A linked trainer sees that same row inside the `max-w-2xl` trainer card
- An empty list still reads `No measurements yet`
- Kitchen sink journal Default and the trainer sample entry show the scrolling row

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Linked trainee row

### Overview

Trainees a trainer has linked sit beside each other in one horizontal row. The link form stays above it. Scroll and no-wrap checks are not part of this phase; phase 4 covers wrapping without a scrollbar.

### Changes Required:

#### 1. Trainer link list

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Stop stacking linked trainees under one another, using the same non-wrapping scroll already chosen for measurement rows.

**Contract**: The `trainerLinks` list becomes one non-wrapping horizontal row that scrolls at every viewport width. Replace `space-y-2` with a horizontal gap so neighboring emails stay apart. Do not leave that vertical stack spacing on the row. Keep the current array order, each link's href (`/dashboard?trainee=`), `aria-current`, and the selected versus unselected classes. Each email stays on one line. The row uses the card that already has `min-w-0` and `max-w-2xl` from Phase 2. The link form stays a vertical stack above the row. When `trainerLinks` is empty, still render no list.

#### 2. Trainer sink fixture

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Give the Default review state two trainees so the row is visible beside each other, not as a single name.

**Contract**: Default passes two links. The first stays the selected link and keeps the sample measurement entry. The second is unselected. Update the Default description that currently says one selected trainee. Leave the empty, error, and unloaded states on their current single-link or empty fixtures.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes
- `src/components/trainer/TrainerPanel.astro` still has `max-w-2xl` and `min-w-0` on the card

#### Manual Verification:

- The selected trainee stays marked and still shows that trainee's measurements
- The email field and Link trainee stay stacked above the row
- No linked trainees still shows no name list
- Kitchen sink trainer Default shows two emails beside each other, with the first selected

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Fitted read-only row

### Overview

The shared measurement list stops reading as one scrolling phrase per field. Each label sits above its value, the delta sits beside the value, and the value looks like the form field without being editable. Columns get narrower so the row has no horizontal scrollbar; the measurement card widens only if it must. Linked trainee emails wrap instead of scrolling.

### Changes Required:

#### 1. Read-only measurement row

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Make each saved entry read like the entry form, with the label above the value and the delta beside the value, and remove the horizontal scrollbar.

**Contract**: Keep entries as a vertical list and keep `measurementFields` order. Date is the first column: the label `Date` above the existing `time`. Each measurement column has its label (`Hips`, `Navel`, and the rest) above the value. The value, including its unit, sits in a non-interactive box that uses the same border, radius, and height as `Input` (`border-input`, `rounded-md`, `h-9`). That box is not an `input`, is not focusable, and has no focus ring. When `entry.deltas` is present, `formatDelta` sits on the same line as the box, beside it, for example `50.0 cm` with `↑ 0.5` next to the box. When `entry.deltas` is absent, there is no delta. Keep the current accessible names. Remove `overflow-x-auto` from this row. Each column is narrower than the current `w-48`. The note stays outside the row. Do not change `formatDelta`.

#### 2. Form columns match the row

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Keep the entry row lined up with the read-only row and remove its horizontal scrollbar once the columns are narrower and the card is wide enough.

**Contract**: Date and the eight measurements stay one row, in the same order, with the same column width as the list. Remove `overflow-x-auto`. Note, `ServerError`, and Add measurement stay full width below the row. A field error still wraps inside its own cell. Do not change `FormField` or the POST contract.

#### 3. Measurement card width

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Let the card grow only when `max-w-2xl` is what forces a horizontal scrollbar.

**Contract**: Keep `min-w-0`. Replace `max-w-2xl` with a wider max only if the date and eight narrower columns still do not fit. Do not widen past that fit.

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Give the trainer preview the same card width as the journal.

**Contract**: Use the same max width and `min-w-0` as the journal card. The trainer still has no measurement form.

#### 4. Wrapping trainee emails

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Let linked trainees wrap onto the next line instead of scrolling sideways.

**Contract**: Remove `overflow-x-auto` and `flex-nowrap` from the `trainerLinks` list. Emails sit beside each other and wrap when they do not fit the card. Keep a horizontal gap, the current array order, each href, `aria-current`, and the selected versus unselected classes. The link form stays above the list. An empty list still renders nothing.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes
- `src/components/measurements/MeasurementList.astro` does not use `overflow-x-auto`
- `src/components/trainer/TrainerPanel.astro` does not use `overflow-x-auto` on the trainee list

#### Manual Verification:

- A listed field shows its label above the value, and the delta beside the value, such as `Hips` above `50.0 cm` with `↑ 0.5` beside that value
- The value box matches the form field's border, radius, and height, is not editable, and has no focus ring
- The measurement row has no horizontal scrollbar, and its columns are narrower than `w-48`
- The journal and trainer cards are wider than `max-w-2xl` only when that width is required for the row to fit
- The earliest entry uses the same layout and shows no delta
- The form row uses those same column widths and has no horizontal scrollbar
- Linked trainee emails wrap to the next line when they do not fit, and that list has no horizontal scrollbar
- The selected trainee stays marked, and the email field and Link trainee stay above the emails

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Existing `npm run test` covers measurement parsing and deltas. This slice does not change those functions, so no new unit test is required for the row layout.

### Integration Tests:

- `npm run build` checks that the Astro list and the React form still compile together. No new smoke scenario: `scripts/smoke.mjs` covers auth, not measurement layout.

### Manual Testing Steps:

1. Sign in as a trainee with at least two entries, one of them with a note, and open `/dashboard`.
2. Confirm the form row shows Date and the eight measurements without a horizontal scrollbar, and that Note and Add measurement stay underneath.
3. Trigger a field error and confirm it stays under that field inside the row.
4. Confirm the latest entry shows deltas in the row and the earliest entry does not.
5. Confirm the measurement row has no horizontal scrollbar, labels sit above values, and a delta sits beside the value.
6. Sign in as a trainer linked to that trainee and confirm the preview row matches, including the read-only field boxes.
7. Open `/kitchen-sink/journal` and `/kitchen-sink/trainer` and confirm the sample entry uses that layout.
8. On the trainer panel, link enough trainees that the emails do not fit one line. Confirm they wrap, with no horizontal scrollbar, and the link form stays above them.

## Performance Considerations

The measurement row is nine columns. The trainee list is one link per linked trainee. Fitting or wrapping those rows does not add requests, change the measurement query, or need virtualization.

## Migration Notes

No schema, data, or API migration. Entries already stored keep their values and deltas, and existing trainer links keep their emails and selection. Only the presentation changes.

## References

- Change identity: `context/changes/horizontal-measurements/change.md`
- Roadmap slice: `context/foundation/roadmap.md` (S-12, MS-06)
- Form stack: `src/components/measurements/MeasurementForm.tsx`
- Shared list: `src/components/measurements/MeasurementList.astro`
- Field order: `src/lib/measurement-input.ts`
- Delta text: `src/lib/measurement-deltas.ts`
- Linked trainees: `src/components/trainer/TrainerPanel.astro`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Form row

#### Automated

- [x] 1.1 `npm run lint` passes — 4d3c60b
- [x] 1.2 `npm run test` passes — 4d3c60b
- [x] 1.3 `src/components/journal/TraineeJournal.astro` keeps `max-w-2xl` and includes `min-w-0` on the card — 4d3c60b

#### Manual

- [x] 1.4 On `/dashboard` as a trainee, Date and the eight measurements are one row that scrolls horizontally inside the card — 4d3c60b
- [x] 1.5 Note, a server error, and Add measurement sit full width under the row and do not scroll with it — 4d3c60b
- [x] 1.6 A validation error stays under its own field inside the row — 4d3c60b
- [x] 1.7 At a narrow viewport the fields do not wrap; sideways scroll reaches Navel — 4d3c60b
- [x] 1.8 A valid submit still saves the same values as before this layout — 4d3c60b

### Phase 2: Shared list row

#### Automated

- [x] 2.1 `npm run lint` passes — 1c035fe
- [x] 2.2 `npm run test` passes — 1c035fe
- [x] 2.3 `npm run build` passes — 1c035fe
- [x] 2.4 `src/components/journal/TraineeJournal.astro` and `src/components/trainer/TrainerPanel.astro` keep `max-w-2xl` and include `min-w-0` on their cards — 1c035fe

#### Manual

- [x] 2.5 On the trainee journal, an entry with a previous entry shows the date and eight phrases in one scrolling row, including a cell that reads like `Weight 82.4 kg ↑ 1.2` — 1c035fe
- [x] 2.6 The earliest entry shows the same row with no delta text — 1c035fe
- [x] 2.7 A note sits full width under the row and is absent when the entry has none — 1c035fe
- [x] 2.8 A linked trainer sees that same row inside the `max-w-2xl` trainer card — 1c035fe
- [x] 2.9 An empty list still reads `No measurements yet` — 1c035fe
- [x] 2.10 Kitchen sink journal Default and the trainer sample entry show the scrolling row — 1c035fe

### Phase 3: Linked trainee row

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run test` passes
- [x] 3.3 `src/components/trainer/TrainerPanel.astro` still has `max-w-2xl` and `min-w-0` on the card

#### Manual

- [x] 3.7 The selected trainee stays marked and still shows that trainee's measurements
- [x] 3.8 The email field and Link trainee stay stacked above the row
- [x] 3.9 No linked trainees still shows no name list
- [x] 3.10 Kitchen sink trainer Default shows two emails beside each other, with the first selected

### Phase 4: Fitted read-only row

#### Automated

- [x] 4.1 `npm run lint` passes
- [x] 4.2 `npm run test` passes
- [x] 4.3 `src/components/measurements/MeasurementList.astro` does not use `overflow-x-auto`
- [x] 4.4 `src/components/trainer/TrainerPanel.astro` does not use `overflow-x-auto` on the trainee list

#### Manual

- [x] 4.5 A listed field shows its label above the value, and the delta beside the value, such as `Hips` above `50.0 cm` with `↑ 0.5` beside that value
- [x] 4.6 The value box matches the form field's border, radius, and height, is not editable, and has no focus ring
- [x] 4.7 The measurement row has no horizontal scrollbar, and its columns are narrower than `w-48`
- [x] 4.8 The journal and trainer cards are wider than `max-w-2xl` only when that width is required for the row to fit
- [x] 4.9 The earliest entry uses the same layout and shows no delta
- [x] 4.10 The form row uses those same column widths and has no horizontal scrollbar
- [x] 4.11 Linked trainee emails wrap to the next line when they do not fit, and that list has no horizontal scrollbar
- [x] 4.12 The selected trainee stays marked, and the email field and Link trainee stay above the emails
