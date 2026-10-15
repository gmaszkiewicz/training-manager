# Inline measurement errors and clearer button states — Implementation Plan

## Overview

On add and on edit, leaving a measurement field or clicking Add shows the first invalid measurement message in a one-line band between the heading and the labels. Date and Note stay under their controls and still appear on Add. Shared buttons gain a pressed ring and a muted disabled treatment from existing tokens, so other screens that use those states follow.

## Current State Analysis

`MeasurementForm` stores field messages only in `handleSubmit`, when `createMeasurementInputSchema(new Date()).safeParse` fails (`src/components/measurements/MeasurementForm.tsx`). Each of the eight measurement columns passes that message into `FormField`, which renders it under the input. `onChange` clears that field and does not parse. An untouched add form starts from eight empty strings, and the schema treats `""` as required, so a check of the fresh form would show eight required messages.

The visible label is `${label} ${unit}` (`Weight kg`). The schema sentence uses the short label (`Weight is required`, `Weight must be a number with at most one decimal place`). That longest sentence is 54 characters. Each column is `w-28` (112px), about 14 characters at `text-xs`, so the sentence cannot sit on one line inside the column. Nothing between the `h1` (`mb-6` in `src/components/journal/TraineeJournal.astro`) and the label row reserves that line. The add-only `min-h-lh` row sits under the control, not above the label.

Date and Note use local `FieldError` under the control. The same submit path serves edit.

Pressed day, month, and page-size buttons swap `variant="default"` and `variant="outline"` and set `aria-pressed`. Disabled buttons keep their variant and add `disabled:opacity-50` from `src/components/ui/button.tsx`. There is no `aria-pressed` class. `cn()` runs Tailwind merge, so a `disabled:` utility can sit beside a variant background. `check:home-tokens` does not scan `button.tsx` or `global.css`; views still may not use literal colors. Vitest covers `src/**/*.test.ts` only. There is no React component test for this form.

The horizontal-measurements plan left `FormField`'s error paragraph under the input for every caller. This change keeps that default and adds optional props so the measurement fields can validate on blur without rendering a second copy of the message.

## Desired End State

A trainee or trainer opening Add or Edit sees a one-line gap between the heading and Weight kg, Chest cm, and the rest. The gap stays empty until a measurement field is left with an invalid value, or until Add. The gap then shows one message, the first invalid measurement in field order, on one line, and the labels do not move. Date and Note messages still appear under those controls, and only on Add. An enabled pressed button shows a ring. A disabled button uses muted fill and muted text. Home and sign-in submits stay filled primary while they are enabled.

### Key Discoveries:

- Empty is already `required` in `readMeasurementNumber` (`src/lib/measurement-input.ts`). Blur must parse one field, not the whole form.
- `measurementFields` order is weight, chest, waist, arm, thigh, calf, hips, navel.
- The band has to live inside `MeasurementForm`, because the error state is in the React island. The `h1` stays in `TraineeJournal.astro`.
- Day, month, and page-size buttons already set `aria-pressed` (`MonthGrid.tsx`, `MeasurementBrowser.tsx`). The selected trainee link in `LinkedTraineeField.tsx` swaps variant and does not set `aria-pressed`.
- A day cell can be both pressed and disabled.

## What We're NOT Doing

- Showing errors on every keystroke, or on the untouched empty form.
- Putting Date or Note in the band, or validating them on blur.
- Stacking more than one measurement message, or wrapping a message inside the `w-28` column.
- Changing measurement copy, ranges, column widths, delta colors, or page sizes.
- Rewriting `FormField` so auth forms stop rendering `error` under the input.
- Changing the `default` and `outline` fills.
- Adding `aria-pressed` to the selected trainee link, or giving that link the pressed ring.
- Adding color tokens or literal colors.

## Implementation Approach

Reuse the existing per-field schema for blur, and the existing full-form parse for Add. A pure helper picks the first non-empty measurement message in `measurementFields` order; the form renders that string in a reserved line and does not pass `error` into the measurement `FormField`. Pressed and disabled treatments go on the shared button base classes, using `ring`, `muted`, and `muted-foreground`, so call sites that already set `aria-pressed` or `disabled` pick them up.

## Critical Implementation Details

