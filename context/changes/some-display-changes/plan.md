# Inline measurement errors and clearer button states — Implementation Plan

## Overview

On add and on edit, typing in a measurement field or leaving it shows that field's schema message in a bubble above its column. The bubble is visible while the column is hovered or focused. Clicking Add, when the form is invalid, shows every current measurement bubble for 3 seconds, then they hide again unless hovered or focused. Date and Note errors stay under their controls and appear on Add, except `A measurement at that date and time already exists.` That sentence uses a bubble above the date. It appears when the day or clock changes, stays visible while the picker is open, and is forced visible for 3 seconds after a rejected Add or a 409. Save uses `fetch` with `Accept: application/json`. A 409 keeps the entered values. A 200 `{ ok: true }` navigates to `/measurements`. Shared buttons gain a pressed ring and a muted disabled treatment from existing tokens, so other screens that use those states follow.

## Current State Analysis

`MeasurementForm` stores field messages only in `handleSubmit`, when `createMeasurementInputSchema(new Date()).safeParse` fails (`src/components/measurements/MeasurementForm.tsx`). Each of the eight measurement columns passes that message into `FormField`, which renders it under the input. `onChange` clears that field and does not parse. An untouched add form starts from eight empty strings, and the schema treats `""` as required, so a check of the fresh form would show eight required messages.

The visible label is `${label} ${unit}` (`Weight kg`). The schema sentence uses the short label (`Weight is required`, `Weight must be a number with at most one decimal place`). That longest sentence is 54 characters. Each column is `w-28` (112px), about 14 characters at `text-xs`, so the sentence cannot sit on one line inside the column. Nothing between the `h1` (`mb-6` in `src/components/journal/TraineeJournal.astro`) and the label row reserves that line. The add-only `min-h-lh` row sits under the control, not above the label.

Date and Note use local `FieldError` under the control. The same submit path serves edit.

Pressed day, month, and page-size buttons swap `variant="default"` and `variant="outline"` and set `aria-pressed`. Disabled buttons keep their variant and add `disabled:opacity-50` from `src/components/ui/button.tsx`. There is no `aria-pressed` class. `cn()` runs Tailwind merge, so a `disabled:` utility can sit beside a variant background. `check:home-tokens` does not scan `button.tsx` or `global.css`; views still may not use literal colors. Vitest covers `src/**/*.test.ts` only. There is no React component test for this form.

The horizontal-measurements plan left `FormField`'s error paragraph under the input for every caller. This change keeps that default and adds optional props so the measurement fields can validate on blur without rendering a second copy of the message.

## Desired End State

A trainee or trainer opening Add or Edit sees each invalid measurement in its own bubble above that column. An untouched empty form shows no bubbles. Typing an invalid value, or leaving the field with one, sets that field's message. Hovering or focusing the column shows the bubble; leaving it hides the bubble. Add still refuses to save when any field is invalid, and for 3 seconds every measurement bubble is forced visible. Date and Note messages still appear under those controls, and only on Add, except the duplicate sentence, which uses the date bubble described above. The note shows `{length}/1000`, and the textarea's `aria-describedby` points at that readout. The date check asks whether that one minute is already taken. An enabled pressed button shows a ring. A disabled button uses muted fill and muted text. Home and sign-in submits stay filled primary while they are enabled.

### Key Discoveries:

- Empty is already `required` in `readMeasurementNumber` (`src/lib/measurement-input.ts`). Change and blur must parse one field, not the whole form.
- `measurementFields` order is weight, chest, waist, arm, thigh, calf, hips, navel.
- The bubbles have to live inside `MeasurementForm`, because the error state is in the React island. The `h1` stays in `TraineeJournal.astro`.
- Day, month, and page-size buttons already set `aria-pressed` (`MonthGrid.tsx`, `MeasurementBrowser.tsx`). The selected trainee link in `LinkedTraineeField.tsx` swaps variant and does not set `aria-pressed`.
- A day cell can be both pressed and disabled.

## What We're NOT Doing

