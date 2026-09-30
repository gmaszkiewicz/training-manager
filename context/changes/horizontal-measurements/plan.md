# Horizontal Measurements Implementation Plan

## Overview

The trainee enters the date and the eight body measurements in one horizontal row, and both the trainee and a linked trainer read each entry's date and measurements in one horizontal row. On the trainer panel, linked trainees sit beside each other in one horizontal row. Each row scrolls sideways inside the existing card. Stored values, deltas, and who is linked stay as they are.

## Current State Analysis

On the trainee journal, `MeasurementForm` stacks Date, then Weight, Chest, Waist, Arm, Thigh, Calf, Hips, and Navel, then Note, then Add measurement (`space-y-4`). `MeasurementList` puts the date above those eight fields and stacks each field on its own line. A linked trainer reads that same list from `TrainerPanel` and has no entry form. Above that list, the trainer's linked trainees are a vertical list (`ul` with `space-y-2` in `src/components/trainer/TrainerPanel.astro`): each email is under the previous one. The link form (email, then Link trainee) sits above that list.

Both cards are `max-w-2xl`. A date input plus eight icon fields do not fit that width, or a phone-width card, on one line at the current control size. The list cell text is already `Weight 82.4 kg` plus `↑ 1.2` when a delta exists. The earliest entry has no delta. An empty note is omitted.

## Desired End State

A trainee on `/dashboard` sees Date and the eight measurements in one non-wrapping row. The row scrolls horizontally inside the `max-w-2xl` card at every viewport width. Note, the server error, and Add measurement sit full width under that row and do not scroll with it.

Each saved entry, for the trainee and for a linked trainer, shows the date and the eight fields in that same kind of row. A cell with a delta reads `Weight 82.4 kg ↑ 1.2`. The earliest entry omits the delta. The note stays full width under the row. Saving, validation, and the arrow-and-difference calculation are unchanged.

On the trainer panel, two or more linked trainees appear in one non-wrapping row that scrolls horizontally inside the same card. A selected trainee stays marked and still opens that trainee's measurements. The email field and Link trainee stay stacked above the row. An empty link list still shows no names.

### Key Discoveries:

- `measurementFields` in `src/lib/measurement-input.ts` is Weight, Chest, Waist, Arm, Thigh, Calf, Hips, Navel, in that order. Date and note are separate controls.
- The form date input is local-today with `max` set to that day (`src/components/measurements/MeasurementForm.tsx`). The eight fields go through `FormField`, which auth screens also use.
- `MeasurementList` is the only list. `TraineeJournal.astro` and `TrainerPanel.astro` both render it. One list change covers both readers.
- Kitchen sink journal and trainer render those same components, so they pick up the measurement row without a separate layout. The trainer sink's Default state passes one `TrainerLink`, so it does not show two trainees beside each other until that fixture gains a second link.
- The linked-trainee list is local to `TrainerPanel.astro`. It is not `MeasurementList`. Order is the `trainerLinks` array as passed in. Selection is `aria-current="page"` plus `font-semibold` on the matching `traineeId`.
- List deltas are `↑ 1.2`, `↓ 1.2`, or `0.0` from `formatDelta`. Absence of `entry.deltas` means the earliest entry, which shows no delta text.

## What We're NOT Doing

- A sticky date column. The date scrolls away with the row.
- Wrapping the fields, or the linked trainees, onto extra lines, or stacking them on a narrow screen.
- Putting the email field or Link trainee inside the trainee row.
- Widening the journal or trainer card past `max-w-2xl`.
- Putting the note or Add measurement inside the scrolling row.
- Changing stored values, validation rules, delta math, or who can create an entry. The trainer still cannot add measurements.
- Edit and delete (S-05, S-06), a date filter, or a second color palette.
- Restyling `FormField` for the auth screens.

## Implementation Approach

Change the orientation of the existing form and the shared list, and add `min-w-0` to both cards. Keep field order, copy, validation, the POST to `/api/measurements`, and `max-w-2xl`. Use the existing role tokens. Do not add a shared row component: the form is React and the list is Astro, and they do not share markup today.

The scrollport on the form is Date plus the eight measurements. The scrollport on each list entry is the date plus the eight `label value unit` phrases, with the delta in the same phrase when one exists. The scrollport on the trainer panel is the linked-trainee emails, in the existing `trainerLinks` order. Everything else stays in the vertical stack under that port. The link form stays above the trainee row.

## Critical Implementation Details

### User experience spec

The date is the first item in the scrolling row and scrolls off with it. Do not pin it.

