# Measurements Screen on a Phone Implementation Plan

> **Accepted layout (2026-10-18).** Implementation review F1, Fix B. The original stack, the `calc(80rem + 4px + 15px)` cutoff, and the `w-56` / `w-28` columns are the history below. The Accepted layout section is the contract, and it replaces the success criteria it names.

## Overview

A trainee and a linked trainer use the same `/measurements` screen from a 360px-wide viewport up through the wide layout. Below `77.5rem`, the date sits above a sideways metric strip that scrolls inside the card. The difference stays under each value, and the trainer controls stay on screen. At `77.5rem` and wider, the date and eight metrics sit on one row.

## Current State Analysis

`/measurements` renders `TraineeJournal` for a trainee and `TrainerPanel` for everyone else (`src/pages/measurements.astro`). The add form and each saved entry lay the date and eight metrics out in one non-wrapping row: the date column is `w-56` and each metric is `w-28` (`src/components/measurements/MeasurementForm.tsx`, `src/components/measurements/MeasurementBrowser.tsx`). When measurements are loaded, both cards use `w-max min-w-[calc(75rem+4px)]`. The page sets `overflow-x: clip` on `html` (`src/layouts/Layout.astro`), so the part of that row past the viewport is cut off. A phone cannot scroll sideways to reach it.

The month toolbar and the top bar already wrap. The note, the submit button, and the trainer search already span the card. The linked-trainee control is `w-max` and sizes its button to the longest email. Shared `Button` styles include `whitespace-nowrap` and `shrink-0`, so a long email widens that control instead of truncating.

The journal and trainer kitchen sinks render these same components. Playwright has one Chrome project and one signed-out redirect test. No test sets a phone viewport.

## Desired End State

From 360px up to just under `77.5rem` (1240px), a trainee can read and type the date and the note, open the calendar, and reach all eight metrics by scrolling the metric strip. Weight stays inside the viewport. The difference versus the previous entry still sits under each value. A trainer can search, link a trainee, and move through linked trainees on that same screen. At `77.5rem` and wider, the date column is `9.75rem` and each metric column is `5.5rem`, on one row.

### Key Discoveries:

- The one-line row is `14rem` (date) + `56rem` (eight `w-28` columns) + `4rem` (eight `gap-2` gaps) = `74rem`. A saved entry wraps that row in an `li` with `p-4` (`2rem`) and a `border` (`2px`). Wide card padding is `4rem` and the card border is `2px`, so the card's `w-max` border box is `calc(80rem + 4px)` (1284px at a 16px root). `html` reserves a 15px scrollbar gutter (`scrollbar-gutter: stable` beside `overflow-x: clip`, measured in Chrome). The viewport that holds that card is `calc(80rem + 4px + 15px)` (1299px). The outer `px-4` sits on a `flex justify-center` wrapper, so the card occupies that padding until the viewport is another `2rem` wider; that padding does not add to the cutoff. Tailwind's `xl` step is 1280px, 19px short of that viewport.
- `html { overflow-x: clip }` (`src/layouts/Layout.astro`) means a wide card is clipped. Page scroll is not a way to reach Navel.
- The calendar day grid is seven `min-w-9` buttons, six `gap-2` gaps, popover padding, and a border: 318px. At 360px the 15px gutter leaves a 345px layout width. `px-1` on the journal gutter and `px-1` on the card leave a 327px content box (9px to spare) because Tailwind's preflight uses `border-box`.
- `LinkedTraineeField` stretches its closed button to the longest email through an invisible grid (`src/components/trainer/LinkedTraineeField.tsx`). Search suggestions use the shared `Button`, which does not shrink.
- The loaded-card floor `min-w-[calc(75rem+4px)]` was computed for a `w-36` date column. The live date column is `w-56`. `w-max` still lets the wide card grow to the row. Leave that floor value in place on the wide layout.
- Kitchen sink journal and trainer pages mount `TraineeJournal` and `TrainerPanel`. No other page imports the form or the browser.

