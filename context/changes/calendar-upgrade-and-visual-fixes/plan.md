# Journal calendar and saved-entry display Implementation Plan

## Overview

Replace the journal's `yyyy-mm` month dropdown with a Month field: the English month and year, a previous arrow, and a next arrow. Clicking the month and year opens a floating list of the current month plus every month that has entries. Replace the native date-time picker with one field whose popup shows the month grid and the time together. Center saved metric numbers and their deltas, with the same left icons used when adding a measurement.

## Current State Analysis

The trainee journal at `/measurements` renders `MeasurementForm` and then `MeasurementBrowser` (`src/components/journal/TraineeJournal.astro:54-71`). The trainer preview renders the same browser read-only (`src/components/trainer/TrainerPanel.astro:95-108`). The month control is a native `<select aria-label="Month">` whose options are `YYYY-MM` strings (`src/components/measurements/MeasurementBrowser.tsx:452-462`). Changing it writes the `YYYY-MM` preference, resets to page 1, and reloads that month (`MeasurementBrowser.tsx:391-408`). The list stays one calendar month, newest first, with page sizes 5, 10, and 15. There is no day filter.

Saved metric boxes have no icon and no centering (`MeasurementBrowser.tsx:522-543`). The add form puts `Scale` on `kg` and `Ruler` on `cm`, with the number left-padded (`MeasurementForm.tsx:339-356`, `src/components/auth/FormField.tsx:41-54`). The date field is a native `datetime-local` input with no Lucide icon (`MeasurementForm.tsx:314-327`).

`src/components/ui` has `Button`, `Input`, `Label`, and `Textarea`. There is no calendar component and no date-picker dependency. `scripts/check-home-tokens.mjs` scans the journal files and rejects palette colors and arbitrary `px`/`rem` sizes.

### Key Discoveries:

- The page request replaces a month that is not in `dates` with the current UTC month (`src/lib/services/measurements.ts`). The Month field only offers months in `dates`, so an arrow or a list choice never asks for a month the server would replace.
- `dates` is newest first and always includes the current UTC month, even when that month has no rows (`measurementMonths`).
- Rows are paged. Edit and delete focus still choose the month and page on the server. The Month field shows that loaded month. It does not mark a day.
- The journal's `today` is a UTC date (`src/lib/measurement-page.ts:33-35`). A new measurement defaults to the browser's local minute (`MeasurementForm.tsx:237-239`). Those clocks stay separate.
- The preference cookie `tm.measurements.day` stores a month. `journalMonth` keeps only `YYYY-MM` (`measurement-page.ts:14-24`).
- The loaded card floor `min-w-[calc(75rem+4px)]` still matches an older `w-36` date column. The date column is now `w-56`. This plan does not change column widths, so the floor stays.

## Desired End State

The journal toolbar shows a Month field above the saved entries. The field is a group labelled `Month`. It contains a previous arrow, the English month and year such as `October 2026`, and a next arrow. There are no day buttons. The left arrow loads the earlier month in `dates`. The right arrow loads the later month. An arrow at the end of that list is disabled. A month with no entries that is not the current month is not in the list, so the arrows skip it.

Clicking the month and year toggles a list of `dates`: the current month and year always, including when that month has no entries, and every month and year that has entries. The list floats over the entries. The entries stay where they are. When that list has more than six months, it scrolls and shows six rows. A second click of the month and year closes the list. A click outside the field and the list closes it, as does Escape. Choosing the loaded month closes the list and does not reload. Choosing another month closes the list, stores that `YYYY-MM` preference, resets to page 1, and reloads. The measurement list remains every saved row in the loaded month.

The date-and-time field is still one field and still submits `measured_on` as `YYYY-MM-DDTHH:mm`. Its popup shows the month grid and the time. Choosing a day updates the date and leaves the popup open. That grid is the form's popup. The journal Month field does not open it.

Each saved metric box shows `Scale` or `Ruler` on the left. The number and the delta under it are centered. The date column has no icon. The add form stays left-aligned. The trainer preview shows the same Month field and the same saved boxes.

### Key Discoveries:

- Page size, the previous/next pager, empty copy, and the month preference cookie stay on their current contracts.
- The shared browser means the trainer preview follows the same Month field as the trainee journal.
- Kitchen sinks at `/kitchen-sink/journal` and `/kitchen-sink/trainer` render these same components.

