# Journal calendar and saved-entry display Implementation Plan

## Overview

Replace the journal's `yyyy-mm` month dropdown with a Monday-first week strip and an expandable month grid, and replace the native date-time picker with one field whose popup shows that grid and the time together. Center saved metric numbers and their deltas, with the same left icons used when adding a measurement.

## Current State Analysis

The trainee journal at `/measurements` renders `MeasurementForm` and then `MeasurementBrowser` (`src/components/journal/TraineeJournal.astro:54-71`). The trainer preview renders the same browser read-only (`src/components/trainer/TrainerPanel.astro:95-108`). The month control is a native `<select aria-label="Month">` whose options are `YYYY-MM` strings (`src/components/measurements/MeasurementBrowser.tsx:452-462`). Changing it writes the `YYYY-MM` preference, resets to page 1, and reloads that month (`MeasurementBrowser.tsx:391-408`). The list stays one calendar month, newest first, with page sizes 5, 10, and 15. There is no day filter.

Saved metric boxes have no icon and no centering (`MeasurementBrowser.tsx:522-543`). The add form puts `Scale` on `kg` and `Ruler` on `cm`, with the number left-padded (`MeasurementForm.tsx:339-356`, `src/components/auth/FormField.tsx:41-54`). The date field is a native `datetime-local` input with no Lucide icon (`MeasurementForm.tsx:314-327`).

`src/components/ui` has `Button`, `Input`, `Label`, and `Textarea`. There is no calendar component and no date-picker dependency. `scripts/check-home-tokens.mjs` scans the journal files and rejects palette colors and arbitrary `px`/`rem` sizes.

### Key Discoveries:

- The page request replaces a month that is not in `dates` with the current UTC month (`src/lib/services/measurements.ts:222-225`). A day click outside that list must not call the month change.
- Rows are paged. When edit or delete focus opens a later page, the visible rows are not the newest rows in the month (`measurements.ts:228-250`). The opening day still needs that newest timestamp.
- The journal's `today` is a UTC date (`src/lib/measurement-page.ts:33-35`). A new measurement defaults to the browser's local minute (`MeasurementForm.tsx:237-239`). Those clocks stay separate.
- The preference cookie `tm.measurements.day` stores a month. `journalMonth` keeps only `YYYY-MM` (`measurement-page.ts:14-24`).
- The loaded card floor `min-w-[calc(75rem+4px)]` still matches an older `w-36` date column. The date column is now `w-56`. This plan does not change column widths, so the floor stays.

## Desired End State

The journal toolbar shows a week of day buttons, Monday through Sunday, and a month name such as `October 2026`. Clicking the name expands that month's grid. Clicking a day highlights it, shows the week that contains it, and closes the grid. The list remains every saved row in that day's month. Clicking 7 October while October is loaded leaves all October rows and highlights the 7th. Clicking 28 September, when September is in the month list, loads every September row, resets to page 1, and shows the week of 28 September.

On open, the marked day is the UTC `today` when that date falls in the loaded month. Otherwise it is the calendar day of the newest entry in that month. A month with no entries opens on the week of its 1st. Sunday 11 October 2026 belongs to Monday 5 October through Sunday 11 October.

The date-and-time field is still one field and still submits `measured_on` as `YYYY-MM-DDTHH:mm`. Its popup shows the month grid and the time. Choosing a day updates the date and leaves the popup open.

Each saved metric box shows `Scale` or `Ruler` on the left. The number and the delta under it are centered. The date column has no icon. The add form stays left-aligned. The trainer preview shows the same strip and the same saved boxes.

### Key Discoveries:

- Page size, the previous/next pager, empty copy, and the month preference cookie stay on their current contracts.
- The shared browser means the trainer preview follows the same day-click rule as the trainee journal.
- Kitchen sinks at `/kitchen-sink/journal` and `/kitchen-sink/trainer` render these same components.

## What We're NOT Doing