## What We're NOT Doing

- A separate mobile app, a second measurements route, or a second copy of the form and list.
- Changing stored values, validation, delta math, who can edit, or the order of the fields.
- A stacked column of eight full-width metrics, or a two-row metric grid.
- Editing `src/components/ui/button.tsx` or `ServerError`. The shared input background, the top-bar width, and the auth card shell are in Accepted chrome.
- Shrinking calendar day buttons below `min-w-9`.
- Guaranteeing a viewport narrower than 360px.
- A second Playwright project, or an automated check of the trainer controls, the open calendar, edit, or delete.

## Implementation Approach

Use one named theme breakpoint, `measurement-row`, at `calc(80rem + 4px + 15px)`. The default (narrow) layout stacks the row and lets the card fill the viewport. The `measurement-row:` variant restores today's one-line classes. The form, the saved list, and both cards share that variant, so the trainer preview and the kitchen sinks follow the same cutoff. Keep the difference under each value in both layouts. Constrain the linked-trainee control and the search suggestions locally so a long email cannot widen the card; do that with classes on those controls, not by editing `src/components/ui/button.tsx`.

## Critical Implementation Details

- **Breakpoint arithmetic.** The card that holds a saved entry is `calc(80rem + 4px)`. The viewport cutoff is that card plus the 15px scrollbar gutter, `calc(80rem + 4px + 15px)` (1299px). `xl` (1280px) is 19px short of it. The variant has to be that calc, and the wide classes have to start there, not at `xl`.
- **Clipping.** `overflow-x: clip` on `html` hides anything wider than the viewport. The narrow card must be `w-full min-w-0` with the 1204px floor removed. Adding `overflow-x-auto` on the row does not meet this plan.
- **Email sizer.** The invisible email grid in `LinkedTraineeField` sets the button to the longest address because it is in flow inside a `shrink-0 whitespace-nowrap` button. On the narrow layout, take that stack out of the width calculation (`absolute`, or omit it) and truncate the visible address in a button that may shrink (`min-w-0 max-w-full shrink`). `min-w-0` on the root alone does not cap the stack. The accessible name stays the full email. At `measurement-row:`, restore the in-flow sizer and `w-max`. The same min-content problem applies to search suggestion buttons because shared buttons are `whitespace-nowrap shrink-0`.

## Accepted layout

This section replaces the stack, the `calc(80rem + 4px + 15px)` cutoff, the `w-56` / `w-28` columns, the ban on `overflow-x-auto`, the loaded-card floor, and the wide-layout email sizer. The class lists under Phase 1 are the original plan. Do not put that stack back.

- **Breakpoint.** `--breakpoint-measurement-row: 77.5rem` (1240px), inside `@theme inline` in `src/styles/global.css`. Wide classes use the `measurement-row:` variant. They do not use `xl` or `calc(80rem + 4px + 15px)`.
- **Cards.** `TraineeJournal` and `TrainerPanel` use an outer `px-4 pb-4` and a card of `w-full max-w-[74rem] min-w-0 p-4` at every width. No `measurement-row:` padding switch, no `w-max`, and no `min-w-[calc(75rem+4px)]`.
- **Add form, narrow.** The date is `w-full`. The eight metrics sit in one `overflow-x-auto` strip. Each metric is `w-[5.5625rem] max-w-[5.5625rem] shrink-0`. The difference, or an em dash when there is none, stays under the value.
- **Add form, wide.** The date and the strip share one row. The date is `w-[9.75rem] max-w-[9.75rem]`. The strip is `measurement-row:contents`, so it does not scroll. Each metric is `w-[5.5rem] max-w-[5.5rem]`.
- **Saved entries.** The date column is `w-28` and `measurement-row:w-[9.75rem]`. Each metric is `w-[4.875rem]` and `measurement-row:w-[5.5rem]`. The metric strip scrolls below the breakpoint and is `overflow-visible` at it. Edit and Delete sit under the date below the breakpoint, and in their own column at it. The note is an icon; its text opens in a toast. An entry with no delta still reserves the line under the value.
- **Calendar.** The popover is `w-max max-w-full`, and `measurement-row:max-w-none` on the wide row. Day buttons stay `min-w-9`.
- **Trainer controls.** `LinkedTraineeField` stays `w-full max-w-full min-w-0` at every width. The email truncates. `aria-label` remains the full email. The in-flow sizer is not restored. Search suggestion buttons truncate inside a `w-full` list.
- **Month toolbar.** Month buttons may be `size-8` below the breakpoint and `size-9` at it. Page-size buttons may be `min-w-8` below the breakpoint and `min-w-9` at it.

