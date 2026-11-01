<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Top Changes Radar Charts

- **Plan**: context/changes/top-progress-charts/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 7 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated checks were run on 2026-11-01:
- `npm test`: 334/334 passed
- `npm run lint`: passed
- `npm run check:home-tokens`: passed
- `npx astro check`: 0 errors
- `npm run build`: passed
- `npx playwright test`: 25/25 passed
- `npm run smoke` against the preview: passed

## Findings

### F1 — Light --chart-8 (navel) changed to dark red, outside the plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/styles/global.css:38
- **Detail**: The light `--chart-8` changed from `oklch(0.527 0.154 150.069)` (green) to `oklch(0.4 0.15 25)` (dark red). This change is not in the plan.
  - **Line charts too:** it also recolours Navel in the existing line charts.
  - **Themes differ:** dark `--chart-8` (:79) is still lime (hue 129), so Navel is red in light mode and green in dark mode.
  - **Near other colours:** hue 25 sits next to `--destructive` (≈27) and close to `--chart-1` weight (41) and `--chart-7` hips (≈1).
  - **Against the plan:** it brings a red into the field palette, against the plan's "no green/red colouring" rule.
  - **Commit note:** commit 76ef581 says only "distinct from chest".
- **Fix A ⭐ Recommended**: Choose a hue that is neither red nor green and clearly different from chart-1, chart-2 and chart-7, apply it in both themes, and add a plan addendum explaining why.
  - Strength: Keeps the reason for the change (navel was too close to chest) and makes Navel the same hue in both themes.
  - Tradeoff: Needs a visual check in both themes, on the line and radar charts.
  - Confidence: MED — the chest/navel clash was real enough to prompt the change.
  - Blind spot: The chest/navel contrast in light mode has not been measured.
- **Fix B**: Revert to the original green.
  - Strength: A one-line change; the palette is back to what S-41 shipped.
  - Tradeoff: The chest/navel similarity that prompted the change comes back.
  - Confidence: HIGH — this restores the palette as it was before this branch.
  - Blind spot: It is not known how close chest and navel look on the radars.
- **Decision**: FIXED via Fix A. Light `--chart-8` is now `oklch(0.55 0.2 255)` (blue). The dark palette is kept, because each theme has its own palette. A plan addendum was added.

### F2 — New import cycle: measurement-page → measurement-top-changes → measurement-chart → measurement-page

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/lib/measurement-page.ts:2
- **Detail**: `measurement-page` imports `circumferenceFields` from `measurement-top-changes`, which imports `measurement-chart`, which imports `measurement-page`. It works today only because `circumferenceFields` is read at call time, not while the module loads. A future top-level use would read it before it is defined.
- **Fix**: Move `circumferenceFields` to `src/lib/measurement-input.ts`, next to `measurementFields`, and import it from there.
- **Decision**: FIXED. `circumferenceFields` now lives in `measurement-input.ts`. `measurement-page` imports it from there, and `measurement-top-changes` re-exports it.

### F3 — Line-chart E2E spec edited although the plan said "passes unchanged"

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: tests/e2e/measurement-charts.spec.ts:12-15, 113, 147
- **Detail**: A new `chartsTile()` helper scopes the "Chart period" lookups to the line tile. Without it, the second tile breaks Playwright's strict mode, and `toBeHidden` would check the wrong row. This is justified, and the assertions are no weaker. The plan does not mention it.
- **Fix**: Add a one-line plan addendum under Phase 2/4 recording the scoping edit.
- **Decision**: FIXED. A plan addendum records the spec scoping.

### F4 — TopChangeChart legend and scale differ from change 1

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/TopChangeChart.tsx:77-80, 137, 203-211
- **Detail**: Three details differ from the plan:
  - **Legend:** the plan names `ChartLegend`/`ChartLegendContent`; the code uses a custom `<ul>` legend, because the in-SVG one overlapped the radar.
  - **Legend order:** circumferences are listed in field order, not largest first as change 1 asks.
  - **Scale:** the radius domain is `[0, scale * 1.15]`, not `[0, scale]`.
