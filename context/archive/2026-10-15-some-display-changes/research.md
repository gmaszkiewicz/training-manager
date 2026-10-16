---
date: 2026-10-15T08:12:38+02:00
researcher: gmaszkiewicz
git_commit: f165c2464fa34447f74ec31800ca2d24c393252c
branch: cursor/some-display-changes
repository: training-manager
topic: "Inline measurement errors and button contrast on /measurements"
tags: [research, codebase, measurements, MeasurementForm, button]
status: complete
last_updated: 2026-10-15
last_updated_by: gmaszkiewicz
---

# Research: Inline measurement errors and button contrast on /measurements

**Date**: 2026-10-15T08:12:38+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: f165c2464fa34447f74ec31800ca2d24c393252c
**Branch**: cursor/some-display-changes
**Repository**: training-manager

## Research Question

For change `some-display-changes` (S-30, MS-22), how does `/measurements` show field errors and button states today, and which existing contracts does the requested display change run into?

## Summary

On `MeasurementForm`, inline field messages are stored in `handleSubmit` when `createMeasurementInputSchema(...).safeParse` fails. For the eight entries in `measurementFields`, that message renders under the input inside shared `FormField`, and the error paragraph is omitted when `error` is falsy. The add heading and those labels are separated by `mb-6` on the `h1` in `TraineeJournal.astro`, with no error element in that gap. On this view, a selected day, listed month, or page size uses `Button` variant `default`, and an unselected peer uses `outline`. A `disabled` button keeps its variant and adds the base class `disabled:opacity-50`. The `buttonVariants` string in `button.tsx` has no `aria-pressed` selector. Both `FormField` and `Button` are imported outside the measurement form.

## Detailed Findings

### Inline errors are set on submit, then cleared on change

`handleSubmit` parses `measured_on`, the eight measurement values, and `note` with `createMeasurementInputSchema(new Date())`. When `parsed.success` is false it calls `event.preventDefault()` and `setErrors(errorsFor(parsed.error.issues))` (`src/components/measurements/MeasurementForm.tsx:530-547`). `errorsFor` keeps the first issue whose path is an error field (`src/components/measurements/MeasurementForm.tsx:251-259`).

The measurement `onChange` updates the value and calls `clearError(field.field)` (`src/components/measurements/MeasurementForm.tsx:664-667`). `clearError` drops that field's message when one is already set; it does not call `safeParse` (`src/components/measurements/MeasurementForm.tsx:524-527`). The measurement `FormField` JSX in that map has no `onBlur`. Date selection, hour change, and minute change call `clearError("measured_on")` (`src/components/measurements/MeasurementForm.tsx:608-635`). The note `onChange` calls `clearError("note")` (`src/components/measurements/MeasurementForm.tsx:712-715`). The form sets `noValidate` (`src/components/measurements/MeasurementForm.tsx:556`).

`handleSubmit` does not branch on `entry` before `setErrors`, so this submit path is the one used for both a new entry (`action="/api/measurements"`) and an edit (`action` includes the entry id) (`src/components/measurements/MeasurementForm.tsx:550-555`). MS-22's wording is the add flow (`context/foundation/roadmap.md:50`).

A search of `*.{ts,tsx}` for `MeasurementForm` matched `src/components/measurements/MeasurementForm.tsx` and did not match a test file.

### What the schema treats as invalid

`measurementFields` lists eight definitions: Weight kg, Chest cm, Waist cm, Arm cm, Thigh cm, Calf cm, Hips cm, Navel cm (`src/lib/measurement-input.ts:18-36`). `readMeasurementNumber` returns `required` for `undefined`, `null`, or `""`, and `invalid` when a string fails `ONE_DECIMAL_TEXT` (`/^\d+(?:[.,]\d)?$/`) (`src/lib/measurement-input.ts:6`, `src/lib/measurement-input.ts:43-58`). `measurementNumber` then emits `` `${definition.label} is required` ``, `` `${definition.label} must be a number with at most one decimal place` ``, or `` `${definition.label} must be between ${min} and ${max} ${definition.unit}` `` (`src/lib/measurement-input.ts:61-74`). Weight uses min 20 and max 400; each circumference field uses min 10 and max 300 (`src/lib/measurement-input.ts:77-86`).

`measuredOn` emits `Date and time are required.`, `Date and time must be a valid YYYY-MM-DDTHH:mm value.`, or `Date must not be later than one day from today` (`src/lib/measurement-input.ts:131-153`). `note` emits `Note must be text` or `Note must be at most 1000 characters` when the trimmed string is longer than `NOTE_MAX_LENGTH` (`src/lib/measurement-input.ts:5`, `src/lib/measurement-input.ts:168-186`). An empty or whitespace note parses to `null`.

`parseMeasurementField` is the preview parser. It returns `null` when that field's schema fails, and it is not the function that sets `errors` (`src/lib/measurement-input.ts:88-94`, `src/components/measurements/MeasurementForm.tsx:240-248`).