## Accepted chrome

This section is implementation review F3, Fix B. It replaces the ban on restyling `Input`, the top bar, and the auth screens. `button.tsx` stays untouched.

- **Canvas.** `--canvas` / `--color-canvas` in `src/styles/global.css`. `Layout` takes `measurementChrome`. That flag sets `bg-canvas` on the body and keeps the footer inside `max-w-[74rem]`.
- **Where it applies.** Home, measurements, profile, sign-in, sign-up, confirm-email, and reset-password pass `measurementChrome`. Each of those except home wraps `Topbar` in `max-w-[74rem]`. The page body is a `max-w-[74rem]` card with `p-4`. Auth and profile keep the form in an inner `max-w-sm` column. Home uses the same card with `px-4 py-8`.
- **Inputs.** The shared `Input` uses `bg-background`. `FormField` always adds that class, and its `icon` is optional. `SubmitButton` accepts a `className` merged onto `w-full`.
- **Add form.** On the trainee journal the add form is a `details` element titled "Add your next measurement". Open or closed is stored with `addFormStorageKey` and `parseAddFormOpen` in `src/lib/measurement-page.ts`. A server error leaves it open.
- **Range text.** `measurementFieldRange` and `measuredOnPartRange` in `src/lib/measurement-input.ts` print the existing limits. They do not change validation or delta math.
- **Load toasts.** `PageErrorToasts` shows "Could not load your measurements" when the journal has no measurements. The trainer panel shows "Could not load trainees", "Could not load measurements", and "No trainee with that email" the same way. An empty trainer email search shows "Enter an email address". A later month or page fetch that fails still leaves the current page in place with no toast.
- **Libraries dialog.** The footer control opens a small fixed dialog with a transparent backdrop. It closes when the click target is the dialog itself or the close control, not when the click is inside the dependency list.

## Phase 1: Narrow layout

### Overview

Below `calc(80rem + 4px + 15px)`, the measurements card fits a 360px viewport: the date and eight metrics stack, the calendar fits, and the trainer controls stay inside the card. At and above that width, the current one-line row returns.

### Changes Required:

#### 1. Named breakpoint

**File**: `src/styles/global.css`

**Intent**: Give the form, the list, and both cards one cutoff for the wide row, so a later edit cannot pick a different width.

**Contract**: Add a theme breakpoint whose min-width is `calc(80rem + 4px + 15px)` and whose variant name is `measurement-row`. Declare it inside the existing `@theme inline` block in `src/styles/global.css`, beside `--max-width-kitchen-sink`. A custom property outside `@theme` does not create the variant. Views use `measurement-row:` for the wide layout. They do not repeat an arbitrary min-width.

```css
@theme inline {
  --breakpoint-measurement-row: calc(80rem + 4px + 15px);
}
```

#### 2. Journal and trainer cards

**File**: `src/components/journal/TraineeJournal.astro`

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Stop the loaded card from forcing a ~1204px floor on a phone, and tighten horizontal padding so the calendar's 318px grid fits at 360px.

**Contract**: Default (narrow): outer wrapper `px-1 pb-8`; card `w-full min-w-0 px-1 py-8`, with no `min-w-[calc(75rem+4px)]`. At `measurement-row:`: restore today's outer `px-4 pb-8`, card `p-8`, and, when measurements are loaded, `w-max min-w-[calc(75rem+4px)]`. Leave that floor value unchanged. Update the `TraineeJournal` comment that still says the date column is `w-36`. The top-bar wrapper in `src/pages/measurements.astro` stays as it is.