- Showing errors on the untouched empty form before the user types, blurs, or clicks Add.
- Putting the note, or a date error other than the duplicate sentence, in a measurement bubble. Do not validate Date or Note on blur.
- Changing measurement ranges, column widths, delta colors, or page sizes. The only accepted copy addition is `${label} cannot be negative` for a leading minus.
- Rewriting `FormField` so auth forms stop rendering `error` under the input.
- Changing the `default` and `outline` fills.
- Adding `aria-pressed` to the selected trainee link, or giving that link the pressed ring.
- Adding color tokens or literal colors.

## Implementation Approach

Reuse the existing per-field schema on change and on blur, and the existing full-form parse for Add. Each measurement message renders in a bubble above that column, using `border`, `popover`, and `destructive`. The duplicate date sentence uses that same bubble above the date. The form does not pass `error` into the measurement `FormField`. Save posts with `fetch` and `Accept: application/json`. Pressed and disabled treatments go on the shared button base classes, using `ring`, `muted`, and `muted-foreground`, so call sites that already set `aria-pressed` or `disabled` pick them up.

## Critical Implementation Details

- **State sequencing** — Change and blur validate only the field that was edited, through `measurementFieldMessage`. Running the full form schema there would mark every empty measurement required, which the untouched-form decision forbids. Submit still replaces the whole error map from the full schema, which fills Date, Note, and every invalid measurement at once, then reveals every measurement bubble for 3 seconds.
- **User experience spec** — A measurement bubble is `invisible` unless its column is hovered, focused, or the 3-second reveal is active. The duplicate date bubble is also visible while the picker is open. A day cell can be pressed and disabled together. The pressed ring applies only while the button is enabled.

## Phase 1: Reserved measurement error line

> Accepted in implementation review on 2026-10-15 (F1, Fix B): the reserved one-line band was replaced by per-field bubbles. Progress rows 1.5–1.10 were retitled in F3 to those bubble checks.

### Overview

Typing or leaving one of the eight measurement fields records that field's existing schema message. The message renders in a bubble above that column, visible on hover, on focus, and for 3 seconds after a rejected Add. Date and Note stay on the submit path, under their controls, except the duplicate sentence, which uses a bubble above the date as soon as the day or clock changes. Edit uses the same bubbles. A 409 keeps the entered values.

> Accepted in implementation review on 2026-10-16 (F1, Fix A): the duplicate date sentence is a bubble and is checked before Add. Progress row 1.8 keeps its original title.

### Changes Required:

#### 1. Measurement message helpers

**File**: `src/lib/measurement-input.ts`

**Intent**: Expose the sentence the form should show for one measurement value, without a second copy of the schema text.

**Contract**: `measurementFieldMessage(field, value)` returns `null` when that field's existing schema parses, and otherwise the required, decimal, range, or negative sentence `measurementNumber` already emits. A leading minus returns `${label} cannot be negative`. Do not change the ranges or the other sentences. Do not add a helper that collapses several messages into one.

#### 2. Helper tests

**File**: `src/lib/measurement-input.test.ts`

**Intent**: Lock the change and blur messages for one field.

**Contract**: Cover `Weight` empty → `Weight is required`; `80` → `null`; `8` → `Weight must be between 20 and 400 kg`; `-8` → `Weight cannot be negative`; `12.34` and `80.` → `Weight must be a number with at most one decimal place`.

#### 3. Form field hooks

**File**: `src/components/auth/FormField.tsx`

**Intent**: Let the measurement inputs hear blur and expose an invalid state without rendering a second error under the input. Auth forms that pass `error` keep today's paragraph.

**Contract**: Add optional `onBlur`, forwarded to the input. Add optional `invalid`. When `invalid` is true, set `aria-invalid` and do not render the error paragraph. The paragraph still renders only when `error` is a non-empty string, and that path still sets `aria-invalid`. Add optional `describedBy`, forwarded to the input's `aria-describedby`. Callers that omit the new props are unchanged.

#### 4. Measurement bubbles on the form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Show each measurement error while typing and on blur, in a bubble above that column. Keep Date and Note under their controls.