- **State sequencing** — Blur validates only the field that was left. Running the full form schema on blur marks every empty measurement required, which the untouched-form decision forbids. `onChange` already clears that field's message, so the value is quiet again while the user is typing. Submit still replaces the whole error map from the full schema, which fills Date, Note, and every invalid measurement at once. The band then shows the first measurement message from that map.
- **User experience spec** — A day cell can be pressed and disabled together. The pressed ring applies only while the button is enabled.

## Phase 1: Reserved measurement error line

### Overview

Leaving one of the eight measurement fields, or clicking Add, records that field's existing schema message. A one-line band above the labels always reserves its height and shows only the first of those messages. Date and Note stay on the submit path, under their controls. Edit uses the same band.

### Changes Required:

#### 1. Measurement message helpers

**File**: `src/lib/measurement-input.ts`

**Intent**: Expose the sentence the form should show for one measurement value, and which of several messages the band shows, without a second copy of the schema text.

**Contract**: `measurementFieldMessage(field, value)` returns `null` when that field's existing schema parses, and otherwise the same required, decimal, or range sentence `measurementNumber` already emits. `firstMeasurementError(errors)` returns the first non-empty string in `measurementFields` order, treating `undefined` and `""` as absent, or `null` when none are set. Do not change the sentences or the ranges.

#### 2. Helper tests

**File**: `src/lib/measurement-input.test.ts`

**Intent**: Lock the blur messages and the one-line band's choice so a second invalid field cannot take the line from an earlier one.

**Contract**: Cover `Weight` empty → `Weight is required`; `80` → `null`; `8` → `Weight must be between 20 and 400 kg`; `12.34` and `80.` → `Weight must be a number with at most one decimal place`. Cover `firstMeasurementError` with no messages → `null`; Weight and Chest both set → the Weight message; only Chest set, including when Weight is `undefined` → the Chest message.

#### 3. Form field hooks

**File**: `src/components/auth/FormField.tsx`

**Intent**: Let the measurement inputs hear blur and expose an invalid state without rendering a second error under the input. Auth forms that pass `error` keep today's paragraph.

**Contract**: Add optional `onBlur`, forwarded to the input. Add optional `invalid`. When `invalid` is true, set `aria-invalid` and do not render the error paragraph. The paragraph still renders only when `error` is a non-empty string, and that path still sets `aria-invalid`. Add optional `describedBy`, forwarded to the input's `aria-describedby`. Callers that omit the new props are unchanged.

#### 4. Reserved band on the measurement form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Show the first measurement error on blur and on Add, in a line that is already present so the labels do not move. Keep Date and Note under their controls.

**Contract**: Render the band as the first child of the form's `space-y-4` stack, before the date and measurement row, on both add and edit. Always reserve one `text-xs` line (`min-h` of that line, `whitespace-nowrap`, `text-destructive`). Empty band is a non-breaking space, with no icon. A message uses the same alert icon as `FieldError` and does not wrap. The band id includes `idPrefix`. Give it `aria-live="polite"`. On measurement blur, set or clear only that field from `measurementFieldMessage`. On measurement `onChange`, keep clearing only that field. Do not pass `error` into the measurement `FormField`. Pass `invalid` when that field has a message, and `describedBy` only for the field whose message `firstMeasurementError` is showing. Leave the heading `mb-6` in `TraineeJournal.astro` as it is. `handleSubmit` still parses the full form and still prevents Add when any field is invalid. Date and Note still render through `FieldError` and are not candidates for the band.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`

#### Manual Verification:

- Untouched add form shows no measurement error and keeps the one-line gap
- Leaving Weight at 8 shows the range message on one line and the labels do not move
- Weight 12.34 and Chest abc show only the Weight message until Weight is valid
- Date and Note errors stay under those controls and appear on Add
- Edit measurement uses the same band after Weight is cleared and left
- Add does not save while a hidden later measurement error remains

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Shared button contrast

### Overview

An enabled pressed button gains a ring from the existing ring token. A disabled button uses muted fill and muted text instead of 50% opacity. Screens that already set `aria-pressed` or `disabled` follow. Enabled home and sign-in buttons do not gain the ring.

### Changes Required:

#### 1. Pressed ring and muted disabled

**File**: `src/components/ui/button.tsx`

**Intent**: Make the pressed control and the disabled control distinct from an ordinary outline button, using tokens that already theme in light and dark.