At 360px the content box is 327px (viewport, minus the 15px scrollbar gutter, minus `px-1` gutter, minus card `px-1` and the 2px border). The calendar needs 318px. Day buttons stay `min-w-9`.

#### 3. Add and edit form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Stack the date and the eight metrics so each one is the width of the card, and restore the one-line row at the breakpoint.

**Contract**: The metric row is `flex flex-col` by default and `measurement-row:flex-row measurement-row:flex-nowrap` at the breakpoint. The date column is `w-full min-w-0` by default and `measurement-row:w-56 measurement-row:max-w-56 measurement-row:min-w-56 measurement-row:shrink-0` at the breakpoint. Each metric column is `w-full min-w-0` by default and `measurement-row:w-28 measurement-row:max-w-28 measurement-row:min-w-28 measurement-row:shrink-0` at the breakpoint. Field order stays Date and time, Weight, Chest, Waist, Arm, Thigh, Calf, Hips, Navel. The difference preview stays under each metric. The note and the submit row stay full width under the stack. The calendar popover gains `max-w-full` so it cannot paint outside the date field. Day buttons stay `min-w-9`. Error bubbles stay above the labels in their reserved line.

#### 4. Saved entries

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: A saved entry, including the trainer's read-only list, uses the same stack and the same wide row as the form.

**Contract**: The entry row uses the same narrow and `measurement-row:` column classes as the form. Edit and Delete stay with the date. The difference stays under the value; an entry with no delta still reserves that line. The note stays full width under the row. The month toolbar and the page-size control already wrap; leave their behavior as it is.

#### 5. Trainer controls inside the card

**File**: `src/components/trainer/LinkedTraineeField.tsx`

**File**: `src/components/trainer/TraineeEmailSearch.tsx`

**Intent**: Previous, next, search, and Link trainee stay on screen at 360px when an email is longer than the card.

**Contract**: Do not edit `src/components/ui/button.tsx`. On the narrow layout, `LinkedTraineeField`'s root is `w-full max-w-full min-w-0`. The invisible email stack is out of the width calculation (`absolute`, or omitted below the breakpoint). The closed button may shrink (`min-w-0 max-w-full shrink`), and the visible address truncates. `aria-label` remains the full email. Open list rows truncate the same way; the list stays `w-full` and `absolute`, so it does not widen the card. At `measurement-row:`, restore the in-flow sizer and today's `w-max` sizing. Search suggestion buttons stay inside the card: override `shrink-0` and the min-content width on those buttons only, and truncate the address. The suggestion list stays `w-full`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx astro check` passes
- `npm test` passes

#### Manual Verification:

Progress rows 1.4–1.15 are the accepted checks:

- At 360px, open "Add your next measurement", type the date and the note, scroll the metric strip through all eight metrics, and submit. Weight stays inside the viewport. The card is not clipped.
- The open calendar, including its day buttons, fits inside a 360px viewport.
- Each metric shows the difference under the value on the add form and on a saved entry. No previous value shows an em dash. An unchanged value shows `0.0`. A value outside the field limit shows that limit instead of the difference.
- At 1240px (`77.5rem`) or wider the date (`9.75rem`) and eight metrics (`5.5rem`) sit on one row, and the add-form strip does not scroll.
- A saved entry is a table. Below `77.5rem` the checkbox and date stay put while the metrics scroll, the date is the day and the time on two lines, and Edit and Delete sit in the actions menu under the date. At `77.5rem` the date is one line and Edit and Delete are their own column. The note icon opens a dialog. A row with no note does not.
- The add form remembers open or closed across a reload. With it closed, `/measurements?error=Could%20not%20save%20the%20measurement` leaves it open.
- At 360px the month buttons and the entries-per-page buttons stay on one line.
- At 360px a trainer can search, link, and move between linked trainees. A long email truncates and the arrows stay on screen. Submitting an empty email shows "Enter an email address".
- Below `77.5rem` the top-bar links are inside Menu. At `77.5rem` they sit in the bar. Home, measurements, profile, sign-in, sign-up, confirm-email, and reset-password use the canvas background and a column no wider than `74rem`.
- The journal with no measurements shows "Could not load your measurements" and no form. The trainer panel shows "Could not load trainees", "Could not load measurements", and "No trainee with that email" the same way. A later month or page fetch that fails leaves the current page in place with no toast.
- The footer libraries dialog closes when the click is the dialog itself or Close. A click inside the dependency list leaves it open.
- The journal and trainer kitchen sinks follow the same narrow strip and wide row.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Playwright lock

### Overview

One signed-in test in the existing Chrome project fails if the date or Weight leaves a 360px viewport, if Navel is not to the right of Weight, or if the wide row stops sharing a vertical center. It does not require the other six metrics to start inside 360px.

### Changes Required:

#### 1. Viewport test

**File**: `tests/e2e/measurements-narrow.spec.ts`

**Intent**: Lock the two layouts the first phase introduced, using the throwaway trainee the end-to-end job already signs in.

**Contract**: Add the spec under the existing `chromium` project. Do not add a Playwright project and do not clear `storageState`. The end-to-end user is a trainee; a trainer session has no add form, so this test does not cover the trainer controls.

Two cases:

- Viewport `360×800`. The date control and Weight are visible, and each of those boxes lies fully inside the viewport (`x >= 0` and `x + width <= 360`). Navel is visible and sits to the right of Weight, with the two vertical centers overlapping. Chest, Waist, Arm, Thigh, Calf, and Hips are not required to start inside the viewport.
- Viewport `1400×900`. Navel's box is to the right of Weight's box, and their vertical centers overlap on one row.

Leave `tests/e2e/seed.spec.ts` unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx playwright test` passes

