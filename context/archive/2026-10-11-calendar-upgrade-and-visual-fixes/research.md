---
date: 2026-10-11T16:21:32+02:00
researcher: Grok 4.7
git_commit: 70194eef338d8fda6fa5d2687a9f57d102fd853e
branch: cursor/calendar-upgrade-and-visual-fixes
repository: training-manager
topic: "What does the journal calendar and saved-entry display consist of, and which contracts constrain a visual upgrade?"
tags: [research, codebase, journal, calendar, measurements]
status: complete
last_updated: 2026-10-11
last_updated_by: Grok 4.7
last_updated_note: Recorded the chosen week strip, expanding month grid, and single date-time popup.
---

# Research: What does the journal calendar and saved-entry display consist of, and which contracts constrain a visual upgrade?

**Date**: 2026-10-11T16:21:32+02:00
**Researcher**: Grok 4.7
**Git Commit**: 70194eef338d8fda6fa5d2687a9f57d102fd853e
**Branch**: cursor/calendar-upgrade-and-visual-fixes
**Repository**: training-manager

## Research Question

For change `calendar-upgrade-and-visual-fixes`, what does the trainee journal at `/measurements` render as its calendar and as saved measurement values, and which existing UI, token, and behavior contracts constrain replacing that calendar visually and centering saved values with the same icons as a new measurement?

## Summary

