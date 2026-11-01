---
date: 2026-11-01T05:11:28+01:00
researcher: Claude (Opus 5.5) for gmaszkiewicz
git_commit: 6492818b998b41ae22947b9b1c344b804742e092
branch: claude/top-progress-charts
repository: tm-project (gmaszkiewicz/training-manager)
topic: "S-46 top-progress-charts — what a Top changes tile with four radial charts can reuse, and what it must decide"
tags: [research, charts, recharts, measurements, deltas, chart-tokens, S-46, S-41, S-45]
status: complete
last_updated: 2026-11-01
last_updated_by: Claude (Opus 5.5)
---

# Research: Top changes radial charts (S-46)

**Date**: 2026-11-01T05:11:28+01:00
**Researcher**: Claude (Opus 5.5) for gmaszkiewicz
**Git Commit**: 6492818b998b41ae22947b9b1c344b804742e092
**Branch**: claude/top-progress-charts
**Repository**: tm-project (gmaszkiewicz/training-manager)

## Research Question

From `change.md` and roadmap S-46 (`context/foundation/roadmap.md:703-713`): the app needs a separate tile with four shadcn radial charts. They show top weight gain, top circumference gain (all circumferences on one chart), top weight loss and top circumference loss, for a week, month, year or the last 5 years. The circumference charts get a filter, every chart gets a legend, and the styling matches the line charts tile. The questions:

1. How does the S-41 line charts tile work, and what can be reused?
2. Which data path and delta definition must the top changes use?
3. Which rules apply to tokens, dark theme and literal colours?
4. Which roadmap unknowns can the code answer, and which are product choices?

## Summary

- **Reusable shell and controls:** the line charts tile is `ChartsTile.astro`, a server-rendered `<details>` card holding a `MeasurementCharts` React island. A linked trainer gets the same tile, read-only, on `/measurements`. The period controls, the picker, the remembered-state cookies and the API all exist and can be reused.
- **No extra query is needed.** For a week, month, year or 5-year window, `GET /api/measurements/chart` already returns every entry in that window. Each entry carries the list's per-field `deltas` versus its previous journal entry. For the first entry in the window, that previous entry sits before the window. So a top gain or loss can be picked from data that read already returns.
- **Which entries the top changes must use:** the raw entries, not the bucketed ones. The line charts drop entries with `latestPerBucket`, which only affects how they are drawn.
- **Radial charts are new to the codebase.** Recharts 3.8.0 is installed but `RadialBarChart` is not used anywhere. `ChartLegend`/`ChartLegendContent` are exported from `ui/chart.tsx` but nothing uses them yet. There are 8 chart tokens (`--chart-1..8`, light and dark), one per measurement field. `chartFieldColor` maps a field to its token.
- **A circumference filter is new UI.** The line tile always draws all 8 fields and has no field filter.
- **What the code cannot settle:** five of the six roadmap unknowns are product choices. The sixth, whether a linked trainer sees the tile, has a strong precedent: S-41 shares one component across both roles.

## Detailed Findings

### 1. The existing Charts tile (S-41)

**Shell**