#### Manual Verification:

Progress row 2.3: the 360px run shows the date and Weight inside the viewport and Navel to the right of Weight, and the wide run shows the metrics on one row.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit test. The layout is viewport CSS. `npm test` guards the existing measurement logic, which this plan does not change.

### Integration Tests:

- `npx playwright test` runs the new spec with the existing Chrome project and the existing signed-out redirect. Narrow: the date and Weight inside a 360px viewport, and Navel to the right of Weight. Wide (1400px): Navel to the right of Weight on the same row.

### Manual Testing Steps:

1. At 360px, as a trainee, open "Add your next measurement". Type the date and the note, scroll the metric strip through Weight, Chest, Waist, Arm, Thigh, Calf, Hips, and Navel, and submit. Weight stays inside the viewport and the card is not clipped. Close the disclosure, reload, and confirm it stays closed. Open it, reload, and confirm it stays open. Close it again, then open `/measurements?error=Could%20not%20save%20the%20measurement` and confirm the disclosure is open.
2. At 360px, open the calendar and confirm the day buttons fit in the viewport.
3. On the add form and on a saved entry, confirm the difference sits under each metric. A first entry shows an em dash. An unchanged value shows `0.0`. Type a weight outside 20–400 and confirm `20–400` replaces the difference.
4. At 1240px (`77.5rem`) or wider, confirm the date (`9.75rem`) and eight metrics (`5.5rem`) are one row and the add-form strip does not scroll.
5. At 360px, on a saved entry, scroll the table sideways. The checkbox and the date stay put. The date is the day and the time on two lines. Edit and Delete are in the actions menu under the date. The note icon opens a dialog with the note. A row with no note shows a crossed-out icon and does not open. Month buttons and the entries-per-page buttons stay on one line.
6. At 1240px or wider, the saved date is one line and Edit and Delete are their own column.
7. At 360px, as a trainer, search, link, and use previous and next with a long email. The email truncates and the arrows stay on screen. Submitting an empty email shows "Enter an email address".
8. Repeat the narrow strip and the wide row on `/kitchen-sink/journal` and `/kitchen-sink/trainer`.
9. Below `77.5rem` the top bar shows Menu and the links are inside it. At `77.5rem` the links sit in the bar. Home, measurements, profile, sign-in, sign-up, confirm-email, and reset-password use the canvas background and a column no wider than `74rem`.
10. On `/kitchen-sink/journal`, the unloaded journal shows "Could not load your measurements" and no form. On `/kitchen-sink/trainer`, trainees not loaded shows "Could not load trainees", measurements not loaded shows "Could not load measurements", and "No trainee with that email" is a toast. A later month or page fetch that fails on `/measurements` leaves the current page up with no toast.
11. The footer "TM (v.…)" control opens the libraries dialog. A click on the dialog backdrop or Close closes it. A click on a dependency name does not.
12. The Playwright 360px run shows the date and Weight inside the viewport and Navel to the right of Weight. The wide run shows the metrics on one row.