- Filtering the measurement list to a single day.
- Adding previous/next week arrows. The week changes by choosing a day.
- Persisting the highlighted day. The preference continues to store `YYYY-MM`.
- Adding a date library, a shadcn calendar, or a popover dependency.
- Changing page sizes, the pager, empty copy, or delta colors.
- Centering the add-form inputs, or adding an icon to the date column.
- Changing the `75rem` card floor or the `w-56` / `w-28` columns.
- Applying the form's future-day ceiling to the journal grid.
- Unifying the journal's UTC today with the form's local minute.
- Letting a day outside the known month list change which month loads.

## Implementation Approach

Calendar rules live in a new pure module beside `src/lib/measurement-page.ts`, with Vitest coverage for the dates in the decisions above. The journal and the form share one month-grid component built from `Button` and role tokens. The journal replaces the `<select>` and reuses the existing month reload when the clicked day belongs to another known month. The form keeps the existing submit name, schema, and local-minute default. Saved boxes reuse the form's `kg` → `Scale`, otherwise `Ruler` choice, and center the number and delta inside the current column.

## Critical Implementation Details

- **Two clocks.** The strip's "today" is the UTC `today` prop already passed into the browser. The form's default minute stays the browser-local value from `useSyncExternalStore`, with the empty SSR snapshot. Do not derive one from the other.
- **Opening day versus a click.** The highlighted day is a `YYYY-MM-DD`, held apart from the loaded `YYYY-MM`. Use the opening rule when a month arrives without a pending day click, including edit and delete focus. A day click keeps that full date selected after the reload. `loadPage` currently assigns `setDay(body.month)` (`MeasurementBrowser.tsx:280`), and the non-paged hydrate assigns `viewOf`'s month string (`MeasurementBrowser.tsx:300-310`). Neither assignment may replace the highlighted day. Recomputing the opening day after a click would highlight the newest entry instead of the day the user pressed.
- **Newest row on a later page.** Edit focus can open a page that does not contain the newest row. The paged payload must carry `newestMeasuredOn` for the loaded month so the strip can still mark that day. On the non-paged path, derive it from the full in-memory month.
- **Unknown months.** `readMeasurementPage` substitutes the current month when the requested month is absent from `dates`. Days in those months stay visible, so the week and the grid stay complete, and they are disabled.
- **Two dismissals for one grid.** A journal day click closes the expanded grid. A second press of the month name closes it too. A form day click or time change leaves the popup open. The form popup closes on a second press of the field, on Escape, and on a pointer press outside the field and the popup.
- **Form ceiling only.** The form disables days after the calendar date in `measuredOnMax`. The journal does not. The form may select a month that has no saved rows yet; it is not limited to `dates`.

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

## Phase 2: Journal week strip

### Overview

Replace the month dropdown with the week strip and the expandable month grid on the shared measurement list. A day click highlights that day and loads another month only when `listMonthChange` returns one.

### Changes Required:

#### 1. Newest timestamp on the paged payload

**File**: `src/lib/services/measurements.ts`

**Intent**: Give the browser the newest saved timestamp in the loaded month, including when the visible page is a later page opened by edit or delete focus.

**Contract**: `readMeasurementPage` adds `newestMeasuredOn: string | null` to its success result. It is the `measured_on` of the newest row in the loaded month, using the existing newest-first order, or `null` when that month has no rows. The loaded month, page, and page size stay as they are.

**File**: `src/pages/api/measurements/index.ts`

**Intent**: Send the new field with the page the browser already fetches.

**Contract**: The JSON object at `index.ts:86-94` includes `newestMeasuredOn`. The query parameters `month`, `page`, `size`, `focus`, and `trainee` stay unchanged.

**File**: `src/pages/measurements.astro`

**Intent**: Pass the same field from the server render into both journal callers.

**Contract**: The trainee and trainer props include `newestMeasuredOn` from the page read.