On branch `cursor/calendar-upgrade-and-visual-fixes` at commit `70194eef338d8fda6fa5d2687a9f57d102fd853e`, the journal path in `src/components/journal/TraineeJournal.astro:54-71` renders `MeasurementForm` and then `MeasurementBrowser`. In the browser return inspected at `src/components/measurements/MeasurementBrowser.tsx:452-462`, the month control is a native `<select>` (`aria-label="Month"`) whose options are `yyyy-mm` strings. That return does not render a month grid. A search of `package.json` and `package-lock.json` for `react-day-picker` and `date-fns` returned no matches, and the `src/components/ui` listing contains `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, and `LibBadge.astro`, with no calendar file.

Saved metric values, in the same browser map over `measurementFields` (`src/components/measurements/MeasurementBrowser.tsx:522-532`), sit in a box whose class string is `border-input flex h-9 items-center rounded-md border px-3 whitespace-nowrap`. That string has no `justify-center` and no `text-center`, and the box contains no icon. The add/edit form, in `src/components/measurements/MeasurementForm.tsx:339-356`, uses one `Scale` icon when `field.unit === "kg"` and a `Ruler` icon for the other fields in that map. `FormField` places that icon at `left-3` and pads the input with `pl-10` (`src/components/auth/FormField.tsx:41-54`).

The loaded trainee card and the loaded trainer card both use `w-max min-w-[calc(75rem+4px)]` (`src/components/journal/TraineeJournal.astro:46-48`, `src/components/trainer/TrainerPanel.astro:52`). The journal comment still names a `w-36` date column (`TraineeJournal.astro:44`), while the form and the saved row both use `w-56` for the date column (`MeasurementForm.tsx:310`, `MeasurementBrowser.tsx:498`). `TrainerPanel.astro:95-108` renders the same `MeasurementBrowser` with `readOnly={true}`, so a visual change in that component is on the trainer preview as well. Issue [#88](https://github.com/gmaszkiewicz/training-manager/issues/88) already states that risk.

`context/foundation/lessons.md` is not in the repository (search for that path returned no file).

## Detailed Findings

### Month control on this journal path

- `TraineeJournal` shows the form and the browser when `measurementsLoaded` is true (`src/components/journal/TraineeJournal.astro:54-71`). The browser receives `today`, `dates`, `page`, `pageCount`, `pageSize`, and `month`.
- The month UI in the inspected browser return is a `<select>` inside `w-40`, with `selectClassName` copying the input border, height, and radius (`src/components/measurements/MeasurementBrowser.tsx:62-63`, `:454-462`). Each option's visible text is the raw `yyyy-mm` value (`:457-460`).
- Page size on this path is the button group labeled `Entries per page`. The sizes in `src/lib/measurement-page.ts:4` are `5`, `10`, and `15`, and `defaultPageSize` at `:8` is `10`. The buttons are `Button` variants `default` or `outline` (`MeasurementBrowser.tsx:464-479`).
- Previous, `Page {currentPage} of {pageCount}`, and Next render when `showPager` is true, right-aligned (`MeasurementBrowser.tsx:570-595`). This inspected block has no numbered page links.
- Empty copy in this return: `No measurements yet` when `noMeasurementsYet`, and `No measurements in this month` when `monthIsEmpty` (`MeasurementBrowser.tsx:483-486`).
- The form's date control is a separate native `datetime-local` input, not the month `<select>` (`MeasurementForm.tsx:314-327`). Its class pins `::-webkit-calendar-picker-indicator` to the right. That input is not wrapped in `FormField` and has no Lucide icon in this block.

### Saved values versus add-form icons

`measurementFields` in `src/lib/measurement-input.ts:27-36` is this ordered set of 8 fields: `weight_kg` (label `Weight`, unit `kg`), `chest_cm` (`Chest`, `cm`), `waist_cm` (`Waist`, `cm`), `arms_cm` (`Arm`, `cm`), `thigh_cm` (`Thigh`, `cm`), `calf_cm` (`Calf`, `cm`), `hips_cm` (`Hips`, `cm`), `navel_cm` (`Navel`, `cm`).

On the add/edit form, the map at `MeasurementForm.tsx:339-356` passes `icon={field.unit === "kg" ? <Scale className="size-4" /> : <Ruler className="size-4" />}`. In this array, `weight_kg` is the field whose unit is `kg`; the other 7 definitions have unit `cm`. `FormField` requires an `icon` and renders it in `text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2`, with the `Input` class `pl-10` (`src/components/auth/FormField.tsx:17`, `:41-54`). The visible label is `` `${field.label} ${field.unit}` `` (`MeasurementForm.tsx:349`). The form root is `text-left` (`:304`).

On a saved row, the same 8 fields render a label `{field.label} {field.unit}` and then the value box quoted in the summary (`MeasurementBrowser.tsx:522-532`). `formatMeasurement` prints `value.toFixed(1)` (`:72-74`). The list root is `text-left` (`:489`). The date column shows `Date and time` and a `<time>` with `font-semibold`, with no icon (`:498-502`). A note, when present, is a left-aligned pre-wrap paragraph under the row (`:561-564`).

Delta text under a saved value uses `formatDelta` in `text-card-foreground mt-1 min-h-lh text-base font-semibold` (`MeasurementBrowser.tsx:533-543`). That paragraph has no icon and no `pl-10`. The new-entry preview under the form (`entry === null` at `MeasurementForm.tsx:358-380`) is a different block: an arrow span at `left-3` and the number in `pl-10`. Edit mode passes `entry` into `MeasurementForm` (`TraineeJournal.astro:56`) and that form suppresses the preview when `entry === null` is false (`MeasurementForm.tsx:329`, `:358`). The list row markup stays the saved-value box.

### Width floor versus current column classes

When measurements are loaded, the trainee card class list includes `w-max min-w-[calc(75rem+4px)]` (`TraineeJournal.astro:46-48`). The trainer card uses that same min-width when `selectedLink && trainerMeasurementsLoaded` (`TrainerPanel.astro:52`). The comment above the trainee card still says `date w-36 + 8×w-28 + gaps + list padding + card padding + both borders` (`TraineeJournal.astro:44`).

Current column classes on both the form and the saved row are `w-56 max-w-56 min-w-56 shrink-0` for the date and `w-28 max-w-28 min-w-28 shrink-0` for each of the 8 metric columns, in a `flex flex-nowrap items-start gap-2` row (`MeasurementForm.tsx:309-310`, `:343`; `MeasurementBrowser.tsx:497-498`, `:523`). The saved row sits in an `li` with `p-4` (`MeasurementBrowser.tsx:495`). The card has `p-8` (`TraineeJournal.astro:47`).

`src/styles/global.css:75-113` (`@theme inline`) sets radius and color tokens and `--max-width-kitchen-sink`, and does not set a spacing scale. Under Tailwind's default spacing scale, `w-36` is 9rem, `w-56` is 14rem, `w-28` is 7rem, `gap-2` is 0.5rem, `p-4` is 1rem, and `p-8` is 2rem. Using the parts named in the journal comment, with those defaults and the current classes:

- date `w-56` = 14rem
- 8 × `w-28` = 56rem
- 8 × `gap-2` = 4rem
- list horizontal padding (`p-4` on both sides) = 2rem
- card horizontal padding (`p-8` on both sides) = 4rem
- both borders, matching the existing `+4px` in the floor = 4px

That sum is 80rem + 4px. The same parts with the comment's `w-36` (9rem) instead of `w-56` sum to 75rem + 4px, which is the floor still in the class list. `w-max` sizes the card to its content, so this floor is a minimum, not a cap. This sum was not checked in a browser.

The form row is not inside the list `p-4`, so its column strip is 2rem narrower than the saved row's strip before card padding. Shared column widths do not by themselves line the form icons up with icons added inside the saved boxes.

### Tokens and the token check

Role colors used on this journal path include `bg-card`, `text-card-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `border-input`, and `text-primary`, mapped in `src/styles/global.css:82-112`. `scripts/check-home-tokens.mjs:7-36` scans a fixed file list that includes `MeasurementForm.tsx`, `TraineeJournal.astro`, `MeasurementBrowser.tsx`, `TrainerPanel.astro`, and `src/pages/measurements.astro`. The pattern at `:38-39` matches hex colors, `rgb(`/`rgba(`/`hsl(`/`hsla(`/`oklch(`, arbitrary sizes of the form `-[<number>px]` or `-[<number>rem]`, and Tailwind palette color utilities. `min-w-[calc(75rem+4px)]` does not match that arbitrary-size alternative, because the value begins with `calc(` rather than a number. `src/components/ui` has no `Card`, `Select`, `Popover`, or `Calendar` component in the listing above. The month `<select>` is styled by the local `selectClassName`, not by a shared select component (`MeasurementBrowser.tsx:62-63`).

