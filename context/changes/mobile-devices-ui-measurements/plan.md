# Measurements Screen on a Phone Implementation Plan

## Overview

A trainee and a linked trainer use the same `/measurements` screen from a 360px-wide viewport up through the current wide layout. Below the width of the existing one-line row, the date and the eight metrics stack in one column so every field, the difference under each value, and the trainer controls stay on screen. At and above that width, the current one-line row stays.

## Current State Analysis

`/measurements` renders `TraineeJournal` for a trainee and `TrainerPanel` for everyone else (`src/pages/measurements.astro`). The add form and each saved entry lay the date and eight metrics out in one non-wrapping row: the date column is `w-56` and each metric is `w-28` (`src/components/measurements/MeasurementForm.tsx`, `src/components/measurements/MeasurementBrowser.tsx`). When measurements are loaded, both cards use `w-max min-w-[calc(75rem+4px)]`. The page sets `overflow-x: clip` on `html` (`src/layouts/Layout.astro`), so the part of that row past the viewport is cut off. A phone cannot scroll sideways to reach it.

The month toolbar and the top bar already wrap. The note, the submit button, and the trainer search already span the card. The linked-trainee control is `w-max` and sizes its button to the longest email. Shared `Button` styles include `whitespace-nowrap` and `shrink-0`, so a long email widens that control instead of truncating.

The journal and trainer kitchen sinks render these same components. Playwright has one Chrome project and one signed-out redirect test. No test sets a phone viewport.

## Desired End State

From 360px up to just under the wide row, a trainee can read and type the date, all eight metrics, and the note, and can open the calendar, with each field inside the viewport. The difference versus the previous entry still sits under each value. A trainer can search, link a trainee, and move through linked trainees on that same screen. At `calc(80rem + 4px + 15px)` (1299px) and wider, the date and eight metrics sit on one row again, with the same column widths as today.

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
- A two-row metric grid, or a horizontal scrollbar on the measurement row.
- Restyling the shared top bar, `Button`, `Input`, `ServerError`, or the auth screens.
- Changing the wide row's column widths, or shrinking calendar day buttons below `min-w-9`.
- Guaranteeing a viewport narrower than 360px.
- A second Playwright project, or an automated check of the trainer controls, the open calendar, edit, or delete.

## Implementation Approach

Use one named theme breakpoint, `measurement-row`, at `calc(80rem + 4px + 15px)`. The default (narrow) layout stacks the row and lets the card fill the viewport. The `measurement-row:` variant restores today's one-line classes. The form, the saved list, and both cards share that variant, so the trainer preview and the kitchen sinks follow the same cutoff. Keep the difference under each value in both layouts. Constrain the linked-trainee control and the search suggestions locally so a long email cannot widen the card; do that with classes on those controls, not by editing `src/components/ui/button.tsx`.

## Critical Implementation Details

- **Breakpoint arithmetic.** The card that holds a saved entry is `calc(80rem + 4px)`. The viewport cutoff is that card plus the 15px scrollbar gutter, `calc(80rem + 4px + 15px)` (1299px). `xl` (1280px) is 19px short of it. The variant has to be that calc, and the wide classes have to start there, not at `xl`.
- **Clipping.** `overflow-x: clip` on `html` hides anything wider than the viewport. The narrow card must be `w-full min-w-0` with the 1204px floor removed. Adding `overflow-x-auto` on the row does not meet this plan.
- **Email sizer.** The invisible email grid in `LinkedTraineeField` sets the button to the longest address because it is in flow inside a `shrink-0 whitespace-nowrap` button. On the narrow layout, take that stack out of the width calculation (`absolute`, or omit it) and truncate the visible address in a button that may shrink (`min-w-0 max-w-full shrink`). `min-w-0` on the root alone does not cap the stack. The accessible name stays the full email. At `measurement-row:`, restore the in-flow sizer and `w-max`. The same min-content problem applies to search suggestion buttons because shared buttons are `whitespace-nowrap shrink-0`.

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

- At 360px the trainee can read and type the date, all eight metrics, the note, and submit, with no field clipped
- The open calendar, including its day buttons, fits inside a 360px viewport
- Each metric still shows the difference under the value on the add form and on a saved entry
- At 1299px or wider the date and eight metrics sit on one row, as they do today
- At 360px a trainer can search, link, and move between linked trainees, and a long email does not push the arrows off screen
- The journal and trainer kitchen sinks follow the same narrow and wide layouts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Playwright lock

### Overview

One signed-in test in the existing Chrome project fails if a later change clips a field at 360px or drops the wide row back into a stack.

### Changes Required:

#### 1. Viewport test

**File**: `tests/e2e/measurements-narrow.spec.ts`

**Intent**: Lock the two layouts the first phase introduced, using the throwaway trainee the end-to-end job already signs in.

**Contract**: Add the spec under the existing `chromium` project. Do not add a Playwright project and do not clear `storageState`. The end-to-end user is a trainee; a trainer session has no add form, so this test does not cover the trainer controls.

Two cases:

- Viewport `360×800`. The date control and the eight inputs (labels `Date and time`, `Weight kg`, `Chest cm`, `Waist cm`, `Arm cm`, `Thigh cm`, `Calf cm`, `Hips cm`, `Navel cm`) are visible. Each bounding box lies fully inside the viewport (`x >= 0` and `x + width <= 360`). Navel's box is below Weight's box.
- Viewport `1400×900`. Navel's box is to the right of Weight's box, and their vertical centers overlap on one row.

Leave `tests/e2e/seed.spec.ts` unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx playwright test` passes

#### Manual Verification:

- The 360px run shows every field inside the viewport, and the wide run shows the metrics on one row

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit test. The layout is viewport CSS. `npm test` guards the existing measurement logic, which this plan does not change.

### Integration Tests:

- `npx playwright test` runs the new spec with the existing Chrome project and the existing signed-out redirect. Narrow: fields inside a 360px viewport and Navel below Weight. Wide (1400px): Navel to the right of Weight on the same row.

### Manual Testing Steps:

1. At 360px, as a trainee, type each field, open the calendar, and confirm the day buttons fit. Confirm a difference sits under each metric on the add form and on a saved entry.
2. At 1299px or wider, confirm the date and eight metrics are one row.
3. At 360px, as a trainer, search, link, and use the previous and next arrows with a long email.
4. Repeat the narrow and wide checks on `/kitchen-sink/journal` and `/kitchen-sink/trainer`.

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

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npx astro check` passes
- [x] 1.3 `npm test` passes

#### Manual

- [ ] 1.4 At 360px the trainee can read and type the date, all eight metrics, the note, and submit, with no field clipped
- [ ] 1.5 The open calendar, including its day buttons, fits inside a 360px viewport
- [ ] 1.6 Each metric still shows the difference under the value on the add form and on a saved entry
- [ ] 1.7 At 1299px or wider the date and eight metrics sit on one row, as they do today
- [ ] 1.8 At 360px a trainer can search, link, and move between linked trainees, and a long email does not push the arrows off screen
- [ ] 1.9 The journal and trainer kitchen sinks follow the same narrow and wide layouts

### Phase 2: Playwright lock

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npx playwright test` passes

#### Manual

- [ ] 2.3 The 360px run shows every field inside the viewport, and the wide run shows the metrics on one row