**File**: `src/components/journal/TraineeJournal.astro`

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Thread the field into `MeasurementBrowser` on both callers.

**Contract**: Each paged `MeasurementBrowser` receives `newestMeasuredOn`.

#### 2. Week strip and month grid

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Remove the month `<select>` and let the calendar drive the same month reload.

**Contract**:

- `readMeasurementPageBody` accepts `newestMeasuredOn` as a string or `null`.
- The paged path uses that field. The non-paged path derives the newest `measured_on` from the in-memory rows of the loaded month.
- The toolbar keeps the `Entries per page` group. In the select's place, render the month name and the seven day buttons for `weekContaining` of the selected day.
- The month name is `monthLabel` of the selected day's month. Pressing it toggles an inline grid of `monthGrid` for that month. A day click closes the grid. A second press of the name closes it.
- The selected day uses the pressed `Button` style already used for the active page size, with `aria-pressed`. Other enabled days use the outline style. A day whose month is absent from `dates` is disabled.
- Day buttons show the day-of-month number. The name button exposes `aria-expanded`.
- On a day click, the highlighted day becomes that `YYYY-MM-DD` and the strip shows its week. When `listMonthChange` returns a month, call the existing month-change path: store that `YYYY-MM` preference, reset to page 1, and reload. When it returns `null` because the month is unchanged, do not reload. A disabled day does not change selection. The reload updates the loaded month only. It must not write `body.month` over the highlighted day.
- When a month load settles and there is no pending clicked day, the selected day is `openingDay(loadedMonth, today, newestMeasuredOn)`. Edit and delete focus still choose the month and page on the server. The strip does not jump to the focused row's day.
- Page size, pager, empty copy, edit, and delete stay as they are. Use role tokens and `Button`. Do not add a dependency.

#### 3. Shared month grid

**File**: `src/components/measurements/MonthGrid.tsx`

**Intent**: Give the journal and the later form popup one grid, with the caller deciding which days are disabled.