If the browser submit passes the client parse, `POST /api/measurements` runs the same schema. On failure it redirects to `/measurements?error=` with the first issue message (`src/pages/api/measurements/index.ts:111-127`). That query message is passed into `MeasurementForm` as `serverError` and rendered by `ServerError` above the submit button (`src/components/measurements/MeasurementForm.tsx:721`), not as a per-field string above a label.

### Where the error sits, and what space exists above the labels

`FormField` order is label (`text-muted-foreground mb-1`), input, then either the error paragraph or `hint` (`src/components/auth/FormField.tsx:36-65`). The error paragraph uses `text-destructive mt-1 flex items-center gap-1 text-xs`. The measurement call does not pass `hint` (`src/components/measurements/MeasurementForm.tsx:657-670`), so a falsy `error` leaves no error node. The column adds `[&_p]:block [&_p]:break-words` and `w-28 max-w-28 min-w-28` (`src/components/measurements/MeasurementForm.tsx:656`).

Date and note use `FieldError`, which returns `null` when `message` is falsy and otherwise renders a `text-destructive mt-1 ... text-xs break-words` paragraph under the control (`src/components/measurements/MeasurementForm.tsx:444-454`, `641`, `718`).

On add (`entry === null`), a delta or caption line under the control uses `min-h-lh` and a non-breaking space when empty (`src/components/measurements/MeasurementForm.tsx:642-648`, `671-694`). That reserved line is below the input, not between the heading and the labels. An error paragraph inserted by `FormField` sits between the input and that delta line.

The add/edit heading is the `h1` with `mb-6 text-center text-2xl font-bold text-card-foreground` (`src/components/journal/TraineeJournal.astro:51-53`). The form's own class is `text-left` (`src/components/measurements/MeasurementForm.tsx:554`). `src/styles/global.css` `@theme inline` maps color tokens and does not redefine the spacing scale (`src/styles/global.css:79-119`), so `mb-6` is the utility on that `h1`, not a custom property in this file. No element between that `h1` and the label row reserves a one-line error slot.