## What We're NOT Doing

- Filtering the measurement list to a single day.
- Day buttons on the journal toolbar, a highlighted day, or a week strip.
- An inline month grid on the journal. The day grid belongs to the date-and-time popup.
- Persisting anything finer than `YYYY-MM`. The preference continues to store a month.
- Adding a date library, a shadcn calendar, or a popover dependency. The month list is positioned in the page.
- Changing page sizes, empty copy, or delta colors. The pager still moves by page. Its buttons match the month switcher.
- Centering the add-form inputs, or adding an icon to the date column.
- Changing the `75rem` card floor or the `w-56` / `w-28` columns.
- Applying the form's future-day ceiling to the journal Month field.
- Unifying the journal's UTC today with the form's local minute.
- Letting a month outside `dates` change which month loads.

## Implementation Approach

Calendar rules live in a pure module beside `src/lib/measurement-page.ts`, with Vitest coverage for the month grid the date field will use. The journal Month field uses `monthLabel` and the existing `dates` list. `MonthGrid` is for the date-and-time popup, not for the journal toolbar. The journal replaces the `<select>` and reuses the existing month reload when the chosen month is in `dates`. The form keeps the existing submit name, schema, and local-minute default. Saved boxes reuse the form's `kg` → `Scale`, otherwise `Ruler` choice, and center the number and delta inside the current column.

## Critical Implementation Details

- **Two clocks.** The Month field's current month is the UTC `today` already included in `dates`. The form's default minute stays the browser-local value from `useSyncExternalStore`, with the empty SSR snapshot. Do not derive one from the other.
- **Loaded month only.** The field shows the loaded `YYYY-MM`. There is no highlighted day. Edit and delete focus still choose the month and page on the server. The field follows that month. The page payload does not gain `newestMeasuredOn`.
- **Known months only.** `readMeasurementPage` substitutes the current month when the requested month is absent from `dates`. The arrows and the list move only inside `dates`. The earlier neighbor is the greatest `YYYY-MM` in `dates` that is less than the loaded month. The later neighbor is the least `YYYY-MM` that is greater. A missing neighbor disables that arrow.
- **Floating list.** Pressing the month and year toggles the list. The list is taken out of flow, so the entries do not move down. More than six months makes the list scroll, showing six rows. A second press of the month and year closes it. A pointer press outside the field and the list closes it, as does Escape. Choosing the loaded month closes it and does not reload. Choosing another month closes it and uses the existing month-change path: store that `YYYY-MM`, reset to page 1, and reload.
- **Form popup stays separate.** A form day click or time change leaves the date popup open. The form popup closes on a second press of the field, on Escape, and on a pointer press outside the field and the popup. The form disables days after the calendar date in `measuredOnMax`. The journal Month field has no day ceiling. The form may select a month that has no saved rows yet; it is not limited to `dates`.

## Phase 1: Calendar rules

### Overview

Add tested pure functions for a Monday-first week, a month grid, the opening day, the English month name, and whether a day click changes the loaded month.

### Changes Required:

#### 1. Journal calendar module

**File**: `src/lib/journal-calendar.ts`

**Intent**: Put the date rules in one module so the journal and the form share them and the tests can name the agreed examples.

**Contract**: Export these functions. Days and months are calendar strings, not `Date` objects. `newestMeasuredOn` is a stored timestamp or `null`.

```ts
export function weekContaining(day: string): string[]
export function monthGrid(month: string): string[]
export function monthLabel(month: string): string
export function openingDay(month: string, today: string, newestMeasuredOn: string | null): string
export function listMonthChange(currentMonth: string, day: string, knownMonths: readonly string[]): string | null
```

- `weekContaining` returns seven `YYYY-MM-DD` values, Monday through Sunday, containing `day`.
- `monthGrid` returns every cell of the Monday-first grid that covers `YYYY-MM`, including leading and trailing days from the adjacent months.
- `monthLabel` returns the English name and year, `October 2026` for `2026-10`. Use a fixed English list so server and client render the same word.
- `openingDay` returns `today` when `today` falls in `month`. Otherwise it returns the calendar date of `newestMeasuredOn` when that value is present. Otherwise it returns the 1st of `month`. The calendar date is the first ten characters after a space is replaced with `T`, the same normalization `measurementMonth` uses, so a `T` timestamp and a space-separated timestamp for the same minute return the same day.
- `listMonthChange` returns the clicked day's month when that month differs from `currentMonth` and is included in `knownMonths`. It returns `null` for a same-month day and for a day whose month is absent from `knownMonths`.