**Contract**: The component renders `monthGrid` for one `YYYY-MM`, marks one selected day, and calls back with the clicked `YYYY-MM-DD`. The caller supplies the disabled set. The component does not read `dates` or the form ceiling itself.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run check:home-tokens` passes
- `npm run lint` passes

#### Manual Verification:

- With today in October, the strip shows Monday 5 October through Sunday 11 October, 11 is pressed, and the name reads October 2026
- Clicking 7 October moves the highlight and leaves the October rows unchanged
- Opening the grid and clicking 28 September, when September is in the month list, closes the grid, shows the week of 28 September, and loads every September row on page 1
- A day whose month is absent from the month list is visible and disabled
- The trainer preview shows the same strip and follows the same click
- Editing an earlier row in a past month keeps that row's page, and the strip marks the newest day in that month

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Date and time popup

### Overview

Replace the native date-time picker with one field. The popup shows the shared month grid and a time input. Choosing a day updates the date and leaves the popup open so the time stays visible.

### Changes Required:

#### 1. Date and time field

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Keep one submitted instant, and put the month grid and the time in the same popup.

**Contract**:

- The visible control is a button labelled by the existing `Date and time` label. Its text is the current `YYYY-MM-DDTHH:mm` value with `T` replaced by a space, matching the saved row's display text.
- A form control named `measured_on` still submits `YYYY-MM-DDTHH:mm`. The existing schema, `step` of 60 seconds, `measuredOnMax`, client validation, edit value from `toMeasuredOnLocalValue`, and the local-minute default with the empty SSR snapshot all stay.
- The popup contains `MonthGrid` for the field value's month and a time input with minute precision. Choosing a day replaces the date, keeps the current time, moves the grid when the day is in an adjacent month, and leaves the popup open. Changing the time leaves the popup open.
- Days after the calendar date in `measuredOnMax` are disabled. Months with no saved measurements remain reachable.
- The popup closes when the field button is pressed again, on Escape, and on a pointer press outside the field and the popup.
- The field has no Lucide icon. The metric inputs stay left-aligned.

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
- The number is centered in the existing `h-9` box. The delta paragraph under it is centered. The box keeps its `aria-label` with the number and unit.
- The date column gains no icon. Column classes stay `w-56` and `w-28`. The card floor stays `min-w-[calc(75rem+4px)]`.
- `MeasurementForm` metric inputs stay left-aligned with their current icons.

### Success Criteria:

#### Automated Verification:

- `npm run check:home-tokens` passes
- `npm run lint` passes

#### Manual Verification:

- A saved weight shows Scale on the left and the number centered, with the delta centered under it
- A saved circumference shows Ruler on the left and the same centering
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

1. Open `/measurements` on a month that contains today and confirm the Monday-first week, the pressed today, and the English month name.
2. Click another day in that week and confirm the rows stay the full month.
3. Expand the grid, click a day in another known month, and confirm the list, the page reset, and the moved week.
4. Confirm a day outside the known month list cannot be chosen.
5. Open the trainer preview and repeat the day click.
6. Edit an earlier row in a past month and confirm the page still contains that row while the strip marks the newest day.
7. On a new measurement, open Date and time, pick a day, set the time, and save. Confirm the popup stayed open until dismissed and the saved row shows the chosen minute.
8. Confirm saved weight and circumference boxes, then confirm the add form is unchanged.

## Performance Considerations

A same-month day click does not refetch. A month change uses the existing page request. `newestMeasuredOn` travels on that response so edit focus does not need a second request for page 1. The grid is at most six weeks of buttons.

## Migration Notes

No database migration. The measurement page payload gains `newestMeasuredOn`. Existing preference cookies remain `YYYY-MM`. The submitted `measured_on` string stays `YYYY-MM-DDTHH:mm`.

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

### Phase 2: Journal week strip

#### Automated

- [x] 2.1 `npm test` passes
- [x] 2.2 `npm run check:home-tokens` passes
- [x] 2.3 `npm run lint` passes

#### Manual

- [ ] 2.4 With today in October, the strip shows Monday 5 October through Sunday 11 October, 11 is pressed, and the name reads October 2026
- [ ] 2.5 Clicking 7 October moves the highlight and leaves the October rows unchanged
- [ ] 2.6 Opening the grid and clicking 28 September, when September is in the month list, closes the grid, shows the week of 28 September, and loads every September row on page 1
- [ ] 2.7 A day whose month is absent from the month list is visible and disabled
- [ ] 2.8 The trainer preview shows the same strip and follows the same click
- [ ] 2.9 Editing an earlier row in a past month keeps that row's page, and the strip marks the newest day in that month

### Phase 3: Date and time popup

#### Automated

- [ ] 3.1 `npm test` passes, including the existing measured-on schema tests
- [ ] 3.2 `npm run check:home-tokens` passes
- [ ] 3.3 `npm run lint` passes

#### Manual

- [ ] 3.4 A new entry shows the browser's local minute. Opening the field shows the month grid and the time together
- [ ] 3.5 Choosing a day keeps the popup open and keeps the time. Changing the time updates the field text
- [ ] 3.6 A day after the existing ceiling cannot be chosen. Submitting still posts `measured_on` as `YYYY-MM-DDTHH:mm`
- [ ] 3.7 Edit mode opens on the saved entry's minute

### Phase 4: Saved values

#### Automated

- [ ] 4.1 `npm run check:home-tokens` passes
- [ ] 4.2 `npm run lint` passes

#### Manual

- [ ] 4.3 A saved weight shows Scale on the left and the number centered, with the delta centered under it
- [ ] 4.4 A saved circumference shows Ruler on the left and the same centering
- [ ] 4.5 The date column has no icon. The add form numbers stay left-aligned
- [ ] 4.6 The trainer preview's saved rows match the trainee rows