The journal and trainer cards are flex children of a centering wrapper (`w-full max-w-2xl`, no `min-w-0`). Add `min-w-0` to both cards and keep `max-w-2xl`. The row itself is the scrolling element. Give the date cell and each measurement field a stable width so a long validation message wraps inside that cell instead of stretching the row.

Tab order stays date, then the eight measurements in `measurementFields` order, then note, then Add measurement. Moving focus to a control inside the row should bring that control into view. Do not add a separate scroll button.

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

Trainees a trainer has linked sit beside each other in one horizontal row. The row scrolls inside the trainer card. The link form stays above it.

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

- With two linked trainees, their emails sit on one row inside the trainer card and the second is not under the first
- Sideways scroll reaches a later trainee when the row is wider than the card
- At a narrow viewport the emails do not wrap onto a second line
- The selected trainee stays marked and still shows that trainee's measurements
- The email field and Link trainee stay stacked above the row
- No linked trainees still shows no name list
- Kitchen sink trainer Default shows two emails beside each other, with the first selected

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Existing `npm run test` covers measurement parsing and deltas. This slice does not change those functions, so no new unit test is required for the row layout.

### Integration Tests:

- `npm run build` checks that the Astro list and the React form still compile together. No new smoke scenario: `scripts/smoke.mjs` covers auth, not measurement layout.

### Manual Testing Steps:

1. Sign in as a trainee with at least two entries, one of them with a note, and open `/dashboard`.
2. Confirm the form row scrolls sideways to Navel, and that Note and Add measurement stay put underneath.
3. Trigger a field error and confirm it stays under that field inside the row.
4. Confirm the latest entry shows deltas in the row and the earliest entry does not.
5. Narrow the window and confirm the row scrolls instead of wrapping.
6. Sign in as a trainer linked to that trainee and confirm the preview row matches.
7. Open `/kitchen-sink/journal` and `/kitchen-sink/trainer` and confirm the sample entry uses the same row.
8. On the trainer panel, link a second trainee and confirm the two emails sit on one scrolling row, with the link form still above them. On `/kitchen-sink/trainer` Default, confirm the same with the two sample emails.

## Performance Considerations

The measurement row is nine controls or nine text cells. The trainee row is one link per linked trainee. Scrolling either row does not add requests, change the measurement query, or need virtualization.

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

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run test` passes
- [x] 1.3 `src/components/journal/TraineeJournal.astro` keeps `max-w-2xl` and includes `min-w-0` on the card

#### Manual

- [x] 1.4 On `/dashboard` as a trainee, Date and the eight measurements are one row that scrolls horizontally inside the card
- [x] 1.5 Note, a server error, and Add measurement sit full width under the row and do not scroll with it
- [x] 1.6 A validation error stays under its own field inside the row
- [x] 1.7 At a narrow viewport the fields do not wrap; sideways scroll reaches Navel
- [x] 1.8 A valid submit still saves the same values as before this layout

### Phase 2: Shared list row

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npm run test` passes
- [ ] 2.3 `npm run build` passes
- [ ] 2.4 `src/components/journal/TraineeJournal.astro` and `src/components/trainer/TrainerPanel.astro` keep `max-w-2xl` and include `min-w-0` on their cards

#### Manual

- [ ] 2.5 On the trainee journal, an entry with a previous entry shows the date and eight phrases in one scrolling row, including a cell that reads like `Weight 82.4 kg ↑ 1.2`
- [ ] 2.6 The earliest entry shows the same row with no delta text
- [ ] 2.7 A note sits full width under the row and is absent when the entry has none
- [ ] 2.8 A linked trainer sees that same row inside the `max-w-2xl` trainer card
- [ ] 2.9 An empty list still reads `No measurements yet`
- [ ] 2.10 Kitchen sink journal Default and the trainer sample entry show the scrolling row

### Phase 3: Linked trainee row

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run test` passes
- [ ] 3.3 `src/components/trainer/TrainerPanel.astro` still has `max-w-2xl` and `min-w-0` on the card

#### Manual

- [ ] 3.4 With two linked trainees, their emails sit on one row inside the trainer card and the second is not under the first
- [ ] 3.5 Sideways scroll reaches a later trainee when the row is wider than the card
- [ ] 3.6 At a narrow viewport the emails do not wrap onto a second line
- [ ] 3.7 The selected trainee stays marked and still shows that trainee's measurements
- [ ] 3.8 The email field and Link trainee stay stacked above the row
- [ ] 3.9 No linked trainees still shows no name list
- [ ] 3.10 Kitchen sink trainer Default shows two emails beside each other, with the first selected
