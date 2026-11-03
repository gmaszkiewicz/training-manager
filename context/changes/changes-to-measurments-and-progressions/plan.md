# Top progression 0.9 (RC) and Unified Period Pickers Implementation Plan

## Overview

Ship Top progression 0.9 as a release candidate: a new island beside the unchanged 0.1, on by default, with a yellow "RC" badge. It brings per-chart circumference filters, an arrowed Week/Month/Year/Years choice box on the right, and Month radars with one axis per day. Alongside it, every measurements tile moves to one fixed-width period picker, and Visualize, Clear and "x of 15 selected" sit on the left of a single row under the table (roadmap S-51, PRD MS-42, issue #187).

## Current State Analysis

- The component registry [components.ts:36-80](src/lib/components.ts#L36-L80) gives each version `{ id, label, preview: boolean }`. `top-changes` has a single version `0.1` (preview), and its `defaultVersion` is `"off"`.
- Choices live in `profiles.component_settings` (jsonb, migration `20261101120000_profile_component_settings.sql`). Saving writes the whole resolved object ([components.ts:198-213](src/lib/components.ts#L198-L213)), so anyone who has saved Settings once has `"top-changes": "off"` stored. Changing `defaultVersion` alone never reaches them.
- `ComponentTile` ([types.ts:67-71](src/types.ts#L67-L71)) carries only `shown` and `preview`. The page cannot tell which version was chosen.
- The only version badge is the red [PreviewBadge.tsx](src/components/measurements/PreviewBadge.tsx), rendered by [CollapsibleTile.astro](src/components/measurements/CollapsibleTile.astro) from a `preview` prop. `global.css` has no warning (yellow) token.
- Settings labels a version as `v0.1 (preview)` ([component-settings-form.ts:20-22](src/lib/component-settings-form.ts#L20-L22)).
- There are two copies of the period picker. One is `PickerField` in [ChartPeriodControls.tsx:50-196](src/components/measurements/ChartPeriodControls.tsx#L50-L196), used by Progression and Top progression. The other is inlined in [MeasurementBrowser.tsx:1111-1188](src/components/measurements/MeasurementBrowser.tsx#L1111-L1188). Both reserve width with an invisible `widestMonthLabel` ("September YYYY"), but on a CSS grid that only sets a minimum. A wider label, such as the week "28 Sep – 4 Oct", stretches the box. Both already offer only periods with entries, and their buttons are disabled when there are none.
- The browser footer ([MeasurementBrowser.tsx:1255-1352](src/components/measurements/MeasurementBrowser.tsx#L1255-L1352)) renders the pager right-aligned, then a separate row with Visualize, Clear and the count.
- Top progression ([TopChangesCharts.tsx](src/components/measurements/TopChangesCharts.tsx)) has one `Circumferences` dropdown in the period row's `extra` slot. It is shared by both circumference charts and stored under `topChartsFieldsStorageKey`. Week/Month/Year/Years are toggle buttons.
- `subPeriodTotals` ([measurement-top-changes.ts:53-70, 128-163](src/lib/measurement-top-changes.ts#L53-L70)) makes Month axes calendar weeks clipped to the month. `topSubPeriod` breaks a tie in favour of the later row.

## Desired End State

- Settings lists Top progression as `Off`, `v0.1 (preview)` and `v0.9 (RC)`. A never-saved user, and every user whose stored value was `"off"`, sees 0.9. Users who chose 0.1 keep 0.1, and it looks and behaves as it does today, apart from the shared picker width.
- 0.9's tile header carries a yellow "RC" badge whose tooltip reads "Release candidate - it may contain bugs" on hover and keyboard focus. The badge uses a `--warning` role token for light and dark.
- In 0.9:
  - The date picker sits on the left. An arrowed Week/Month/Year/Years choice box sits on the right; ‹ is disabled on Week and › on Years.
  - Top circumference gain and Top circumference loss each have their own filter in the chart header, remembered separately. The weight charts have none.
  - In Month view every chart has one axis per day of the month. The legend names the day with the largest progress, and only days with progress are labelled, topped up to at least 3 with the first, last and middle days.
  - The four charts are grouped bar charts in the style of the shadcn "Bar Chart - Multiple" (Phase 5), one bar per field, on the pair's shared scale with a visible value axis. The loss charts are negative bar charts ("Bar Chart - Negative"). Only sub-periods with a change are drawn, except on Last 5 years, which keeps all five years. 0.1 keeps its radars.
- Every period choice box (Your measurements, Progression and both Top progression versions) is exactly as wide as "September 2026" plus its chevrons. 0.9's Week/Month/Year/Years box is as wide as "Month". Longer labels truncate, and no box changes width when the period changes.
- Under the measurements table: Visualize and Clear on the left of one line that never wraps; when the pager shows, a vertical divider and a compact pager ("‹ 2 / 5 ›", read out as "Page 2 of 5") sit on its right. "x of 15 selected" sits on its own line below (Phase 5). On a row narrower than 20rem, Visualize and Clear show only their icons.

### Key Discoveries:

- Saving writes every component's value ([components.ts:198-213](src/lib/components.ts#L198-L213)). This is why the Off→0.9 migration is needed.
- The old Worker resolves an unknown stored version back to its default ([components.ts:128-131](src/lib/components.ts#L128-L131)), so a stored `"0.9"` reads as `off` until the new Worker runs. The migration is backward compatible.
- `check:home-tokens` ([scripts/check-home-tokens.mjs](scripts/check-home-tokens.mjs)) bans literal and palette colours in the files on its allowlist. New views must be added to that list.
- The e2e test [top-changes-charts.spec.ts](tests/e2e/top-changes-charts.spec.ts) picks v0.1 and drives the Circumferences menu and period buttons. It keeps testing 0.1, so it needs no layout changes. [component-settings.spec.ts:56-113](tests/e2e/component-settings.spec.ts#L56-L113) expects Top progression to be Off by default.

## What We're NOT Doing

- No rename: the tile and the Settings row stay "Top progression" for both versions.
- No change to 0.1's layout (period buttons, the shared Circumferences menu, week axes on Month). 0.1 only picks up the shared picker width.
- No filter on the weight charts, and no mixing of kg and cm on one radar.
- No wrap-around on the period arrows.
- No change to which periods the pickers offer. They already offer only periods with entries and grey out with the no-measurements message when there are none, and the shared picker keeps that behaviour.
- No promotion of 0.9 to stable, and no removal of 0.1.
- No schema change. The only migration updates data in the existing jsonb column.
- No change to the Progression (line chart) layout beyond the shared picker and, in Phase 5, the Week/Month/Year/Years box.
- No range select inside the 0.9 bar-chart cards: the tile's period pickers own the window.
- No stacked bars, and no merged gain/loss chart: 0.9 keeps four cards with grouped series.
- No bar charts in 0.1: it keeps its radars.

## Implementation Approach

Build bottom-up so nothing user-visible changes until the release phase. First extract a single picker and fix the footer. Next add the daily Month axes as an opt-in library mode. Then build 0.9 as a separate island that the kitchen sink can show before release. Last, add the version stage, the badge, the page wiring and the default flip with its migration in one phase, so 0.9 goes live in one commit.

## Critical Implementation Details

- **Migration ordering:** the migration reaches hosted Supabase before the new Worker. While the old Worker is still running, a user who saves Settings writes `"off"` back. That window is short and accepted.
- **Fixed width:** the picker box must be fixed to the widest label's width (for example, the invisible "September YYYY" sizer sets the width and the visible label truncates inside it), not merely given a minimum. Otherwise a week label still stretches it.
- **Month day labels:** Recharts draws every `PolarAngleAxis` tick, so an unlabelled day needs an empty `axisLabel` while its full `label` stays for the tooltip.

## Phase 1: Shared Period Picker and Browser Footer

### Overview

Extract one picker used by every measurements tile, fix its width to "September YYYY", and put Visualize, Clear and the count on the left of one footer row with the pager.

### Changes Required:

#### 1. Shared picker component

**File**: `src/components/measurements/PeriodPicker.tsx` (new), `src/components/measurements/ChartPeriodControls.tsx`

**Intent**: Move `PickerField` into its own component so the browser and the chart tiles share one implementation, and make its box exactly as wide as its widest label.

**Contract**: The props are those of today's `PickerField` (`groupLabel`, `label`, `ariaLabel`, `widestLabel`, `options`, `selectedKey`, `previous`, `next`, `onChoose`). The box width is fixed by `widestLabel`, and a longer `label` truncates. The behaviour stays: an empty `options` list disables the button, the list scrolls past five items, Esc and a click outside close it, and the step buttons keep their aria-labels. `ChartPeriodControls` imports it, and its DOM and aria stay unchanged apart from the width.

#### 2. Browser month picker and footer

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Replace the inlined month picker with `PeriodPicker` (group "Month", "Previous month"/"Next month", `widestMonthLabel`), keeping its list-scroll threshold. Merge the pager and the actions into one row under the table.

**Contract**: One row. On the left: Visualize (or the disabled Visualize), Clear, and "{n} of 15 selected". Only when `showPager`: a vertical divider (the `border-border` token) and the pager pushed to the right. The row wraps on a phone, and the divider hides once the row has wrapped (for example, it is shown from the `measurement-row` breakpoint). When there are no measurements yet the row stays hidden, as today. If the month has no entries the actions still show, as today.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npx astro check` passes
- `npm test` passes
- `npx playwright test tests/e2e/measurement-charts.spec.ts tests/e2e/top-changes-charts.spec.ts` passes

#### Manual Verification:

- On `/kitchen-sink/journal` and `/measurements`, the month, week, year and "Last 5 years" boxes in Your measurements, Progression and Top progression 0.1 are all the same width, and the box does not change width when you switch between a week such as "28 Sep – 4 Oct" and "May 2026".
- With more entries than one page holds, Visualize, Clear and the count sit on the left, with a vertical divider and the pager on the right. With a single page there is no divider and no pager. On a phone the row wraps without a stray divider.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Daily Month Axes in the Top-Changes Library

### Overview

Let `subPeriodTotals` build one axis per day for Month, with the label rule from note 8. 0.1 keeps its week axes.

### Changes Required:

#### 1. Day axes for Month

**File**: `src/lib/measurement-top-changes.ts`

**Intent**: Add an opt-in month-axis mode so 0.9 gets one row per day of the month, while the default keeps today's calendar-week rows for 0.1.

**Contract**: `subPeriodTotals(entries, fields, period, window, direction, options?)` takes `options.monthAxis: "weeks" | "days"`, defaulting to `"weeks"`. With `"days"` and `period === "month"`, each row's key is the day (`YYYY-MM-DD`) and its `label` is the full name (e.g. `Thu 12 Nov`). `axisLabel` is the day number for labelled days and `""` for the others. Week, Year and Years ignore the option.

#### 2. Month label rule

**File**: `src/lib/measurement-top-changes.ts`

**Intent**: A pure helper that decides which day rows in a chart carry an axis label, applied per chart (to the gain rows and the loss rows separately).

**Contract**: A day is labelled when any of the chart's fields has `count > 0` on it. When fewer than 3 days are labelled, add the first day, then the last, then the middle day (day `ceil(daysInMonth / 2)`, so 16 for a 31-day month, 15 for 30 and 14 for 28), skipping any already labelled, until at least 3 are labelled. Examples for a 31-day month: no progress gives 1, 16, 31. Progress on the 12th gives 1, 12, 31. Progress on the 5th and 20th gives 1, 5, 20. Progress on the 1st gives 1, 31, 16. Progress on 4 days labels only those 4. `topSubPeriod` is unchanged, so the legend names the day with the largest sum (a tie goes to the later day).

#### 3. Unit tests

**File**: `src/lib/measurement-top-changes.test.ts`

**Intent**: Cover the day rows and the label rule, and pin that the default `"weeks"` mode is unchanged.

**Contract**: Cases: 28-, 30- and 31-day months; each worked example above; gain and loss labelled independently; the top day appears in the legend label; the existing week-mode tests stay green unchanged.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including the new day-axis and label-rule cases
- `npm run lint` passes
- `npx astro check` passes

**Implementation Note**: After completing this phase and all automated verification passes, continue to Phase 3; there is no manual check here.

---

## Phase 3: Top Progression 0.9 Island

### Overview

Build the 0.9 island with an arrowed period box on the right, per-chart circumference filters and day axes on Month. Show it in the kitchen sink. It is not wired to `/measurements` yet.

### Changes Required:

#### 1. Period-type choice box

**File**: `src/components/measurements/ChartPeriodControls.tsx`

**Intent**: Let the controls render Week/Month/Year/Years either as today's toggle buttons (0.1 and Progression) or as a `PeriodPicker` on the right (0.9).

**Contract**: A new prop `periodControl: "buttons" | "picker"`, defaulting to `"buttons"`. In picker mode the box is grouped as "Chart period" so the existing aria hook stays, with "Previous chart period"/"Next chart period" arrows that step Week ↔ Month ↔ Year ↔ Years. ‹ is disabled on Week and › on Years. The list offers all four, and the width is the shared fixed width. The date picker stays on the left and the period box gets `ml-auto`. The row wraps on a phone.

#### 2. Circumference filter per chart

**File**: `src/components/measurements/TopChangeChart.tsx`, `src/components/measurements/TopChangesChartsRc.tsx` (new)

**Intent**: `TopChangeChart` gets an optional header slot. The 0.9 island puts a filter there on both circumference charts, each with its own selection. The weight charts get nothing.

**Contract**: The filter is an icon button (a filter icon with the aria-label "Filter circumferences: <chart title>") that opens the same checkbox dropdown as today's `CircumferenceFilter`: all 7 fields by default, the last checked field cannot be unchecked, and the menu stays open while toggling. Each chart keeps its own field list. The gain/loss pair still shares one radar scale, computed over the union of the two selections.

#### 3. 0.9 island

**File**: `src/components/measurements/TopChangesChartsRc.tsx` (new), `src/components/measurements/TopChangesTile.astro`

**Intent**: A sibling of `TopChangesCharts` that reuses `useChartPeriodRead` and the existing period storage key, renders `ChartPeriodControls` with `periodControl="picker"` and no `extra`, and calls `subPeriodTotals(..., { monthAxis: "days" })`. The tile picks the island with a version prop.

**Contract**: `TopChangesTile` takes `version: "0.1" | "0.9"` (default `"0.1"`), and `initialFields` becomes `initialGainFields`/`initialLossFields` for 0.9. Both versions share `topChartsPeriodStorageKey`. The filters are stored in new keys and cookies, `topChartsGainFieldsStorageKey` and `topChartsLossFieldsStorageKey` (`tm.measurements.topChartsGainFields.<account>.<trainee>` and the same with `LossFields`, in [measurement-page.ts](src/lib/measurement-page.ts)), parsed with `parseTopChartsFields`. A missing key falls back to all 7 fields. Heading, empty and loading states match 0.1.

#### 4. Kitchen sink and token check

**File**: `src/pages/kitchen-sink/journal.astro`, `scripts/check-home-tokens.mjs`, `src/lib/measurement-page.test.ts`

**Intent**: Show the 0.9 tile in local mode (a populated month, a single-progress-day month, a no-progress month and a filtered selection), add the new files to the token allowlist, and test the new storage keys.

**Contract**: The new sink sections are labelled "Top progression 0.9 (RC)". The new files are `PeriodPicker.tsx` and `TopChangesChartsRc.tsx` (and `VersionBadge.tsx` in Phase 4).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npx astro check` passes
- `npm test` passes, including the gain/loss field storage-key tests
- `npx playwright test tests/e2e/top-changes-charts.spec.ts` still passes (0.1 unchanged)

#### Manual Verification:

- On `/kitchen-sink/journal`, the 0.9 tile shows the date picker on the left and the Week/Month/Year/Years box with arrows on the right. ‹ is disabled on Week and › on Years.
- Each circumference chart's filter changes only that chart, and the weight charts have no filter.
- Month radars show one axis per day, labels follow the rule (e.g. 1, 12, 31 for a single progress day on the 12th), and the legend names the top day.
- On a phone-width viewport the period row wraps cleanly and the radars stay readable.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Release 0.9 as RC by Default

### Overview

Add a version stage, the yellow RC badge and the Settings label, render the chosen version's island, make 0.9 the default, and migrate stored Off to 0.9.

### Changes Required:

#### 1. Version stages in the registry

**File**: `src/lib/components.ts`, `src/types.ts`, `src/lib/component-settings-form.ts`

**Intent**: Replace the `preview` boolean with a stage, so a version can be stable, a release candidate or a preview, and the page can tell which version to render.

**Contract**: `ComponentVersion` becomes `{ id, label, stage: "stable" | "rc" | "preview" }`. `top-changes.versions` = `[{ id: "0.1", stage: "preview" }, { id: "0.9", stage: "rc" }]` with `defaultVersion: "0.9"`. `ComponentTile` becomes `{ shown, stage, version }` (`stage`/`version` are `null` when not shown), and `tileOf` defaults to `{ shown: true, stage: "stable", version: null }`. `shownVersion` returns the stage instead of `preview`. The Settings label reads `v1.0`, `v0.1 (preview)` or `v0.9 (RC)`.

#### 2. Warning token and version badge

**File**: `src/styles/global.css`, `src/components/measurements/VersionBadge.tsx` (replaces `PreviewBadge.tsx`), `src/components/ui/badge.tsx`, `src/components/measurements/CollapsibleTile.astro`

**Intent**: Add `--warning`/`--warning-foreground` for light and dark (registered as `--color-warning*`) and a `warning` badge variant. Generalise the badge so a preview shows the red "Preview" and an RC shows the yellow "RC" with the tooltip "Release candidate - it may contain bugs".

**Contract**: `CollapsibleTile` takes `stage` instead of `preview`. Neither badge toggles `<details>`, and both keep the `data-preview-badge` hook (the RC badge adds `data-rc-badge`). The Preview tooltip text is unchanged. The yellow must meet WCAG AA contrast with its foreground in both themes.

#### 3. Page wiring

**File**: `src/components/journal/TraineeJournal.astro`, `src/components/trainer/TrainerPanel.astro`, `src/pages/measurements.astro`, other `preview={…}` call sites

**Intent**: Pass each tile's stage, and pass `version` to `TopChangesTile` so 0.9 renders the new island. Read the gain/loss field cookies on the server for the first render.

**Contract**: Every `preview={tile.preview}` becomes `stage={tile.stage}`. `TopChangesTile` receives `version={topChartsTile.version}`, plus `initialGainFields`/`initialLossFields` when it is 0.9.

#### 4. Off → 0.9 data migration

**File**: `supabase/migrations/20261102130000_top_changes_rc_default.sql` (new)

**Intent**: Move every profile whose stored `top-changes` choice is `"off"` to `"0.9"`. Stored `"0.1"` and null settings are left alone (null already resolves to the new default).

**Contract**: An `update public.profiles` that sets `component_settings` → `components` → `top-changes` = `"0.9"` where `component_settings->'components'->>'top-changes' = 'off'`, with no other keys touched. Data only, idempotent, and it respects the existing 4096-byte check. Backward compatible: the old Worker resolves `"0.9"` to its default, `off`.

#### 5. Tests

**File**: `src/lib/components.test.ts`, `src/lib/component-settings-form.test.ts`, `tests/e2e/component-settings.spec.ts`, `tests/e2e/top-changes-charts.spec.ts` (new 0.9 cases or a new spec), `scripts/smoke.mjs` if it asserts the default

**Intent**: Bring the tests in line with stages and the new default, and cover 0.9 in the browser.

**Contract**:
- Unit: the default is `"0.9"`; stored `"off"` and `"0.1"` are respected; unknown versions fall back to `"0.9"`; tile stage and version are right; the label is `v0.9 (RC)`.
- E2E: Settings shows v0.9 (RC) as the default. The tile shows the yellow RC badge with its tooltip on hover and focus, and the badge does not collapse the tile. Choosing v0.1 shows the red Preview badge and the old layout. In 0.9, the period box arrows step and stop at the ends and are remembered across a reload, and each circumference filter is remembered separately across a reload.
- `npm run migration-check` covers the new migration.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npx astro check` passes
- `npm test` passes
- `npm run migration-check` passes with the new migration
- `npx playwright test` passes
- `npm run build` succeeds and `npm run smoke` passes against the preview

#### Manual Verification:

- A user with saved settings stored as Off sees Top progression 0.9 with the yellow RC badge after the migration, and a user on 0.1 still sees 0.1 with the red Preview badge.
- The RC badge is readable and yellow in both light and dark themes, and its tooltip reads "Release candidate - it may contain bugs".
- As a trainer viewing a linked trainee, 0.9 renders the same way.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Phase 5: Bar Charts in Top Progression 0.9

### Overview

Replace 0.9's four radar charts with bar charts in the style of the shadcn "Bar Chart - Multiple", the loss pair drawn as negative bar charts. The data, the four cards, their filters, the shared pair scale and the legend stay as they are. 0.1 keeps its radars. (An area-chart version was tried first and dropped after review.)

### Changes Required:

#### 1. Shared chart helpers

**File**: `src/components/measurements/TopChangeChart.tsx`, `src/components/measurements/top-change-chart-parts.tsx` (new)

**Intent**: Move the pieces both chart kinds need out of the radar so the bar chart reuses them rather than copying them: the signed value ("+1.0 cm", "−0.5 kg"), the changes count, the legend list with each changed series' top sub-period, the tooltip content, and the card frame (caption with the optional header, empty state, `h-96` client-only plot slot, legend).

**Contract**: Pure extraction. `TopChangeChart` renders the same DOM, aria, legend and tooltip as before, so 0.1 does not change.

#### 2. Library: day labels, value ticks, bar layout, changed sub-periods

**File**: `src/lib/measurement-top-changes.ts`, `src/lib/measurement-top-changes.test.ts`

**Intent**: Pure helpers for the bar chart, each unit-tested.

**Contract**:
- A Month day row's `axisLabel` is the day number alone (`12`, not `12 Nov`); `label` keeps the full name (`Thu 12 Nov`). Only 0.9 uses day rows.
- `valueAxisTicks(scale)`: 0 up to the first round step (1, 2, 2.5 or 5 × 10ⁿ, about 4 steps) at or above the pair's scale.
- `topChangeBarLayout(plotWidth, rows, fieldCount)`: every bar is as wide as a circumference bar on Last 5 years with all 7 circumferences, in every chart and period (min 4 px). Each sub-period slot fits its bars and its axis label, and the plot grows past the card when the slots need more room.
- `changedSubPeriods(rows, period)`: only the rows where any field changed; `years` keeps every year.

#### 3. Bar chart card

**File**: `src/components/measurements/TopChangeBarChart.tsx` (new)

**Intent**: The 0.9 chart card. It takes the same props as `TopChangeChart` (`title`, `rows`, `fields`, `scale`, `direction`, `emptyText`, `header`).

**Contract**:
- Grouped (not stacked) rounded bars, one per field, horizontal-only grid, the shared tooltip, no range select.
- A value axis with units (`0 kg … 3 kg`), pinned on the left while a wider plot scrolls sideways; the plot opens scrolled to the largest change. The top tick clears the card title.
- Loss charts are negative: bars hang down from 0 and the axis reads `0 … −3 cm` with the typographic minus. The pair keeps one scale.
- Each series' top sub-period bar is drawn at full strength; the others are dimmed.
- The legend, empty state, caption with the optional filter header, `aria-labelledby` and the `h-96` server placeholder match `TopChangeChart`.

#### 4. Wire into 0.9

**File**: `src/components/measurements/TopChangesChartsRc.tsx`, `src/components/measurements/ChartPeriodControls.tsx`, `scripts/check-home-tokens.mjs`, `src/pages/kitchen-sink/journal.astro`

**Intent**: The 0.9 grid renders `TopChangeBarChart` for all four cards with `changedSubPeriods` rows (the scale still comes from the full rows). The circumference cards show the short titles "Top circ. gain"/"Top circ. loss" while the full title stays their accessible name. The new files go on the token allowlist. The kitchen sink's "Top progression 0.9 (RC)" copy describes the bar charts.

**Contract**: `TopChangesCharts` (0.1) still imports `TopChangeChart`. The filter aria-labels and storage keys are unchanged.

#### 5. Period-type control and loading

**File**: `src/components/measurements/ChartPeriodControls.tsx`, `src/components/measurements/MeasurementCharts.tsx`, `src/components/measurements/TopChangesChartsRc.tsx`, `src/components/hooks/useLastSettled.ts` (new), `src/components/hooks/useChartPeriodRead.ts`

**Intent**: One period-type control for 0.9 and Progression that always fits on one line, and no collapsing tile while a period loads.

**Contract**:
- Progression switches to `periodControl="picker"` like 0.9 (0.1 keeps its buttons). The Week/Month/Year/Years box is as wide as "Month".
- When the row (a container query, `@lg`) is too narrow for the box beside the date picker, the box folds into an icon button with the filter icon (aria-label "Chart period: <period>") opening a radio list of the four. The row never wraps.
- While a new period loads, both islands keep the last drawn charts, dimmed and `aria-busy`, with a screen-reader-only "Loading charts…" status, instead of replacing them with the loading line. The kitchen sink's local read is memoised so its identity is stable between renders.

#### 6. Measurements table footer

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Keep the actions and the pager on one line by moving the count below and shortening the pager.

**Contract**: First line, no wrap: Visualize and Clear, then (only when paged) a divider and the pager `‹ 2 / 5 ›` with `size-8` arrows, its text `aria-hidden` and a screen-reader-only "Page 2 of 5". Below it: "{n} of 15 selected". The footer is a container; under `@xs` (20rem) the two actions drop their words for their icons and keep `aria-label`s "Visualize" and "Clear". The arrows keep "Previous page"/"Next page".

#### 7. E2E

**File**: `tests/e2e/top-changes-rc.spec.ts`, `tests/e2e/top-changes-charts.spec.ts`

**Intent**: Pin which chart kind each version draws.

**Contract**: The 0.9 tile draws data bars in its plot and no radar (`.recharts-radar`). The 0.1 tile still renders radars and no bar series (`.recharts-bar`). At phone width the period box folds into the icon on the date picker's line, and choosing from its list is remembered. The circumference cards show the short title and keep the full one for assistive technology. The existing 0.9 period and filter tests stay green.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npx astro check` passes
- `npm test` passes
- `npx playwright test tests/e2e/top-changes-rc.spec.ts tests/e2e/top-changes-charts.spec.ts tests/e2e/component-settings.spec.ts` passes

#### Manual Verification:

- Progression and 0.9 share the arrowed Week/Month/Year/Years box (as wide as "Month"), which folds into the filter icon on a narrow row; switching period no longer collapses either tile.
- Under the measurements table, Visualize, Clear and the compact pager share one line at every width, with "x of 15 selected" below.
- On `/kitchen-sink/journal` and `/measurements`, 0.9 shows four bar-chart cards with fixed-width bars, a visible value axis and negative loss charts. Each pair shares one scale, and the top bar is at full strength.
- Only days or months with a change are drawn (all five years on Last 5 years). The tooltip shows the sub-period and each field's signed value and count. The per-chart filters still change only their chart.
- The charts read well in light and dark themes and at phone width (the plot scrolls under a pinned axis), and 0.1 still shows radars.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- Day rows and the label rule (`measurement-top-changes.test.ts`): month lengths, the worked examples, gain and loss labelled independently, and week mode unchanged.
- Registry stages, the default, stored-value respect and the Settings labels (`components.test.ts`, `component-settings-form.test.ts`).
- Gain/loss filter storage keys and parsing (`measurement-page.test.ts`).

### Integration Tests:

- Playwright: the 0.9 default with the RC badge and tooltip; 0.1 still selectable with Preview and the old controls; the 0.9 period box arrows and persistence; the per-chart filters and their persistence; Visualize/Clear behaviour unchanged in `measurement-charts.spec.ts`.
- `migration-check` for the data migration.

### Manual Testing Steps:

1. In `/kitchen-sink/journal`, compare picker widths across all tiles while switching to a long week label.
2. In `/measurements` with more than one page, check the footer row and the divider on desktop and on a phone.
3. As a user with Top progression stored as Off, apply the migration locally (`npx supabase db reset`) and confirm 0.9 shows with the RC badge.
4. In 0.9, pick a month with progress on a single day and check the labels 1, that day and 31.

## Performance Considerations

Day rows make a Month radar 28–31 axes, built in one pass over the entries already in the window, so there is no new read. The period lists still come from `days`, as today, so the journal is not walked per render (S-24).

## Migration Notes

The data-only migration `20261102130000_top_changes_rc_default.sql` changes `"off"` to `"0.9"` for `top-changes`. It is safe if run twice. The previous Worker reads `"0.9"` as unknown and falls back to `off`, so no schema or code coupling breaks during rollout. A user who deliberately switched Top progression off sees 0.9 once and can switch it off again. This was accepted during planning.

## References

- Change notes: `context/changes/changes-to-measurments-and-progressions/change.md`
- Roadmap: `context/foundation/roadmap.md` S-51 / MS-42, issue #187
- Prior: `context/archive/2026-11-01-component-version-system/plan.md`, `context/archive/2026-11-01-top-progress-charts/plan.md`, `context/archive/2026-10-28-visualization-of-measurements/plan.md`
- Picker: [ChartPeriodControls.tsx:50-196](src/components/measurements/ChartPeriodControls.tsx#L50-L196), [MeasurementBrowser.tsx:1111-1188](src/components/measurements/MeasurementBrowser.tsx#L1111-L1188)
- Lessons: `context/foundation/lessons.md` (errors as toasts; no inline error messages are planned)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared Period Picker and Browser Footer

#### Automated

- [x] 1.1 `npm run lint` passes — 4502579
- [x] 1.2 `npm run check:home-tokens` passes — 4502579
- [x] 1.3 `npx astro check` passes — 4502579
- [x] 1.4 `npm test` passes — 4502579
- [x] 1.5 `npx playwright test tests/e2e/measurement-charts.spec.ts tests/e2e/top-changes-charts.spec.ts` passes — 4502579

#### Manual

- [x] 1.6 Period boxes in all tiles share one width and don't resize between labels — 4502579
- [x] 1.7 Footer row: actions left, divider + pager right when paged; wraps on a phone without a stray divider — 4502579

### Phase 2: Daily Month Axes in the Top-Changes Library

#### Automated

- [x] 2.1 `npm test` passes, including the new day-axis and label-rule cases — a3191f6
- [x] 2.2 `npm run lint` passes — a3191f6
- [x] 2.3 `npx astro check` passes — a3191f6

### Phase 3: Top Progression 0.9 Island

#### Automated

- [x] 3.1 `npm run lint` passes — 26b5897
- [x] 3.2 `npm run check:home-tokens` passes — 26b5897
- [x] 3.3 `npx astro check` passes — 26b5897
- [x] 3.4 `npm test` passes, including the gain/loss field storage-key tests — 26b5897
- [x] 3.5 `npx playwright test tests/e2e/top-changes-charts.spec.ts` still passes (0.1 unchanged) — 26b5897

#### Manual

- [x] 3.6 0.9 sink: date picker left, arrowed period box right, arrows stop at the ends — 26b5897
- [x] 3.7 Each circumference chart's filter changes only that chart; weight charts have no filter — 26b5897
- [x] 3.8 Month radars show day axes with the label rule and the top day in the legend — 26b5897
- [x] 3.9 Phone width: the period row wraps cleanly and the radars stay readable — 26b5897

### Phase 4: Release 0.9 as RC by Default

#### Automated

- [x] 4.1 `npm run lint` passes — a79c643
- [x] 4.2 `npm run check:home-tokens` passes — a79c643
- [x] 4.3 `npx astro check` passes — a79c643
- [x] 4.4 `npm test` passes — a79c643
- [x] 4.5 `npm run migration-check` passes with the new migration — a79c643
- [x] 4.6 `npx playwright test` passes — a79c643
- [x] 4.7 `npm run build` succeeds and `npm run smoke` passes against the preview — a79c643

#### Manual

- [x] 4.8 Stored-Off user sees 0.9 with the RC badge after migration; a 0.1 user keeps 0.1 with Preview — a79c643
- [x] 4.9 RC badge is yellow and readable in light and dark, with the right tooltip — a79c643
- [x] 4.10 Trainer view of a linked trainee renders 0.9 the same way — a79c643

### Phase 5: Bar Charts in Top Progression 0.9

#### Automated

- [x] 5.1 `npm run lint` passes
- [x] 5.2 `npm run check:home-tokens` passes
- [x] 5.3 `npx astro check` passes
- [x] 5.4 `npm test` passes
- [x] 5.5 `npx playwright test tests/e2e/top-changes-rc.spec.ts tests/e2e/top-changes-charts.spec.ts tests/e2e/component-settings.spec.ts` passes

#### Manual

- [x] 5.6 0.9 shows four bar-chart cards with fixed-width bars, a value axis, negative loss charts and a shared pair scale
- [x] 5.7 Only changed days/months are drawn (all 5 years on Years); tooltip shows signed values and counts; filters change only their chart
- [x] 5.8 Light, dark and phone width read well, and 0.1 still shows radars
- [x] 5.9 Progression and 0.9 share the Month-wide period box that folds into the filter icon; switching period no longer collapses a tile
- [x] 5.10 Table footer: Visualize, Clear and the compact pager on one line, "x of 15 selected" below; icon-only actions on a phone