**Contract**: In the shared base string, replace `disabled:opacity-50` with muted background, muted foreground, and no shadow, and keep `disabled:pointer-events-none`. Add a `ring-2` ring in the `ring` token that applies when `aria-pressed` is true and the button is not disabled. Do not change the `default` or `outline` color classes. Do not edit `src/styles/global.css`. Do not add `aria-pressed` at call sites that lack it.

#### 2. Button class contract test

**File**: `src/components/ui/button.test.ts`

**Intent**: Keep the pressed ring and the muted disabled treatment from being dropped back to `disabled:opacity-50`.

**Contract**: Assert that `buttonVariants` for `default` and for `outline` includes the pressed ring utilities and `disabled:bg-muted`, and does not include `disabled:opacity-50`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`

#### Manual Verification:

- Selected day, month, and page size show the ring; unselected peers do not
- Disabled Next month and a disabled day use muted fill and muted text
- A disabled selected day does not keep the pressed ring
- Enabled home and sign-in buttons stay filled primary
- Pending Add and a disabled trainer arrow use the muted treatment

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `measurementFieldMessage` for empty, in-range, below-min, and more than one decimal, including a trailing separator.
- `firstMeasurementError` for none, Weight before Chest, and Chest alone when Weight is absent.
- `buttonVariants` for `default` and `outline` includes the pressed ring and `disabled:bg-muted`, and omits `disabled:opacity-50`.

### Integration Tests:

- No new Playwright spec. Client blur and the reserved line have no browser harness today; the manual checks below cover them.

### Manual Testing Steps:

1. Open `/measurements` on Add. Confirm the gap above the labels is empty and the labels do not jump when a message appears.
2. Type `8` in Weight and leave the field. Confirm one line reads `Weight must be between 20 and 400 kg`.
3. Set Weight to `12.34` and Chest to `abc`, leaving each. Confirm only the Weight decimal message shows. Correct Weight and leave it. Confirm the Chest message replaces it.
4. Set a date after tomorrow and a note longer than 1000 characters. Confirm those messages appear under the controls on Add, not in the band.
5. Open Edit, clear Weight, and leave the field. Confirm the same band.
6. On the journal, compare a selected day, month, and page size with their outline peers, then a disabled Next month and a disabled day. Confirm the home and sign-in primary buttons are unchanged while enabled.

## Performance Considerations

No new requests, caches, or data reads. Blur parses one field with the existing Zod schema.

## Migration Notes

No schema or data migration. Deploy is the usual Worker release. Button disabled and pressed styles ship with the shared component, so home, auth, and the trainer list pick up the disabled treatment in the same release.

## References

- Related research: `context/changes/some-display-changes/research.md`
- Slice: S-30, MS-22, in `context/foundation/roadmap.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/99
- Schema sentences: `src/lib/measurement-input.ts`
- Form submit and columns: `src/components/measurements/MeasurementForm.tsx`
- Heading: `src/components/journal/TraineeJournal.astro`
- Shared button: `src/components/ui/button.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Reserved measurement error line

#### Automated

- [ ] 1.1 Unit tests pass: `npm test`
- [ ] 1.2 Lint passes: `npm run lint`
- [ ] 1.3 Token check passes: `npm run check:home-tokens`
- [ ] 1.4 Type check passes: `npx astro check`

#### Manual

- [ ] 1.5 Untouched add form shows no measurement error and keeps the one-line gap
- [ ] 1.6 Leaving Weight at 8 shows the range message on one line and the labels do not move
- [ ] 1.7 Weight 12.34 and Chest abc show only the Weight message until Weight is valid
- [ ] 1.8 Date and Note errors stay under those controls and appear on Add
- [ ] 1.9 Edit measurement uses the same band after Weight is cleared and left
- [ ] 1.10 Add does not save while a hidden later measurement error remains

### Phase 2: Shared button contrast

#### Automated

- [ ] 2.1 Unit tests pass: `npm test`
- [ ] 2.2 Lint passes: `npm run lint`
- [ ] 2.3 Token check passes: `npm run check:home-tokens`
- [ ] 2.4 Type check passes: `npx astro check`

#### Manual

- [ ] 2.5 Selected day, month, and page size show the ring; unselected peers do not
- [ ] 2.6 Disabled Next month and a disabled day use muted fill and muted text
- [ ] 2.7 A disabled selected day does not keep the pressed ring
- [ ] 2.8 Enabled home and sign-in buttons stay filled primary
- [ ] 2.9 Pending Add and a disabled trainer arrow use the muted treatment
