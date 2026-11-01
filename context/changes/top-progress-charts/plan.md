# Top Changes Radar Charts Implementation Plan

## Overview

Add a separate, collapsible **Top changes** tile on `/measurements` with four shadcn radar charts: top weight gain, top circumference gain, top weight loss and top circumference loss. Each one covers the selected week, month, year or last 5 years. The tile has its own period controls, which match the line charts tile. A remembered circumference filter drives both circumference charts, and every chart has a legend. Trainee and linked trainer share the component (S-46, MS-37).

## Current State Analysis

- The line charts tile (S-41) is a server-rendered `<details>` shell, [ChartsTile.astro:47-133](src/components/measurements/ChartsTile.astro#L47-L133), around the `MeasurementCharts` React island. The shell's inline script remembers the open state under `chartsOpenStorageKey`, in localStorage plus a cookie.
- All period logic lives inside `MeasurementCharts`: the local `PickerField` ([MeasurementCharts.tsx:226-371](src/components/measurements/MeasurementCharts.tsx#L226-L371)), the period buttons (:660-684), the preference restore and persist (:480-505), the days read (:507-520), the serial-guarded fetch (:522-549) and the loading/error/empty states (:601-618). None of it can be reused without extracting it first.
- `GET /api/measurements/chart` returns every entry in the window. Each entry carries the list's per-field `deltas` versus its previous journal entry, including the first entry in the window, whose predecessor lies before it ([services/measurements.ts:364-391](src/lib/services/measurements.ts#L364-L391)). So the top changes can be computed client-side from data that read already returns.
- `/measurements` seeds the line tile with `readInitialChart` ([measurements.astro:133-153](src/pages/measurements.astro#L133-L153)), which runs in parallel with the list read. Mounts: [TraineeJournal.astro:186-199](src/components/journal/TraineeJournal.astro#L186-L199) and [TrainerPanel.astro:141-155](src/components/trainer/TrainerPanel.astro#L141-L155).
- Recharts 3.8.0 is installed, but nothing uses `RadialBarChart`/`RadialBar`/`PolarAngleAxis` yet. `ChartLegend`/`ChartLegendContent` exist in [chart.tsx:234-326](src/components/ui/chart.tsx#L234-L326) but are unused. `DropdownMenuCheckboxItem` exists in `ui/dropdown-menu.tsx`.
- Field colours: `chartFieldColor(field)` gives `var(--chart-N)` by field order ([measurement-chart.ts:384-387](src/lib/measurement-chart.ts#L384-L387)), with light and dark tokens in `global.css`.

## Desired End State

On `/measurements`, below the line charts tile, a trainee sees a **Top changes** card that starts open and remembers being closed. A linked trainer sees the same card, read-only, for the selected trainee. The card has the same Week/Month/Year/Years buttons and period picker as the line tile, remembered separately. It shows a 2×2 grid on wide screens (gains in the top row, losses in the bottom row) and one column on narrow screens:

1. **Top weight gain**: a radar whose axes are the sub-periods of the selected period: Week → the 7 dates of that week, Month → the calendar weeks (Mon–Sun, clipped to the month) of that month, Year → its 12 months, Years → the 5 years. Each axis is valued by the sum of the weight gains in that sub-period (0 when none). The top sub-period is named with its value, e.g. `3–9 Nov +1.5 kg`.
2. **Top circumference gain**: a shadcn "Radar Chart - Multiple" on the same sub-period axes, with one series per selected circumference in its own line-chart colour, each valued by that field's summed gains per sub-period (e.g. Year: thigh +1 and +1 in March → March = +2). The legend names each field with its top sub-period and value, e.g. `Waist · March +2.0 cm`.
3. **Top weight loss**: the same as 1, for summed drops, e.g. `−0.5 kg`.
4. **Top circumference loss**: the same as 2, for summed drops.

Gains and drops are summed separately: a field that goes +1 then −1 shows 1 on both charts. An axis point's tooltip shows the sub-period, each series' signed value and how many changes it adds up.

> **Re-plan (2026-11-01, during Phase 3):** the original rule (each ring = the single largest entry-vs-previous delta) was replaced by the sums above at the user's request. Phase 1's `topChanges` is replaced in Phase 3, change 0.
>
> **Re-plan 2 (2026-11-01, during Phase 3):** the charts are shadcn **radar** charts, not radial bar charts (Phase 3, change 0b). Weight radars show every sub-period as an axis, with the largest highlighted; the circumference filter keeps at least 3 fields. Progress row titles 3.6, 3.8 and 4.12 keep their original wording ("radial", "keeps one field", "rings") per the progress-format rule; read them as radar / keeps three fields / areas.
>
> **Re-plan 3 (2026-11-01, during Phase 3):** circumference charts become shadcn **Radar Chart - Multiple** (one series per field, own colour) on sub-period axes, and weight uses the same axes with one series. Month axes are calendar weeks, not days. The filter goes back to keeping at least 1 field (axes no longer depend on it). Phase 3 change 0c supersedes 0b and the radar parts of changes 1 and 2 where they conflict.
>
> **Addendum (2026-11-01, impl review F1):** light `--chart-8` (navel) changed from green (150) to blue (255), because green was hard to tell from chest's teal (184) on the radars. This is a value change, not a new token, and it avoids red and green. The dark palette is unchanged.
>
> **Addendum (2026-11-01, impl review F3):** `tests/e2e/measurement-charts.spec.ts` gained a `chartsTile()` helper that scopes its "Chart period" lookups to the line tile, because the second tile's period row otherwise breaks Playwright's strict mode and `toBeHidden`. The assertions are unchanged.
>
> **Addendum (2026-11-01, impl review F4):** `TopChangeChart` draws its legend as a list below the plot instead of `ChartLegendContent`, because the in-SVG legend overlapped the radar. The legend lists series largest first. The hidden radius axis uses `[0, scale × 1.15]` for headroom, so the top point's larger dot is not clipped.

A "Circumferences" dropdown with checkboxes filters charts 2 and 4 together and is remembered per account and trainee. Verify with the unit tests, the kitchen sinks, the E2E spec and a manual check on the production preview.

### Key Discoveries:

- A change is the list's consecutive-entry delta: `deltaBetween` returns `{direction, difference}` and `difference ≥ 0` ([measurement-deltas.ts:19-28](src/lib/measurement-deltas.ts#L19-L28)). An entry with `deltas === null` (the trainee's first-ever entry) has no change.
- The line tile buckets entries with `latestPerBucket` ([MeasurementCharts.tsx:375](src/components/measurements/MeasurementCharts.tsx#L375)). The top changes must use `body.entries` **before** bucketing, or changes are lost.
- Storage keys follow `tm.measurements.<thing>.<account>[.<trainee>]` ([measurement-page.ts:80-98](src/lib/measurement-page.ts#L80-L98)), written through `writePreference` ([browser-storage.ts:3-31](src/lib/browser-storage.ts#L3-L31)).
- `check-home-tokens.mjs` checks only the files in its `FILES` list ([check-home-tokens.mjs:7-62](scripts/check-home-tokens.mjs#L7-L62)). New views must be added to it.
- PRD non-goal: "No good/bad coloring of deltas" (`context/foundation/prd.md:82`). Gains and losses keep their field colours, never green or red.

## What We're NOT Doing

- Sharing or following the line tile's period, and reacting to Visualize ("Selected entries") mode. The top tile always shows its own period.
- First-to-last (net) change, netting gains against drops, and skipping the first entry in the window. Every entry inside the window contributes its list delta to the gain or the loss sum.
- Top-N rankings, "smallest change" highlights, or more than one series per radar.
- Separate filters for the gain and loss charts, or a filter on the weight charts.
- Showing every tied sub-period. On a tie, the latest sub-period wins.
- SQL aggregation, a new RPC, migrations, or any schema change.
- New colour tokens, and good/bad (green/red) colouring.
- Hiding empty chart cards. They stay in the grid with a sentence.

## Implementation Approach

The math stays in pure, unit-tested helpers in `src/lib/`, following the `measurement-chart.ts` pattern. The line tile's period plumbing is extracted into a shared hook, a shared controls component and a shared collapsible shell, with no behaviour change, so both tiles run the same code under different storage keys. The new island computes the top changes from the same chart API response. The server seeds its first render in parallel with the existing reads, and reuses the line tile's range read when both preferences name the same period and anchor.

## Critical Implementation Details

- **Shared radar scale:** each pair shares one maximum: weight gain with weight loss, and circumference gain with circumference loss after filtering. Use a hidden `PolarRadiusAxis` with `domain=[0, pairMax]`, so areas compare across a pair. The grid (`PolarGrid`) uses role tokens (shadcn's `chart.tsx` styles), never a literal colour.
- **Heading selectors:** today the line tile's island finds its own title through `closest("[data-charts-tile]")` ([MeasurementCharts.tsx:551-563](src/components/measurements/MeasurementCharts.tsx#L551-L563)). Once the shell is shared, each tile must keep a distinct root attribute (or the shell takes a tile id), so one island never rewrites the other tile's heading.
- **Hydration:** a pre-mortem in the S-41 archive (`plan.md:40`) covers chart libraries breaking hydration on Workers under CommonJS and Auto Minify. Importing the recharts polar modules is new, so this has to be checked on the production preview (`npm run build && npm run preview`), not only `npm run dev`.

## Phase 1: Top changes logic

### Overview

Pure helpers for picking the top changes, the pair scale, the filter preference and the new storage keys, with unit tests. No UI.

### Changes Required:

#### 1. Top changes helper

**File**: `src/lib/measurement-top-changes.ts` (new), `src/lib/measurement-top-changes.test.ts` (new)

**Intent**: Pick, for each requested field, the largest gain or loss among the entries in the window. Use the list's delta, so the number matches the list's delta badge. On a tie, the latest entry wins.

**Contract**:
- `topChanges(entries: readonly ChartMeasurement[], fields: readonly MeasurementField[], direction: "up" | "down"): TopChange[]`
- `TopChange = { field, difference, measuredOn, previousMeasuredOn }`
- An entry counts for a field only when `deltas?.[field].direction === direction`.
- A field with no such entry is omitted.
- Equal `difference` → the later `measured_on` wins.
- The result is sorted by `difference` descending; equal differences across fields fall back to `measurementFields` order.
- `topChangeScale(...lists: TopChange[][]): number` returns the largest `difference` across the lists, or 0 when they are empty.
- `circumferenceFields` is the 7 fields after weight, in `measurementFields` order.

#### 2. Filter and storage preferences

**File**: `src/lib/measurement-page.ts`, `src/lib/measurement-page.test.ts`

**Intent**: Give the new tile its own remembered open state, period and circumference filter, following the existing key scheme.

**Contract**:
- `topChartsOpenStorageKey(account)` → `tm.measurements.topCharts.<account>` (parsed with the existing `parseChartsOpen`).
- `topChartsPeriodStorageKey(account, trainee)` → `tm.measurements.topChartsPeriod.<account>.<trainee>`. Its value has the same `period|YYYY-MM-DD` format as the line tile, parsed with the existing `parseChartPreference`.
- `topChartsFieldsStorageKey(account, trainee)` → `tm.measurements.topChartsFields.<account>.<trainee>`.
- `parseTopChartsFields(value: unknown): CircumferenceField[]`: comma-separated field names. Unknown names are dropped, and the result is ordered by `measurementFields`. An empty, missing or entirely invalid value returns all 7.
- `topChartsFieldsValue(fields)` serializes the selection.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`. They cover:
  - the worked example: window Nov; Oct 28 = 80.0, Nov 3 = 81.5, Nov 20 = 81.0 kg → weight gain 1.5 on Nov 3 (previous Oct 28), weight loss 0.5 on Nov 20
  - the tie: waist +1.0 on Nov 3 and +1.0 on Nov 20 → Nov 20
  - an empty result when weight only went down (no gains)
  - a `deltas: null` first-ever entry, which is skipped
  - sorting longest first, the fields filter, and `topChangeScale` across a gain/loss pair
  - the key strings, and the `parseTopChartsFields` fallbacks and order
- Lint passes: `npm run lint`
- Types check: `npx astro check`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Extract shared chart plumbing

### Overview

Pull the period plumbing and the collapsible shell out of the line tile so a second tile can reuse them. This is a refactor only: what the user sees and the line tile's storage keys stay identical.

### Changes Required:

#### 1. Period and read hook

**File**: `src/components/hooks/useChartPeriodRead.ts` (new), `src/components/measurements/MeasurementCharts.tsx`

**Intent**: Move the period/anchor state into one hook so both tiles can use it. That covers the preference restore and persist under a caller-supplied key, the days read, the serial-guarded fetch with server seeding, local (kitchen-sink) mode and `choosePeriod`.

**Contract**:
- Inputs: account and subject ids, `readOnly`, `month`, `today`, `entries`, `forceLoading`, the initial period, anchor, chart and days, a `periodStorageKey` builder, and an optional override query (the line tile's Visualize ids). With an override, the hook fetches by ids instead of the period. The `onClear` reset and the selection `reconcile` callback stay in `MeasurementCharts`; the hook only exposes what they need.
- Outputs: `period`, `anchor`, `days`, `body`, `loading`, `failed`, `choosePeriod`, `setAnchor`.
- The fetch and helpers (`fetchJson`, `readChartBody`, `chartQuery`, `localBody`) move with the hook or into a small module next to it.

#### 2. Period controls component

**File**: `src/components/measurements/ChartPeriodControls.tsx` (new), `src/components/measurements/MeasurementCharts.tsx`

**Intent**: Move `PickerField` and the Week/Month/Year/Years button group into one presentational component that renders the period row exactly as today.

**Contract**: props are `period`, `anchor`, `days`, `today`, `onChoosePeriod` and `onChooseAnchor`. The `aria-label`s stay "Chart period" and "Previous/Next period". An optional `extra` slot (React node) renders after the buttons; the top tile's filter uses it in Phase 3.

#### 3. Collapsible tile shell

**File**: `src/components/measurements/CollapsibleChartTile.astro` (new), `src/components/measurements/ChartsTile.astro`

**Intent**: Move the card, `<details>`, summary (title, note, chevron) and inline open-state script into one shell with a default slot for the island. `ChartsTile` becomes a thin wrapper around it.

**Contract**: props are `storageKey: string | null`, `startsOpen`, `title`, `note` and `tileId` (written to a `data-chart-tile` attribute, with title/note marked so each island finds only its own tile). The line tile's markup, `data-charts-*` selectors used by the E2E spec, and its storage key are unchanged.

#### 4. Token check list

**File**: `scripts/check-home-tokens.mjs`

**Intent**: Keep the extracted files under the literal-colour check.

**Contract**: add `CollapsibleChartTile.astro`, `ChartPeriodControls.tsx` and `useChartPeriodRead.ts` to `FILES`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Types check: `npx astro check`
- Build succeeds: `npm run build`
- The existing line-chart E2E spec passes unchanged: `npx playwright test tests/e2e/measurement-charts.spec.ts`

#### Manual Verification:

- `/kitchen-sink/journal` and `/kitchen-sink/trainer` chart states look and behave exactly as before: period buttons, picker, previous/next arrows, Years disabled, collapse
- On `/measurements` the line tile restores the remembered period and open state after a reload, and Visualize/Clear still work

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Top changes island and tile

### Overview

Build the new island and tile with the four radar charts, legends, filter and states, and show them in the kitchen sinks.

### Changes Required:

#### 0. Sum-based top changes logic (re-plan)

**File**: `src/lib/measurement-top-changes.ts`, `src/lib/measurement-top-changes.test.ts`, `src/lib/measurement-chart.ts`

**Intent**: Replace Phase 1's single-largest-delta rule with sums: per circumference, the sum of its gains (or drops) in the window; for weight, the sub-period (line-chart bucket) whose weight gains (or drops) add up to the most.

**Contract**:
- `fieldTotals(entries, fields, direction): FieldTotal[]`, `FieldTotal = { field, difference, count }`: `difference` is the sum of `deltas[field].difference` over entries whose `direction` matches, `count` the number of such entries. Fields with no match are omitted. Sorted by `difference` descending, then `measurementFields` order. Sums are rounded to 2 decimals to drop float drift.
- `topWeightBucket(entries, period, direction): WeightBucketTotal | null`, `WeightBucketTotal = { bucket, label, difference, count }`: group matching weight deltas by the line chart's bucket of `measured_on` (day for week/month, month for year, year for years — export and reuse `bucketKey` from `measurement-chart.ts`), sum each, return the largest; a tie goes to the later bucket; `null` when nothing matches. `label` is a readable bucket name (e.g. `Tue 3 Nov`, `March 2026`, `2026`).
- `topChangeScale` takes any lists of `{ difference }` and keeps its behaviour.
- `topChanges`/`TopChange` are removed (no other consumers).
- Tests: thigh +1 (Jan) +1 (Feb), chest 0 + 1 → thigh 2, chest 1, longest first; +1 then −1 counts 1 on both directions; `deltas: null` and `none` skipped; float sum rounding; weight bucket per period (week/month day, year month, years year), the worked example (Nov 3 +1.5 vs Nov 20 −0.5), a latest-bucket tie, `null` when no gains; `topChangeScale` across a pair.

#### 0b. Radar data (re-plan 2)

**File**: `src/lib/measurement-top-changes.ts`, `src/lib/measurement-top-changes.test.ts`

**Intent**: Give the weight radar every sub-period of the window as an axis, not only the top one.

**Contract**:
- `weightBucketTotals(entries, period, window, direction): WeightBucketTotal[]`: one item per bucket in the window, in time order: a week has 7 days, a month every day of the month, a year 12 months and years every year of the span. `difference` is the summed weight `direction` deltas in that bucket (0 and `count` 0 when none). The window comes from the island's period and anchor (`chartWindow`/the years range the hook already uses).
- `topWeightBucket` stays and picks the top of that list (largest, later bucket on a tie, `null` when all are 0).
- Circumference radar data: every selected field in field order, with `fieldTotals`' sum or 0.
- Tests: bucket counts for each period (7 / days in month / 12 / span), zeros filled, order, and that `topWeightBucket` agrees with the list.

#### 0c. Sub-period radar data (re-plan 3)

**File**: `src/lib/measurement-top-changes.ts`, `src/lib/measurement-top-changes.test.ts`, `src/lib/measurement-page.ts`, `src/lib/measurement-page.test.ts`

**Intent**: One set of sub-period axes per period, shared by the weight and circumference radars, with summed gains or drops per field per axis.

**Contract**:
- Sub-period of an entry: week → its date; month → its calendar week (Mon–Sun, `calendarWeek`), clipped to the month; year → its month; years → its year. Axes cover every sub-period of the window in time order (7 / 4–6 / 12 / span), labelled for the axis (`Mon 3`, `3–9 Nov`, `Mar`, `2026`) and in full for tooltip and legend.
- `subPeriodTotals(entries, fields, period, window, direction)`: one row per axis, `{ key, axisLabel, label, values: Record<field, { difference, count }> }`, sums rounded to 2 decimals, 0 where nothing matched. Used for weight (`["weight_kg"]`) and for the selected circumferences.
- `topSubPeriod(rows, field)`: the axis with the largest sum for that field (later axis on a tie, `null` when all 0).
- `parseTopChartsFields` falls back to all 7 only when empty/invalid again (minimum 1); `TOP_CHARTS_MIN_FIELDS` goes away or becomes 1.
- Superseded helpers (`weightBucketTotals`, `topWeightBucket`, `fieldRadarTotals`, `fieldTotals` if unused) are removed; `topChangeScale` covers every value of every series in a pair.
- Tests: the axes per period (week dates, month weeks incl. a month starting mid-week, 12 months, 5 years), summing per field per axis (thigh +1 +1 in one month = 2), gains/drops separate, `deltas: null`/`none` skipped, rounding, `topSubPeriod` tie and null, filter fallback to 1.

#### 1. Radar chart

**File**: `src/components/measurements/TopChangeChart.tsx` (new)

**Intent**: Render one radar chart card: title, radar, legend. The colours come from field tokens.

**Contract**:
- Props: `title`, the radar points (circumference per-field totals, or weight per-bucket totals plus the top bucket), `scale: number`, `direction`, `emptyText`.
- Uses `ChartContainer` and the shadcn radar pattern: `RadarChart`, `PolarGrid`, `PolarAngleAxis` (axis labels: field labels, or bucket labels thinned when there are many, e.g. a month's days), a hidden `PolarRadiusAxis` with `domain=[0, scale]`, and one `Radar` with `fillOpacity` and a dot per point. `ChartTooltip` and `ChartLegend` with `ChartLegendContent`.
- Colour: the weight radar uses `chartFieldColor("weight_kg")`; the circumference radar uses one existing chart token for its area, and each axis point's dot uses that field's `chartFieldColor`, so fields still match the line charts. The same colours apply to gains and losses (no good/bad colouring).
- The legend gives the signed value with unit: weight names the top sub-period (e.g. `March 2026 +1.5 kg`, also emphasised on its axis); circumferences list every non-zero field, largest first (e.g. `Waist +2.0 cm`).
- The tooltip shows the value and how many changes it sums (e.g. `2 changes`); the weight tooltip also names the sub-period.
- With no changes (every point 0), it renders the title and `emptyText` ("No gains in this period" or "No losses in this period") in place of the chart.
- Values are signed with `+` for a gain and `−` for a loss. There is no good/bad colouring.

#### 2. Top changes island

**File**: `src/components/measurements/TopChangesCharts.tsx` (new)

**Intent**: Wire `useChartPeriodRead` (with `topChartsPeriodStorageKey`), `ChartPeriodControls`, the circumference filter and the 2×2 grid of `TopChangeChart`s, and keep the summary heading in step with the period.

**Contract**:
- Props mirror `MeasurementCharts`, plus `initialFields`.
- No Visualize/selection handling.
- The grid uses `measurement-row:grid-cols-2 grid grid-cols-1 gap-4`, in the order weight gain, circumference gain, weight loss, circumference loss.
- Data: `weightBucketTotals`/`topWeightBucket(body.entries, period, …)` and `fieldTotals(body.entries, selectedFields, …)` on the unbucketed entries.
- Scales: `topChangeScale(weightGain, weightLoss)` and `topChangeScale(circGain, circLoss)`, computed after filtering.
- Tile states:
  - loading: "Loading charts…"
  - error: "Could not load charts"
  - no entries in the window: "No measurements in this period" (shown once, in place of the grid)
- Filter: a "Circumferences" `Button` (outline) opening a `DropdownMenu` of `DropdownMenuCheckboxItem`s for the 7 fields, placed in the controls' `extra` slot.
  - The last checked item is disabled, so the selection is never empty (re-plan 3).
  - The selection is restored from storage after hydration and persisted with `writePreference(topChartsFieldsStorageKey(...))`, like the period.

#### 3. Tile wrapper

**File**: `src/components/measurements/TopChangesTile.astro` (new)

**Intent**: The Top changes card: `CollapsibleChartTile` with `topChartsOpenStorageKey` and title "Top changes". The muted note names the change measure, e.g. "Summed changes versus the previous entry". It wraps `TopChangesCharts` with `client:load`.

**Contract**: props match `ChartsTile`, plus `initialFields`, and include the kitchen-sink `entries`/`forceLoading` local mode.

#### 4. Kitchen sinks and token check

**File**: `src/pages/kitchen-sink/journal.astro`, `src/pages/kitchen-sink/trainer.astro`, `scripts/check-home-tokens.mjs`

**Intent**: Show the new tile's states next to the line tile's, and keep the new files under the token check.

**Contract**:
- Sink states:
  - open with data
  - closed
  - an empty window
  - a period with losses only, so both gain cards say "No gains in this period"
  - a filtered circumference selection
  - `forceLoading`
- The trainer sink shows the read-only variant.
- Add `TopChangeChart.tsx`, `TopChangesCharts.tsx` and `TopChangesTile.astro` to `FILES`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Types check: `npx astro check`
- Build succeeds: `npm run build`

#### Manual Verification:

- `/kitchen-sink/journal` shows four radar charts in a 2×2 grid on wide screens and one column on narrow screens, with colours matching the line charts for the same fields, in light and dark themes
- Circumference radars draw one coloured series per field on sub-period axes (week dates, month weeks, year months, 5 years); legends name each series with its top sub-period and signed value; tooltips show the value and the number of summed changes
- The circumference filter changes both circumference charts together, cannot uncheck the last field, and its radars rescale
- Empty-gain/empty-loss cards keep their title and show the sentence; an empty window shows "No measurements in this period"
- The controls row, buttons and dropdown match the line tile's look on mobile and desktop

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Wire into /measurements

### Overview

Seed and mount the tile for the trainee and the linked trainer, cover it with E2E, and check hydration on the production preview.

### Changes Required:

#### 1. Server seed

**File**: `src/pages/measurements.astro`

**Intent**: Render the tile's first state from its cookies with no extra step in the read chain.

**Contract**:
- Read three cookies: `topChartsOpenStorageKey`, `topChartsPeriodStorageKey` and `topChartsFieldsStorageKey`.
- Add a `readInitialTopChart` that runs alongside `readInitialChart` (same `Promise.all` stage).
- It reuses the line tile's range result when both preferences name the same period and anchor, and shares `daysRead`.
- A failed read leaves the fetch to the island (`initialChart = null`).

#### 2. Mounts

**File**: `src/components/journal/TraineeJournal.astro`, `src/components/trainer/TrainerPanel.astro`

**Intent**: Mount `TopChangesTile` directly below `ChartsTile`, under the same conditions: `readOnly={false}` for the trainee and `readOnly={true}` with `subjectTraineeId` for the trainer.

**Contract**:
- New props: `topChartsOpen`, `topChartsPeriod`, `topChartsAnchor`, `topChartInitial` and `topChartsFields`, passed from `measurements.astro`.
- The start-open rule is `addFormStartsOpen(false, topChartsOpen)`, the same as the line tile.

#### 3. E2E

**File**: `tests/e2e/top-changes-charts.spec.ts` (new)

**Intent**: Cover the browser-level risks: the tile renders the seeded charts, the period controls change the window, the filter is remembered across a reload, and the closed state survives a reload.

**Contract**: follow the setup and fixtures of `tests/e2e/measurement-charts.spec.ts` (throwaway trainee) and select through accessible roles and labels.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Types check: `npx astro check`
- Build succeeds: `npm run build`
- E2E passes: `npx playwright test`
- Smoke passes against the preview: `npm run smoke`

#### Manual Verification:

- On the production preview (`npm run build && npm run preview`), the Top changes tile hydrates and is interactive, with no console errors
- As a trainee on `/measurements`, the top weight gain equals the summed "up" weight delta badges in the list for its sub-period, and each circumference axis equals that field's summed badges for the period, including the window's first entry versus an earlier entry
- As a linked trainer, the selected trainee's tile shows read-only, with its own remembered period and filter
- A closed tile stays closed after a reload with no flash open; Years shows the last 5 years
- Dark theme: radar areas, grid and legend stay readable

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `fieldTotals` / `topWeightBucket` (replacing `topChanges`, see Phase 3 change 0):
  - the worked example: Nov window; Oct 28 = 80.0, Nov 3 = 81.5, Nov 20 = 81.0 → gain 1.5 on Nov 3, loss 0.5 on Nov 20
  - thigh +1 +1 = 2, chest 0 + 1 = 1; +1 then −1 counts on both sides
  - latest bucket wins a tie
  - no gains → `[]`
  - `deltas: null` is skipped
  - `none` direction is ignored
  - longest first, with equal differences in field order
  - only the requested fields are returned
- `topChangeScale`: maximum across lists, 0 when empty.
- Preferences: key strings, `parseTopChartsFields` (unknown, empty, duplicate and reordered input), `topChartsFieldsValue` round trip.

### Integration Tests:

- E2E `top-changes-charts.spec.ts`:
  - seeded render
  - period switch
  - filter persisted across a reload
  - closed state persisted across a reload
- The existing `measurement-charts.spec.ts` stays green after the Phase 2 extraction.

### Manual Testing Steps:

1. Open `/kitchen-sink/journal` and check every Top changes state in light and dark themes.
2. On `/measurements` as a trainee, pick a month whose first entry follows an entry from the previous month. Confirm that change counts toward the month's top gain or loss.
3. Uncheck circumferences down to one, reload, and confirm the selection is kept and the last checkbox cannot be unchecked.
4. Sign in as a linked trainer, select the trainee and confirm the read-only tile.
5. Run the production preview and check that hydration works and the console is clean.

## Performance Considerations

There is no new database query shape. The tile reuses `GET /api/measurements/chart`, so a 5-year window costs the same read the line tile already makes, and the page seed runs in parallel (S-43). `fieldTotals` and `topWeightBucket` are one O(entries × fields) pass each, run when the body or filter changes.

## Migration Notes

None. There are no schema or data changes, and the new preference keys fall back to defaults when absent.

## References

- Research: `context/changes/top-progress-charts/research.md`
- Roadmap: `context/foundation/roadmap.md` S-46
- Line tile precedent: `context/archive/2026-10-28-visualization-of-measurements/plan.md`, `plan-brief.md`
- Dark tokens: `context/archive/2026-10-30-app-small-redesign/plan.md:39`
- Similar implementation: [MeasurementCharts.tsx:417-688](src/components/measurements/MeasurementCharts.tsx#L417-L688), [ChartsTile.astro:47-133](src/components/measurements/ChartsTile.astro#L47-L133)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Top changes logic

#### Automated

- [x] 1.1 Unit tests pass, covering the worked example, the latest-wins tie, no gains, null deltas, sorting, filtering, the pair scale, keys and field parsing — 9b47363
- [x] 1.2 Lint passes — 9b47363
- [x] 1.3 Types check — 9b47363

### Phase 2: Extract shared chart plumbing

#### Automated

- [x] 2.1 Unit tests pass — 783a931
- [x] 2.2 Lint passes — 783a931
- [x] 2.3 Token check passes — 783a931
- [x] 2.4 Types check — 783a931
- [x] 2.5 Build succeeds — 783a931
- [x] 2.6 Existing line-chart E2E spec passes unchanged — 783a931

#### Manual

- [x] 2.7 Kitchen-sink line chart states look and behave exactly as before — 783a931
- [x] 2.8 Line tile restores period and open state after reload; Visualize/Clear still work — 783a931

### Phase 3: Top changes island and tile

#### Automated

- [x] 3.1 Unit tests pass — 76ef581
- [x] 3.2 Lint passes — 76ef581
- [x] 3.3 Token check passes — 76ef581
- [x] 3.4 Types check — 76ef581
- [x] 3.5 Build succeeds — 76ef581

#### Manual

- [x] 3.6 Kitchen sink shows four radial charts in a responsive 2×2 grid with field colours in light and dark — 76ef581
- [x] 3.7 Legends name field and signed value; tooltips show entry and previous dates — 76ef581
- [x] 3.8 Circumference filter drives both charts, keeps one field, rings rescale — 76ef581
- [x] 3.9 Empty-gain/loss cards and empty-window message render as specified — 76ef581
- [x] 3.10 Controls row, buttons and dropdown match the line tile on mobile and desktop — 76ef581

### Phase 4: Wire into /measurements

#### Automated

- [x] 4.1 Unit tests pass — cca1bb4
- [x] 4.2 Lint passes — cca1bb4
- [x] 4.3 Token check passes — cca1bb4
- [x] 4.4 Types check — cca1bb4
- [x] 4.5 Build succeeds — cca1bb4
- [x] 4.6 E2E passes — cca1bb4
- [x] 4.7 Smoke passes against the preview — cca1bb4

#### Manual

- [x] 4.8 Tile hydrates on the production preview with no console errors — cca1bb4
- [x] 4.9 Trainee top weight gain matches the list's largest up delta for the period, including the window's first entry — cca1bb4
- [x] 4.10 Linked trainer sees the read-only tile with its own remembered period and filter — cca1bb4
- [x] 4.11 Closed tile stays closed after reload with no flash; Years shows last 5 years — cca1bb4
- [x] 4.12 Dark theme rings, track and legend stay readable — cca1bb4