## Performance Considerations

Layout and CSS only. No new request, no change to the measurement query, and no new client bundle beyond the classes on these components.

## Migration Notes

No schema change and no data migration. The previous worker and the new worker read the same rows. Rollback is a revert of the layout classes.

## References

- Slice outcome: `context/foundation/roadmap.md` (S-32, MS-24)
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/110
- Wide row this plan keeps: `context/archive/2026-09-30-horizontal-measurements/plan.md`
- Clip behavior: `src/layouts/Layout.astro`
- Field order: `src/lib/measurement-input.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Narrow layout

#### Automated

- [x] 1.1 `npm run lint` passes — 72bf081
- [x] 1.2 `npx astro check` passes — 72bf081
- [x] 1.3 `npm test` passes — 72bf081

#### Manual

Rewritten 2026-10-19 so these rows match the shipped screen.

- [ ] 1.4 At 360px the trainee opens "Add your next measurement", types the date and the note, scrolls the metric strip through all eight metrics, and submits. Weight stays inside the viewport. The card is not clipped. Open or closed survives a reload.
- [ ] 1.5 The open calendar, including its day buttons, fits inside a 360px viewport
- [ ] 1.6 Each metric shows the difference under the value on the add form and on a saved entry. No previous value shows an em dash. An unchanged value shows 0.0. A value outside the field limit shows that limit instead of the difference.
- [ ] 1.7 At 1240px (77.5rem) or wider the date (9.75rem) and eight metrics (5.5rem) sit on one row, and the add-form strip does not scroll
- [ ] 1.8 At 360px a trainer can search, link, and move between linked trainees. A long email truncates and the arrows stay on screen. An empty email search shows "Enter an email address".
- [ ] 1.9 The journal and trainer kitchen sinks follow the same narrow strip and wide row
- [ ] 1.10 A saved entry is a table. Below 77.5rem the checkbox and date stay put while the metrics scroll, the date is the day and the time on two lines, and Edit and Delete sit under the date. At 77.5rem the date is one line and Edit and Delete are their own column. The note icon opens a dialog. A row with no note does not.
- [ ] 1.11 Below 77.5rem the top-bar links are inside Menu. At 77.5rem they sit in the bar. Home, measurements, profile, sign-in, sign-up, confirm-email, and reset-password use the canvas and a column no wider than 74rem.
- [ ] 1.12 The journal with no measurements shows "Could not load your measurements" and no form. The trainer panel shows "Could not load trainees", "Could not load measurements", and "No trainee with that email". A later month or page fetch that fails leaves the current page with no toast.
- [ ] 1.13 The footer libraries dialog closes on the backdrop or Close, and stays open when the click is inside the dependency list
- [ ] 1.14 A server error leaves "Add your next measurement" open
- [ ] 1.15 At 360px the month buttons and the entries-per-page buttons stay on one line

### Phase 2: Playwright lock

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npx playwright test` passes

#### Manual

- [ ] 2.3 The 360px run shows the date and Weight inside the viewport and Navel to the right of Weight, and the wide run shows the metrics on one row