A grep of `src` for `FormField` matched these importers: `MeasurementForm.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `ChangePasswordForm.tsx`, `ResetPasswordForm.tsx`, `ResetPasswordRequestForm.tsx`, `AuthSinkStates.tsx`, and `JournalSinkStates.tsx`. The horizontal-measurements plan said not to change `src/components/auth/FormField.tsx` and to keep each error under its control (`context/archive/2026-09-30-horizontal-measurements/plan.md:69`, `context/archive/2026-09-30-horizontal-measurements/plan.md:216`). Current `FormField` still renders the error under the input. MS-22 asks for the measurement labels to show the error above the label (`context/foundation/roadmap.md:50`).

### Active and inactive buttons on this view

`buttonVariants` base includes `disabled:pointer-events-none disabled:opacity-50` and invalid rings, and it does not include an `aria-pressed` or `data-state` class (`src/components/ui/button.tsx:7-8`). Variant `default` is `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90`. Variant `outline` is `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50` (`src/components/ui/button.tsx:12-17`). In `:root`, `--primary` is `oklch(0.205 0 0)`, `--primary-foreground` is `oklch(0.985 0 0)`, `--background` is `oklch(1 0 0)`, `--accent` is `oklch(0.97 0 0)`, and `--border` is `oklch(0.922 0 0)` (`src/styles/global.css:8-25`). `.dark` replaces those with a light primary on a dark background (`src/styles/global.css:43-62`). This research did not measure rendered contrast.

Pressed versus unselected pairs on the measurements UI, each swapping `default` and `outline` and setting `aria-pressed`:

- Month grid day cells (`src/components/measurements/MonthGrid.tsx:19-27`). `disabled={disabledDays.has(day)}` keeps the selected or unselected variant.
- Month list rows (`src/components/measurements/MeasurementBrowser.tsx:618-631`).
- Page-size buttons for `pageSizes` `[5, 10, 15]` (`src/lib/measurement-page.ts:4`, `src/components/measurements/MeasurementBrowser.tsx:637-651`).

Controls that stay `variant="outline"` and use `disabled` for the inactive end:

- Previous and next month (`src/components/measurements/MeasurementBrowser.tsx:556-608`).
- Previous and next page (`src/components/measurements/MeasurementBrowser.tsx:766-792`).
- Next month and next year in the date popup (`src/components/measurements/MeasurementForm.tsx:301-318`). Previous year and previous month in that group set no `disabled` (`src/components/measurements/MeasurementForm.tsx:278-299`).

The date-field trigger stays `variant="outline"` while open; open state is `aria-expanded` (`src/components/measurements/MeasurementForm.tsx:570-576`). Clock steppers stay `variant="outline"` and the inspected buttons do not set `disabled` (`src/components/measurements/MeasurementForm.tsx:382-439`). `SubmitButton` renders `Button` with no `variant`, so the default variant applies, and sets `disabled` while the form status is pending (`src/components/auth/SubmitButton.tsx:12-17`, `src/components/ui/button.tsx:29-31`). Delete uses a submit `Button` with no variant override (`src/components/measurements/MeasurementBrowser.tsx:749`).

The journal Month group is previous arrow, month label, next arrow. The S-27 plan for that group says there are no day buttons (`context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan.md:146`). A search of `src` for `weekContaining` matched `src/lib/journal-calendar.ts` and its test, not a component.

A grep of `src/components` for `from "@/components/ui/button"` matched `button.tsx` consumers `TraineeEmailSearch.tsx`, `LinkedTraineeField.tsx`, `TopbarActions.tsx`, `MonthGrid.tsx`, `PasswordToggle.tsx`, `SubmitButton.tsx`, `MeasurementBrowser.tsx`, `TrainerPanel.astro`, `MeasurementForm.tsx`, and `HomeActions.tsx`. The S-30 risk text says a stronger active or inactive button style is shared, so other screens change with it (`context/foundation/roadmap.md:486`). `change.md` names this view and `src/components/ui/button.tsx` (`context/changes/some-display-changes/change.md:16-18`).

## Code References

- `src/components/measurements/MeasurementForm.tsx:524-547` — clear on change; set errors on failed submit
- `src/components/auth/FormField.tsx:36-65` — label, then input, then error under the input
- `src/components/journal/TraineeJournal.astro:51-56` — heading `mb-6`, then the form
- `src/lib/measurement-input.ts:61-86` — measurement messages and ranges
- `src/components/ui/button.tsx:7-20` — disabled opacity and `default` / `outline` classes
- `src/components/measurements/MonthGrid.tsx:19-27` — selected day versus other days
- `src/pages/api/measurements/index.ts:124-127` — server failure redirects with one `?error=` message

## Architecture Insights

Measurement copy and ranges live in `createMeasurementInputSchema`. The form island and `POST /api/measurements` both call it. Moving the message above the label can stay in `MeasurementForm` without editing `FormField`, which auth forms also render. Changing `default` or `outline` in `button.tsx` changes the consumers of those variants listed in the `src/components` import grep above. A local `className` on the measurements buttons would leave `HomeActions`, auth `SubmitButton`, and the top bar on their current variant classes.

The add-form delta row already reserves `min-h-lh` under each control. The error node does not. Putting the message above the label removes it from the gap between input and delta; a reserved band between the `h1` and the labels is what would keep that label row from moving when a message appears.

## Historical Context (from prior changes)

- `context/archive/2026-09-30-horizontal-measurements/plan.md:69` — supported for current code: errors render under the control, and the plan forbids editing `FormField.tsx`. MS-22 (`context/foundation/roadmap.md:50`) asks for the opposite placement on the measurement labels. The archive plan is still what the component does; it is not the S-30 outcome.
- `context/archive/2026-09-30-horizontal-measurements/plan.md:216` — same under-control wrap rule, repeated for the narrowed columns. Still true of `FormField` plus `[&_p]:break-words` on the `w-28` cell.
- `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan.md:146-151` — supported: Month field has no day buttons; loaded month and page size use pressed `Button` styling with `aria-pressed`. Current `MeasurementBrowser` matches that description.
- `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan.md:47-49` — not re-verified line by line in this pass beyond the plan's existence. The S-30 change notes do not ask to change page sizes, delta colors, or the `w-28` / date column widths (`context/changes/some-display-changes/change.md:12-16`).
- `context/foundation/lessons.md` — absent. No lesson entry was applied.

## Related Research

- `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/research.md` — button variants on the journal toolbar
- `context/archive/2026-10-04-testing-reject-illegal-measurements/research.md` — schema rejection messages
- `context/archive/2026-10-11-preview-for-new-entry/plan.md` — preview uses parsed numbers and leaves a blank delta line when parse fails

## Open Questions

- MS-22 says the error shows as soon as the value is invalid, and the roadmap risk says that can interrupt typing (`context/foundation/roadmap.md:50`, `context/foundation/roadmap.md:486`). It does not say whether that check runs on each change, on blur, or after the field has been touched. A new entry starts from `emptyValues`, eight `""` strings (`src/components/measurements/MeasurementForm.tsx:45-54`, `src/components/measurements/MeasurementForm.tsx:462`). `readMeasurementNumber` classifies `""` as `required` (`src/lib/measurement-input.ts:46-47`). A check of that untouched add form would therefore show eight required messages before typing. A whitespace-only string is `invalid`, not `required` (`src/lib/measurement-input.ts:55-58`).
- MS-22 names the measurement labels (Weight kg, Chest cm, and the rest). Date and time and Note share `setErrors` today. Whether those two messages move above their labels is not stated.
- The same `handleSubmit` covers edit. MS-22 and the change notes describe adding. Whether edit keeps submit-time messages is not stated.
- The longest measurement sentence in `measurementNumber` is `` `${definition.label} must be a number with at most one decimal place` ``, inside a `w-28` column that currently allows wrapping. This pass did not render the page, so it does not say whether that sentence fits on one line in a reserved band above the label.
- Whether stronger contrast is a change to shared `default` / `outline`, a change to `disabled:opacity-50`, or a `className` on the measurements buttons without editing `button.tsx` is not chosen. The roadmap records the shared-component side effect as the risk.