#### 2. Unit tests

**File**: `src/lib/journal-calendar.test.ts`

**Intent**: Lock the examples from the planning decisions so later phases can call the functions without re-deciding the dates.

**Contract**: The tests assert these results:

- `weekContaining("2026-10-11")` is `2026-10-05` through `2026-10-11`.
- `weekContaining("2026-10-05")` is that same week.
- `monthGrid("2026-10")` starts `2026-09-28` and ends `2026-11-01`.
- `monthLabel("2026-10")` is `October 2026`.
- `openingDay("2026-10", "2026-10-11", null)` is `2026-10-11`.
- `openingDay("2026-09", "2026-10-11", "2026-09-28T18:00:00")` is `2026-09-28`.
- `openingDay("2026-09", "2026-10-11", "2026-09-28 18:00:00")` is `2026-09-28`.
- `openingDay("2026-09", "2026-10-11", null)` is `2026-09-01`.
- `listMonthChange("2026-10", "2026-10-07", ["2026-09", "2026-10"])` is `null`.
- `listMonthChange("2026-10", "2026-09-28", ["2026-09", "2026-10"])` is `2026-09`.
- `listMonthChange("2026-10", "2026-08-31", ["2026-09", "2026-10"])` is `null`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including the week of Sunday 11 October 2026, the 28 September opening day, and the empty-month 1st
- `npm run lint` passes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Month field

### Overview

Replace the month dropdown with a Month field on the shared measurement list. Arrows move inside `dates`. Clicking the month and year opens a floating list of those months. The entries do not move down.

`weekContaining`, `openingDay`, and `listMonthChange` stay tested from Phase 1. The Month field does not call them. `MonthGrid` is built here for the Phase 3 date popup. The journal does not render it.

### Changes Required:

#### 1. Month field

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Remove the month `<select>` and let the Month field drive the same month reload.

**Contract**:

- The page payload stays as it is. Do not add `newestMeasuredOn`.
- The toolbar keeps the `Entries per page` group. In the select's place, render a group labelled `Month`: a previous arrow, `monthLabel` of the loaded month, and a next arrow. No day buttons. The month button stays as wide as the longest month and year in that list, so a short name does not shrink it.
- The arrows use `ChevronLeft` and `ChevronRight`, `aria-hidden` on the icon, with button names `Previous month` and `Next month`. The earlier month is the greatest `YYYY-MM` in `dates` below the loaded month. The later month is the least `YYYY-MM` above it. A missing neighbor disables that arrow.
- Pressing the month and year toggles a list of `dates`, newest first, the same order `measurementMonths` already uses. Each row is `monthLabel` of that month. The loaded month uses the pressed `Button` style, with `aria-pressed`. The name button exposes `aria-expanded`.
- The list is positioned out of flow, under the field, so the saved entries stay where they are. More than six months makes the list scroll, showing six rows.
- Choosing another month closes the list and calls the existing month-change path: store that `YYYY-MM` preference, reset to page 1, and reload. Choosing the loaded month closes the list and does not reload. A second press of the month and year closes the list. A click outside the field and the list closes it, as does Escape.
- Page size, empty copy, edit, and delete stay as they are. The pager keeps its page contract. Its previous and next controls use the same outline icon buttons as the month field. Use role tokens and `Button`. Do not add a dependency.

#### 2. Shared month grid

**File**: `src/components/measurements/MonthGrid.tsx`

**Intent**: Give the later form popup one day grid, with the caller deciding which days are disabled.