- **Fix**: Sort the legend entries largest first, and note the custom legend and the headroom in a plan addendum.
- **Decision**: FIXED. The legend is sorted largest first (stable, so field order breaks ties). A plan addendum records the custom legend and the 1.15 headroom.

### F5 — Trainer kitchen sink renders the Top changes tile twice

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/pages/kitchen-sink/trainer.astro:93, 106
- **Detail**: `TrainerPanel` with `chartEntries` now mounts its own `TopChangesTile` (TrainerPanel.astro:171), and the sink adds a second standalone read-only one at :106.
- **Fix**: Remove the standalone section at :100-106 (the panel already shows the read-only tile), or keep it and say so in its caption.
- **Decision**: FIXED. The standalone section and its import were removed, and the Default caption now names the read-only Top changes tile.

### F6 — subPeriodTotals runs four times on every render, unmemoised

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/TopChangesCharts.tsx:138-141
- **Detail**: Each call walks every day of the window and formats dates, so Years costs about 4 × 1,827 iterations. The work repeats on unrelated re-renders, such as opening the picker or the filter menu.
- **Fix**: Wrap the four calls and the two scales in `useMemo` keyed on `body`, `period`, `window` and `fields`.
- **Decision**: FIXED. Both pairs are memoised with useMemo, keyed on body, fields, period and the window's start and end, because the window object is rebuilt on every render.

### F7 — Duplicated helper and a shared DTO outside src/types.ts

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/measurements/TopChangesCharts.tsx:70; src/components/measurements/TopChangesTile.astro:4
- **Detail**: Two pattern issues:
  - **`namedId`:** this is a third copy; the others are in `useChartPeriodRead.ts:114` and `useMeasurementChartSelection.ts`.
  - **`ChartBody`:** it is now a shared DTO used by pages and two islands, but it lives in the hook, and it is imported from different places (the hook vs the `MeasurementCharts` re-export). CLAUDE.md puts shared DTOs in `src/types.ts`.
- **Fix**: Export one `namedId` from `src/lib/`, and move `ChartBody` to `src/types.ts`.
- **Decision**: FIXED. One `namedId` is exported from `src/lib/utils.ts` and replaces all 4 copies, including a pre-existing one in `MeasurementBrowser.tsx`. `ChartBody` moved to `src/types.ts`, and every importer now uses `@/types`.

### F8 — Hard-coded window cap and month name taken from a display string

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/measurement-top-changes.ts:44, 88
- **Detail**: Two fragile spots:
  - **Window cap:** `MAX_WINDOW_DAYS = 2000` silently cuts the axes if `YEARS_SPAN_LIMIT` ever grows past 5.
  - **Month name:** `monthLabel(key).split(" ")[0]` takes the month name from a display string.
- **Fix**: Derive the cap from `YEARS_SPAN_LIMIT`, and use a month-name table, as `SHORT_MONTHS` already does.
- **Decision**: FIXED. `MAX_WINDOW_DAYS` is now `(YEARS_SPAN_LIMIT + 1) * 366`. A new `monthName()` in `journal-calendar.ts` replaces the `split(" ")`, and `monthLabel` uses it too.

### F9 — E2E period switch checks the controls, not the chart content

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/top-changes-charts.spec.ts:144
- **Detail**: The test confirms Years is pressed and is kept after a reload. It never checks that the radars show different data, such as year axes or a different legend value.
- **Fix**: After switching to Years, assert that an axis label or legend entry belongs to the year view, e.g. a year number.
- **Decision**: FIXED. The period test seeds 2 entries and asserts that the weight-loss legend names no year in Month mode and a year in Years mode, before and after the reload.

## Triage summary

All 9 findings were FIXED (F1 via Fix A). Re-verified on 2026-11-01:

- `npm run lint`: passed
- `npm test`: 334/334 passed
- `npm run check:home-tokens`: passed
- `npx astro check`: 0 errors
- `npm run build`: passed
- `npx playwright test`: 25/25 passed