- [ChartsTile.astro:47-96](src/components/measurements/ChartsTile.astro#L47-L96) is a card with `<details data-charts-tile>`. The summary has a title and a muted note, and a chevron that turns via `group-open:rotate-180`. Inside is `<MeasurementCharts client:load>`.
- An inline script ([ChartsTile.astro:99-133](src/components/measurements/ChartsTile.astro#L99-L133)) stores the open/closed state in localStorage and a mirrored cookie.
  - The key is `chartsOpenStorageKey(account)` = `tm.measurements.charts.<account>` ([measurement-page.ts:80-86](src/lib/measurement-page.ts#L80-L86)).
  - The server reads that cookie, and the tile starts open unless the user closed it ([measurements.astro:120-122](src/pages/measurements.astro#L120-L122)).
  - S-41's rule: "Collapsible tiles are server-rendered `<details>` with an inline script, not React" (`context/archive/2026-10-28-visualization-of-measurements/research.md:186`).

**Where it is mounted**

- Trainee: [TraineeJournal.astro:186-199](src/components/journal/TraineeJournal.astro#L186-L199), `readOnly={false}`.
- Linked trainer: [TrainerPanel.astro:141-155](src/components/trainer/TrainerPanel.astro#L141-L155), `readOnly={true}`, `subjectTraineeId`.
- The server seeds the first render through `readInitialChart` ([measurements.astro:133-153](src/pages/measurements.astro#L133-L153)).
- What shipped: the tile is a separate card below the list (archive `plan.md:407`). This replaced the original "above the add form".

**Period controls** (in `MeasurementCharts.tsx`)

- `chartPeriods = ["week","month","year","years"]` with the default `month` ([measurement-chart.ts:6-10](src/lib/measurement-chart.ts#L6-L10)). The labels are Week/Month/Year/Years ([MeasurementCharts.tsx:87-92](src/components/measurements/MeasurementCharts.tsx#L87-L92)).
- "Years" is always the last 5 calendar years, this year included: `lastYearsRange`, `YEARS_SPAN_LIMIT = 5` ([measurement-chart.ts:27](src/lib/measurement-chart.ts#L27), [:124-128](src/lib/measurement-chart.ts#L124-L128)). The label is "Last 5 years" (:322).
- The period selector is a `role="group"` row of shadcn `Button`s. The active one is `variant="default"` and the others `"outline"`, each with `aria-pressed` ([MeasurementCharts.tsx:666-680](src/components/measurements/MeasurementCharts.tsx#L666-L680)).
- The local `PickerField` ([MeasurementCharts.tsx:226-371](src/components/measurements/MeasurementCharts.tsx#L226-L371)) handles moving through periods:
  - prev/next icon buttons
  - a popover list of only the periods that have entries, fed by the `days=1` mode and `periodsWithEntries`
  - in Years mode it is disabled, not hidden
  - Changing period goes through `anchorWithEntries` ([measurement-chart.ts:242-259](src/lib/measurement-chart.ts#L242-L259)).
- `PickerField` is local to `MeasurementCharts.tsx`, not a shared component. A second tile that reuses it means extracting it first.
- The period and anchor are stored as `period|YYYY-MM-DD` under `tm.measurements.chartsPeriod.<account>.<trainee>`, through `writePreference` (localStorage plus cookie) ([MeasurementCharts.tsx:482-505](src/components/measurements/MeasurementCharts.tsx#L482-L505); [browser-storage.ts:3-31](src/lib/browser-storage.ts#L3-L31)).
- States and their copy (archive `plan.md:197-201`):
  - loading: "Loading charts…"
  - error: "Could not load charts"
  - empty: "No measurements in this period"

**Visualize/Clear**

- These are in the list ([MeasurementBrowser.tsx:1259-1287](src/components/measurements/MeasurementBrowser.tsx#L1259-L1287)), not in the tile. They are shared through `useMeasurementChartSelection`.
- In Visualize mode the line tile hides the period row and shows "Selected entries (n)" ([MeasurementCharts.tsx:450](src/components/measurements/MeasurementCharts.tsx#L450), [:662](src/components/measurements/MeasurementCharts.tsx#L662)). How the Top changes tile should behave in that mode is undecided (see Open Questions).

**Colours**

- `chartFieldColor(field)` returns `var(--chart-N)`, where N is the field's position in `measurementFields` ([measurement-chart.ts:384-387](src/lib/measurement-chart.ts#L384-L387)). The order is weight, chest, waist, arms, thigh, calf, hips, navel ([measurement-input.ts:28-37](src/lib/measurement-input.ts#L28-L37)).
- The tokens are `--chart-1..8` for light ([global.css:30-38](src/styles/global.css#L30-L38)) and dark ([global.css:72-79](src/styles/global.css#L72-L79)), mapped to `--color-chart-*` ([global.css:127-134](src/styles/global.css#L127-L134)).
- The line chart uses `ChartConfig` with `color` and `var(--color-value)` ([MeasurementChart.tsx:100](src/components/measurements/MeasurementChart.tsx#L100), [:164-167](src/components/measurements/MeasurementChart.tsx#L164-L167)).
- Because each field already has its own token, the 7 circumferences on one radial chart can keep the same colour they have in the line charts.

**Recharts**

- `package.json:40` has `"recharts": "^3.8.0"`.
- `RadialBarChart`, `RadialBar` and `PolarAngleAxis` are not used in `src/` or `tests/` (inspected by search).
- `ChartLegend` and `ChartLegendContent` are exported ([chart.tsx:234-326](src/components/ui/chart.tsx#L234-L326)) and unused.
- The shadcn "radial chart" examples are compositions of `ChartContainer` and recharts primitives, not a separate registry component. Inference: `src/components/ui/` needs no new install.

### 2. Data path and delta definition

**Data model**

- There is one table, `public.measurements`, with `weight_kg` plus 7 circumferences: `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, `navel_cm` (`supabase/migrations/20260928043200_trainee_measurements.sql:1-24`).
- All 8 value fields are `numeric(5,1) NOT NULL`. A field value is never null. The only "no delta" case is the trainee's first-ever entry.
- `measured_on` is `timestamp without time zone` (`20261006220000_measured_on_timestamp.sql`).
- There is one index, the unique `(trainee_id, measured_on)` (:45-46).

**The list's delta**

- `withDeltas` sorts by `measured_on`, then `id`, and compares each entry with the one before it ([measurement-deltas.ts:3-17](src/lib/measurement-deltas.ts#L3-L17), :66-75).
- `deltaBetween` computes `round(cur·10) − round(prev·10)` and returns `{direction: up|down|none, difference: |tenths|/10}` ([measurement-deltas.ts:19-28](src/lib/measurement-deltas.ts#L19-L28)).
- `difference` is never negative; the sign lives in `direction`.

**The chart read**

- `readMeasurementRange` ([services/measurements.ts:364-391](src/lib/services/measurements.ts#L364-L391)) does the following:
  - computes `chartWindow` as a half-open `[start, end)`
  - reads every row in that window in 1000-row pages ([:324-349](src/lib/services/measurements.ts#L324-L349))
  - runs one `selectOlderRow` for the entry before the window
  - calls `deltasForVisiblePage` ([measurement-page.ts:244-251](src/lib/measurement-page.ts#L244-L251)) and `linkPrevious`
- Each returned entry is a `ChartMeasurement` = entry + `deltas` + `previous_measured_on` ([types.ts:19-26](src/types.ts#L19-L26)). The archive plan says these deltas match the list "by construction" (archive `plan.md:35`, :116-119).
- The read is served by `GET /api/measurements/chart` ([chart.ts:132-170](src/pages/api/measurements/chart.ts#L132-L170)), with modes `period+anchor`, `years&from&to`, `ids` and `days=1`. It sends `no-store`. A trainer passes `trainee=<uuid>`, and RLS gates the rows.

**What this means for the roadmap risk ("must not walk the whole journal")**

- The S-41 read already reads every row in the selected window, including a 5-year window. It does not read the whole journal: it reads the window plus one older row, plus the `measurement_days` array ([services/measurements.ts:394-407](src/lib/services/measurements.ts#L394-L407)).
- The top changes for the same window can be computed from that response:
  - for each entry and field, take `deltas[field]`
  - `direction === "up"` → candidate gain, `"down"` → candidate loss
  - take the maximum `difference`
- That costs no second database read. If the tile fetches on its own, with a separate period, it costs one more call of about 300 ms (S-43, `context/archive/2026-10-29-reduce-supabase-round-trips/plan-brief.md`).
- Entries must be used **before** `latestPerBucket`. That function keeps only the last entry per day, month or year ([measurement-chart.ts:350-365](src/lib/measurement-chart.ts#L350-L365); used at [MeasurementCharts.tsx:375](src/components/measurements/MeasurementCharts.tsx#L375)) and would drop deltas.

**SQL aggregation**

- An option, not needed. If the plan wants it, any RPC must:
  - be `security invoker` with `search_path = ''`
  - return one aggregate or array, not a set of rows, so the PostgREST `max_rows = 1000` limit does not cut it (`supabase/config.toml:18`; `20261028200000_measurement_days.sql:1-20`)
  - be additive and backward compatible (CLAUDE.md, Environment)
- Hosted `max_rows` was not checked.

**Trainer access**

- Reads go through RLS `measurements_select_linked_trainer`, which requires an accepted link (`supabase/migrations/20261027120000_trainer_link_requests.sql:68-82`).
- No per-dashboard access is stored. Collaborations derive `measurements: [{type:"read"}]` from link status ([collaborations.ts:35-48](src/lib/collaborations.ts#L35-L48); [dashboards.ts:10-15](src/lib/dashboards.ts#L10-L15)).

### 3. Tokens, dark theme and literal colours

- **CLAUDE.md (UI):**
  - Design tokens live in `src/styles/global.css`.
  - Check `src/components/ui` before adding a component.
  - Do not use literal colours or arbitrary values in views.
- **Token check script:**
  - [check-home-tokens.mjs:7-58](scripts/check-home-tokens.mjs#L7-L58) checks only the files listed in `FILES`. That list already has `ChartsTile.astro`, `MeasurementCharts.tsx`, `MeasurementChart.tsx` and `ui/chart.tsx`.
  - It bans hex, `rgb/hsl/oklch(`, arbitrary `-[Npx|rem]` values, and palette utilities such as `fill-…`/`stroke-…` ([:61-62](scripts/check-home-tokens.mjs#L61-L62)).
  - New tile and chart files must be added to `FILES`. This repeats the S-41 and S-45 practice (archive S-41 `plan.md:241`; S-45 `plan.md:187`). CI runs it.
- **Dark theme (S-45):**
  - `.dark` goes on `<html>`, applied by a pre-paint script.
  - The chart token values were kept as the shadcn baseline, and the dark-mode chart colours passed manual check 3.9 (`context/archive/2026-10-30-app-small-redesign/plan.md:39`, :205, :333).
  - Radial bar `fill="var(--color-…)"` from `ChartConfig` follows that theme with no new tokens.
  - Inference: the radial track background, if shown, should use an existing role token such as `muted` rather than a literal colour.
- **PRD non-goal:** "No good/bad coloring of deltas" (`context/foundation/prd.md:82`, :123). So gains and losses should not be coloured green and red; field colours stay as they are.

### 4. The roadmap's unknowns (`roadmap.md:711`)

| Unknown                                                              | Code evidence                                                                                                                                                                                                                                 | Verdict                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Change" between consecutive entries, or first-to-last in the period | The list delta and the chart read are consecutive-entry ([measurement-deltas.ts:66-75](src/lib/measurement-deltas.ts#L66-L75)). The roadmap risk says gains and losses "must use the same difference as the list's delta" (`roadmap.md:712`). | The risk text points to consecutive-entry. The choice is still the user's. Also undecided: whether the first entry in the window, compared with an entry before the window, counts toward the period. The chart read includes it today. |
| What "largest and smallest" means for a gain chart                   | No code                                                                                                                                                                                                                                       | Product choice                                                                                                                                                                                                                          |
| How many items per chart                                             | Weight is one field, so a top weight gain is a single value. A circumference chart can show at most 7 fields, or fewer after filtering.                                                                                                       | Product choice. Likely one ring per field (the largest change per field).                                                                                                                                                               |
| Period follows the line tile, or has its own control                 | The line tile's period state is local to `MeasurementCharts` plus cookie `tm.measurements.chartsPeriod.<account>.<trainee>`. No cross-island period event exists (archive `plan.md:229`: list and tile pass no month events).                 | Product choice. Sharing means a new event or a shared hook, like `useMeasurementChartSelection`. Its own control means a new cookie key under `tm.measurements.<thing>.<account>[.<trainee>]` (archive `plan.md:13`).                   |
| Linked trainer sees the tile                                         | S-41: "both roles share one component" (archive `plan-brief.md:27`). RLS already allows the read.                                                                                                                                             | Precedent says yes. Confirm.                                                                                                                                                                                                            |
| Collapses and remembers state                                        | S-41 pattern: `<details>` + inline script + per-account cookie                                                                                                                                                                                | Precedent says yes, with its own key. Confirm.                                                                                                                                                                                          |

## Code References

- `src/components/measurements/ChartsTile.astro:47-133` — tile shell and open-state script
- `src/components/measurements/MeasurementCharts.tsx:87-92, 226-371, 482-505, 666-680` — period labels, PickerField, period preference, period buttons
- `src/components/measurements/MeasurementChart.tsx:100-171` — single line chart, ChartConfig, tooltip delta
- `src/components/ui/chart.tsx:234-326` — ChartLegend/ChartLegendContent (unused)
- `src/lib/measurement-chart.ts:6-27, 98-128, 350-365, 384-387` — periods, windows, years range, bucketing, field colour
- `src/lib/measurement-deltas.ts:19-28, 66-75` — delta arithmetic and ordering
- `src/lib/measurement-page.ts:80-108, 244-251` — storage keys, open default, deltasForVisiblePage
- `src/lib/services/measurements.ts:203-222, 324-407` — older row, range read, days RPC
- `src/pages/api/measurements/chart.ts:132-170` — chart API modes
- `src/pages/measurements.astro:120-153` — open cookie, initial chart read
- `src/styles/global.css:30-38, 72-79, 127-134` — chart tokens
- `scripts/check-home-tokens.mjs:7-62` — token check file list and pattern
- `tests/e2e/measurement-charts.spec.ts:104, 123` — tile toggle and Visualize E2E (bodies not read)
- `src/pages/kitchen-sink/journal.astro:36-160`, `src/pages/kitchen-sink/trainer.astro:77-92` — chart sink states via the `entries` local mode

## Architecture Insights

- **Two islands, one page:** the list and the line tile are separate React islands. They communicate only through `useMeasurementChartSelection`: localStorage, a page Map, and the window event `tm:measurements:chart-selection` ([useMeasurementChartSelection.ts:8](src/components/hooks/useMeasurementChartSelection.ts#L8), :91-126). A third island for Top changes would need the same mechanism if it has to react to the line tile's period.
- **Logic lives in pure helpers:** each piece has a pure, unit-tested helper in `src/lib/` (`measurement-chart.ts` has about 71 cases in `measurement-chart.test.ts`). A `topChanges(entries, fields)` helper fits that pattern.
- **Local mode for kitchen sinks:** the kitchen sinks render chart states through an `entries` prop that skips fetching. A new tile should expose the same mode for `/kitchen-sink/journal` and `/kitchen-sink/trainer`.
- **Round trips:** server-side reads on `/measurements` run in parallel. Do not add a step to the chain (S-43).

## Historical Context (from prior changes)

- `context/archive/2026-10-28-visualization-of-measurements/plan.md:402-414` — Deviations section. It describes what shipped: Years = last 5 years, button-group selector, picker of only the periods that have entries, tile below the list.
- `context/archive/2026-10-28-visualization-of-measurements/plan-brief.md:22-27` — shadcn chart (recharts) proven on the production preview, one token per field, a shared trainee/trainer component.
- `context/archive/2026-10-28-visualization-of-measurements/plan.md:40` — infrastructure pre-mortem on CommonJS and Auto Minify hydration breakage for chart libraries. It applies again if new recharts modules (polar) are imported. Inference: the radial modules come from the same package, so the risk is low but should be checked on the production preview.
- `context/archive/2026-10-10-query-optimization/plan-brief.md:22,39` — S-24 removed the full-journal `measured_on` scan behind the month list. It did not add indexes.
- `context/archive/2026-10-30-app-small-redesign/plan.md:39, 205, 333` — dark chart tokens kept as baseline; manual readability check passed.
- `context/foundation/lessons.md` — not present. No team lessons apply.
- `context/foundation/prd.md` — has no MS-37 entry. MS-37 is defined only in `roadmap.md:65`.

## Related Research

- `context/archive/2026-10-28-visualization-of-measurements/research.md`
- `context/archive/2026-10-10-query-optimization/` (plan-brief)
- `context/archive/2026-10-29-reduce-supabase-round-trips/` (plan-brief)

## Open Questions

These are product choices for `/10x-plan`:

1. **Period of the change:** consecutive-entry deltas (matches the list and the roadmap risk) or first-to-last in the period? If consecutive, does the first entry in the window, compared with an entry before the window, count?
2. **Shape of each chart:** "largest and smallest" means what? The single top value, or top N? For circumferences, one ring per field showing that field's largest gain or loss?
3. **Period control:** share the line tile's period, or give the tile its own Week/Month/Year/Years control and cookie? This also covers how the tile behaves when the line tile is in Visualize ("Selected entries") mode.
4. **Trainer and collapse:** confirm the precedent: the linked trainer sees the tile, and it collapses and remembers its state under its own per-account key.
5. **Circumference filter:** what it looks like (checkboxes or toggle buttons, from shared `ui/`), whether it is remembered, and whether it is shared between the gain and loss charts.
6. **Ties and empty states:** what to show when there are no gains in the period (all deltas `down`/`none`), when the window has one entry, or when the trainee has a single entry.

Evidence gaps (none of them blocks the plan):

- the E2E test bodies were not read
- hosted PostgREST `max_rows` was not checked; it only matters if a new set-returning RPC is chosen
- no `EXPLAIN` exists for the range query