## Code References

- `src/components/journal/TraineeJournal.astro:44-71` — card floor, form, and browser
- `src/components/measurements/MeasurementBrowser.tsx:62-63` — month select classes
- `src/components/measurements/MeasurementBrowser.tsx:452-599` — month select, page size, rows, pager
- `src/components/measurements/MeasurementForm.tsx:304-380` — datetime input, field icons, new-entry preview
- `src/components/auth/FormField.tsx:41-54` — icon position and `pl-10`
- `src/lib/measurement-input.ts:18-36` — the 8 field definitions
- `src/lib/measurement-page.ts:4-8` — page sizes `5`, `10`, `15` and default `10`
- `src/components/trainer/TrainerPanel.astro:52` and `:95-108` — shared browser, read-only
- `src/pages/measurements.astro:62-71` — preference cookies for page size and month
- `scripts/check-home-tokens.mjs:7-39` — scanned files and forbidden patterns
- `src/styles/global.css:75-113` — theme tokens, no spacing scale

## Architecture Insights

`MeasurementBrowser` is the shared list for the trainee journal and the trainer preview. Month paging, empty copy, and saved-value markup live in that one React return. The form is a separate component above the list on the trainee journal; the trainer panel in the inspected block does not render `MeasurementForm`.

Icons for the 8 metrics are chosen inline in `MeasurementForm` from `field.unit`. There is no shared measurement-icon module in the files inspected for this question.

## Historical Context (from prior changes)

- Supported, and matched by the current month `<select>`: one `YYYY-MM` month at a time, page sizes 5/10/15, previous/next without numbered links, and a native `<select>` rather than a shadcn `Select` (`context/archive/2026-10-08-pagination-and-filter-measurements/change.md:16-18`, `plan.md:45-48`). Roadmap S-23's outcome uses "calendar month" for that paged month, not a grid (`context/foundation/roadmap.md:82`, `:387`).
- Supported in the archive, and matched by `src/pages/measurements.astro:62-71`: a preference cookie repeats the saved month and page size (`context/archive/2026-10-08-pagination-and-filter-measurements/change.md:23`). The earlier non-goal in `plan.md:40` ("Putting the month, page, or page size in a cookie") is contradicted by that change note and by the current cookie read. The page index is still described as not stored (`change.md:19`).
- Supported for the S-13 era, contradicted by current column classes: the copy-polish plan set the date column to `w-36` and the loaded floor to `min-w-[calc(75rem+4px)]`, and it states that `w-28` is 7rem and `w-36` is 9rem (`context/archive/2026-09-30-measurement-copy-polish/plan.md:27`, `:34`, `:139`). The floor class remains. The date column on the form and the list is now `w-56`.
- Supported, and matched by the saved-row markup: labels include the unit, the visible number does not, and `formatDelta` sits under the value (`measurement-copy-polish/plan.md:27`; current `MeasurementBrowser.tsx:524-543`). PRD FR-009 is date narrowing at nice-to-have priority (`context/foundation/prd.md:77`). The non-goal of good/bad delta coloring (`prd.md:76`, `:116`) is still reflected in this saved delta paragraph, which uses `text-card-foreground` rather than a good/bad palette class.
- The open change note (`context/changes/calendar-upgrade-and-visual-fixes/change.md:12-13`) asks to replace the calendar visually and to center saved values with the add-form icons. Those two visual requests are not stated in the archived journal plans inspected above.

## Related Research

- `context/archive/2026-09-29-trainee-journal-ui/research.md` — earlier journal token charges, written when the journal route was `/dashboard`
- `context/archive/2026-10-08-pagination-and-filter-measurements/` — month select and paging
- `context/archive/2026-09-30-measurement-copy-polish/` — label, delta, and `75rem` floor
- `context/archive/2026-10-06-measured-on-with-time/` — `datetime-local` on the form (not re-read in full for this note; the current input is cited from `MeasurementForm.tsx`)

## Decision

Grzegorz chose this on 2026-10-11, after the week-strip and date-time mockups:

- The journal control is a week strip. Clicking the month name, for example "October 2026", expands the month grid.
- Date and time stays one field. The popup contains the month grid and the time together.

The preview that shows this choice closes the journal grid after a day click and leaves the date-time popup open so the time stays visible. That close behavior was part of the preview, not a separate instruction.

## Open Questions

- A day click on the journal strip or grid moves the visible week in the preview. S-23 still shows one month of rows (`context/archive/2026-10-08-pagination-and-filter-measurements/change.md:16-18`). Whether that click also narrows the measurement list was not part of this choice.
- "Center the values" and "the same icons" do not describe the form as it is: the form number is in an input with `pl-10` beside a left icon, not centered in the `w-28` column (`MeasurementForm.tsx:354-356`, `FormField.tsx:42-54`). Saved boxes can gain `Scale` / `Ruler` and a different alignment, but the form is not already a centered-value reference.
- Whether the trainer preview should keep pixel parity follows from sharing `MeasurementBrowser` (`TrainerPanel.astro:95-108`). Splitting trainee-only markup would be a new structure; restyling the shared return changes `TrainerPanel` too.