**Contract**: The component renders `monthGrid` for one `YYYY-MM`, marks one selected day, and calls back with the clicked `YYYY-MM-DD`. The caller supplies the disabled set. The component does not read `dates` or the form ceiling itself. The journal Month field does not render it.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run check:home-tokens` passes
- `npm run lint` passes

#### Manual Verification:

- The Month field shows a previous arrow, the English month and year, and a next arrow. There are no day buttons. An arrow at either end of the month list is disabled
- The left arrow loads the earlier month from that list and resets to page 1. The right arrow loads the later month. A month with no entries that is not the current month is skipped
- Clicking the month and year opens a floating list over the entries. The entries stay in place. A second click closes the list
- The list always includes the current month, even with no entries, and every month that has entries
- Choosing another month from the list closes it, loads that month, and resets to page 1
- The trainer preview shows the same Month field. Editing an earlier row in a past month still opens the page that contains that row

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Date and time popup

### Overview

Replace the native date-time picker with one field. The popup shows `MonthGrid`, buttons that move by one month or one year, and hour and minute steppers. Choosing a day updates the date and leaves the popup open so the time stays visible. This popup is not the journal Month field.

### Changes Required:

#### 1. Date and time field

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Keep one submitted instant, and put the month grid and the time in the same popup.

**Contract**:

- The visible control is a button labelled by the existing `Date and time` label. Its text is the current `YYYY-MM-DDTHH:mm` value with `T` replaced by a space, matching the saved row's display text.
- A form control named `measured_on` still submits `YYYY-MM-DDTHH:mm`. The existing schema, `step` of 60 seconds, `measuredOnMax`, client validation, edit value from `toMeasuredOnLocalValue`, and the local-minute default with the empty SSR snapshot all stay.
- The popup contains `MonthGrid` for the visible month, previous and next buttons for one month and for one year, and hour and minute steppers. The next month and next year buttons are disabled when that step would start after the calendar date in `measuredOnMax`. Choosing a day replaces the date, keeps the current time, moves the grid when the day is in an adjacent month, and leaves the popup open. Each stepper moves that part by one and leaves the popup open. The hour and the minute can also be typed. The hour wraps at 24 and the minute wraps at 60.
- Days after the calendar date in `measuredOnMax` are disabled. Months with no saved measurements remain reachable.
- The popup closes when the field button is pressed again, on Escape, and on a pointer press outside the field and the popup.
- The field shows a `Calendar` icon on the left, in the same `left-3` placement and `text-muted-foreground` colour as the metric icons. The metric inputs stay left-aligned. The date popup stacks above the journal Month field.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including the existing measured-on schema tests
- `npm run check:home-tokens` passes
- `npm run lint` passes

#### Manual Verification:

- A new entry shows the browser's local minute. Opening the field shows the month grid and the time together
- Choosing a day keeps the popup open and keeps the time. Changing the time updates the field text
- A day after the existing ceiling cannot be chosen. Submitting still posts `measured_on` as `YYYY-MM-DDTHH:mm`
- Edit mode opens on the saved entry's minute

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Saved values

### Overview

Add the add-form icons to saved metric boxes, and center each number and its delta. Leave the date column and the add form as they are.

### Changes Required:

#### 1. Saved metric boxes

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Make a saved number sit in the center of its column, with the same icon the add form uses for that unit.

**Contract**:

- For each of the eight `measurementFields`, a `kg` unit renders `Scale` and every other unit renders `Ruler`. The icon is `aria-hidden`, `size-4`, `text-muted-foreground`, and sits on the left edge in the same `left-3` placement `FormField` uses.
- The number is centered in the existing `h-9` box. The delta arrow sits in the same `left-3` slot as the icon, and the delta number is centered on the measurement number. The box keeps its `aria-label` with the number and unit.
- The date column gains no icon. Column classes stay `w-56` and `w-28`. The card floor stays `min-w-[calc(75rem+4px)]`.
- `MeasurementForm` metric inputs stay left-aligned with their current icons.

### Success Criteria:

#### Automated Verification:

- `npm run check:home-tokens` passes
- `npm run lint` passes

#### Manual Verification:

- A saved weight shows Scale on the left and the number centered. The delta arrow sits under that icon, and the delta number sits under the measurement number
- A saved circumference shows Ruler on the left and the same alignment
- The date column has no icon. The add form numbers stay left-aligned
- The trainer preview's saved rows match the trainee rows

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Phase 1 covers the Monday week of 11 October 2026, the October grid's leading and trailing days, `October 2026`, opening on today, opening on 28 September from both `2026-09-28T18:00:00` and `2026-09-28 18:00:00`, opening on the 1st of an empty month, and the three `listMonthChange` results.
- Existing `measurement-input` tests continue to own the submitted timestamp shape and the future-day ceiling.
- Existing `measurement-page` tests continue to own month parsing, page size, and the preference keys.

### Integration Tests:

- No new Playwright coverage. The current end-to-end test only checks the signed-out redirect.
- `npm run check:home-tokens` covers the journal files after the visual phases.

### Manual Testing Steps:

1. Open `/measurements` and confirm the Month field: previous arrow, English month and year, next arrow, and no day buttons. Confirm an arrow at either end of the list is disabled.
2. Use the arrows and confirm each step loads the neighboring month from the list, resets to page 1, and skips a month that has no entries and is not the current month.
3. Open the month and year, confirm the list floats over the entries, and confirm a second click closes it without moving the entries.
4. Confirm the list contains the current month even when it has no entries, plus every month that has entries.
5. Choose another month from the list and confirm the list closes, that month loads, and the page resets to 1.
6. Open the trainer preview and repeat the arrow and the list. Edit an earlier row in a past month and confirm that page still contains the row.
7. On a new measurement, open Date and time, pick a day, set the time, and save. Confirm the popup stayed open until dismissed and the saved row shows the chosen minute.
8. Confirm saved weight and circumference boxes, then confirm the add form is unchanged.

## Performance Considerations

Opening the month list does not refetch. A month change uses the existing page request. The date popup's day grid is at most six weeks of buttons.

## Migration Notes

No database migration. The measurement page payload is unchanged. Existing preference cookies remain `YYYY-MM`. The submitted `measured_on` string stays `YYYY-MM-DDTHH:mm`.

## References

- Related research: `context/changes/calendar-upgrade-and-visual-fixes/research.md`
- Month control: `src/components/measurements/MeasurementBrowser.tsx:391-462`
- Saved boxes: `src/components/measurements/MeasurementBrowser.tsx:522-543`
- Date field: `src/components/measurements/MeasurementForm.tsx:310-327`
- Form icons: `src/components/measurements/MeasurementForm.tsx:339-356`
- Page payload: `src/lib/services/measurements.ts:203-285` and `src/pages/api/measurements/index.ts:86-94`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/88

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Calendar rules

#### Automated

- [x] 1.1 `npm test` passes, including the week of Sunday 11 October 2026, the 28 September opening day, and the empty-month 1st — f6863e5
- [x] 1.2 `npm run lint` passes — f6863e5

### Phase 2: Month field

#### Automated

- [x] 2.1 `npm test` passes — 3e858fd
- [x] 2.2 `npm run check:home-tokens` passes — 3e858fd
- [x] 2.3 `npm run lint` passes — 3e858fd

#### Manual

- [x] 2.4 The Month field shows a previous arrow, the English month and year, and a next arrow. There are no day buttons. An arrow at either end of the month list is disabled — 3e858fd
- [x] 2.5 The left arrow loads the earlier month from that list and resets to page 1. The right arrow loads the later month. A month with no entries that is not the current month is skipped — 3e858fd
- [x] 2.6 Clicking the month and year opens a floating list over the entries. The entries stay in place. A second click closes the list — 3e858fd
- [x] 2.7 The list always includes the current month, even with no entries, and every month that has entries — 3e858fd
- [x] 2.8 Choosing another month from the list closes it, loads that month, and resets to page 1 — 3e858fd
- [x] 2.9 The trainer preview shows the same Month field. Editing an earlier row in a past month still opens the page that contains that row — 3e858fd

### Phase 3: Date and time popup

#### Automated

- [x] 3.1 `npm test` passes, including the existing measured-on schema tests — b92bbad
- [x] 3.2 `npm run check:home-tokens` passes — b92bbad
- [x] 3.3 `npm run lint` passes — b92bbad

#### Manual

- [x] 3.4 A new entry shows the browser's local minute. Opening the field shows the month grid and the time together — b92bbad
- [x] 3.5 Choosing a day keeps the popup open and keeps the time. Changing the time updates the field text — b92bbad
- [x] 3.6 A day after the existing ceiling cannot be chosen. Submitting still posts `measured_on` as `YYYY-MM-DDTHH:mm` — b92bbad
- [x] 3.7 Edit mode opens on the saved entry's minute — b92bbad

### Phase 4: Saved values

#### Automated

- [x] 4.1 `npm run check:home-tokens` passes
- [x] 4.2 `npm run lint` passes

#### Manual

- [ ] 4.3 A saved weight shows Scale on the left and the number centered, with the delta centered under it
- [ ] 4.4 A saved circumference shows Ruler on the left and the same centering
- [ ] 4.5 The date column has no icon. The add form numbers stay left-aligned
- [ ] 4.6 The trainer preview's saved rows match the trainee rows