**Contract**: Do not render a reserved band. For each measurement column that has a message, render a bubble above the label, absolutely positioned, with the same alert icon as `FieldError`, `aria-live="polite"`, and an id that includes `idPrefix` and the field name. The bubble may wrap. It is visible when the column is hovered or focused, and when a rejected Add has set the 3-second reveal; otherwise it is `invisible`. On measurement change and on blur, set or clear only that field from `measurementFieldMessage`. Do not pass `error` into the measurement `FormField`. Pass `invalid` when that field has a message, and `describedBy` pointing at that field's bubble. Leave the heading `mb-6` in `TraineeJournal.astro` as it is. `handleSubmit` still parses the full form, still prevents Add when any field is invalid, and reveals the measurement bubbles for 3 seconds. It also blocks Add when the minute is already occupied, reveals the date bubble, and posts with `fetch` and `Accept: application/json`. A 409 keeps the values and shows the same bubble. Date errors other than the duplicate sentence, and Note, still render through `FieldError`. The note shows `{length}/1000`, and the textarea's `aria-describedby` points at that readout.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`

#### Manual Verification:

- Untouched add form shows no measurement bubble
- Typing Weight 8 shows the range message in that column's bubble while the field is focused
- Weight 12.34 and Chest abc can show both bubbles; each bubble is visible while its column is hovered or focused
- Date errors other than the duplicate sentence, and Note errors, stay under those controls and appear on Add. The duplicate sentence uses the date bubble as soon as the day or clock changes, and again for 3 seconds after a 409
- Edit measurement uses the same bubble after Weight is cleared
- Add does not save when any measurement is invalid, and forces every current measurement bubble visible for 3 seconds

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

- `measurementFieldMessage` for empty, in-range, below-min, a leading minus (`cannot be negative`), and more than one decimal, including a trailing separator.
- `buttonVariants` for `default` and `outline` includes the pressed ring and `disabled:bg-muted`, and omits `disabled:opacity-50`.

### Integration Tests:

- No new Playwright spec. Client blur and the measurement bubbles have no browser harness today; the manual checks below cover them.

### Manual Testing Steps:

1. Open `/measurements` on Add. Confirm no measurement bubble is showing.
2. Type `8` in Weight. Confirm that column's bubble reads `Weight must be between 20 and 400 kg` while the field is focused, and hides when the field is left.
3. Set Weight to `12.34` and Chest to `abc`. Confirm each column can show its own bubble while hovered or focused.
4. Set a date after tomorrow and a note longer than 1000 characters. Confirm those messages appear under the controls on Add, not in a measurement bubble. Set the date to a minute that already has a measurement. Confirm `A measurement at that date and time already exists.` appears in a bubble above the date before Add, and that a 409 keeps the entered values.
5. Open Edit, clear Weight, and leave the field. Confirm the same bubble. Click Add and confirm every current measurement bubble is forced visible, then hides after 3 seconds.
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

- [x] 1.1 Unit tests pass: `npm test` — adbecef
- [x] 1.2 Lint passes: `npm run lint` — adbecef
- [x] 1.3 Token check passes: `npm run check:home-tokens` — adbecef
- [x] 1.4 Type check passes: `npx astro check` — adbecef

#### Manual

- [x] 1.5 Untouched add form shows no measurement bubble — 763878f
- [x] 1.6 Typing Weight 8 shows the range message in that column's bubble while the field is focused — 763878f
- [x] 1.7 Weight 12.34 and Chest abc can show both bubbles; each bubble is visible while its column is hovered or focused — 763878f
- [x] 1.8 Date and Note errors stay under those controls and appear on Add — 763878f
- [x] 1.9 Edit measurement uses the same bubble after Weight is cleared — 763878f
- [x] 1.10 Add does not save when any measurement is invalid, and forces every current measurement bubble visible for 3 seconds — 763878f

### Phase 2: Shared button contrast

#### Automated

- [x] 2.1 Unit tests pass: `npm test` — 0a62abb
- [x] 2.2 Lint passes: `npm run lint` — 0a62abb
- [x] 2.3 Token check passes: `npm run check:home-tokens` — 0a62abb
- [x] 2.4 Type check passes: `npx astro check` — 0a62abb

#### Manual

- [x] 2.5 Selected day, month, and page size show the ring; unselected peers do not — 0a62abb
- [x] 2.6 Disabled Next month and a disabled day use muted fill and muted text — 0a62abb
- [x] 2.7 A disabled selected day does not keep the pressed ring — 0a62abb
- [x] 2.8 Enabled home and sign-in buttons stay filled primary — 0a62abb
- [x] 2.9 Pending Add and a disabled trainer arrow use the muted treatment — 0a62abb
