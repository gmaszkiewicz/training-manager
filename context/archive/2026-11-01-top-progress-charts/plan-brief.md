# Top Changes Radial Charts — Plan Brief

> Full plan: `context/changes/top-progress-charts/plan.md`
> Research: `context/changes/top-progress-charts/research.md`

## What & Why

A trainee, and their linked trainer, should be able to see at a glance the biggest weight and circumference gains and losses in a week, month, year or the last 5 years. A new **Top changes** tile adds four shadcn radial charts next to the S-41 line charts (roadmap S-46, MS-37).

## Starting Point

The line charts tile already exists, but all its period logic (picker, buttons, remembered preference, fetch) is locked inside `MeasurementCharts.tsx`. The chart API already returns every entry in the window with the list's delta versus the previous entry. Recharts radial charts and the shadcn legend are installed but unused.

## Desired End State

Below the line charts, a collapsible Top changes card shows a 2×2 grid. Gains are in the top row: weight gain (one ring with the value in the centre) and circumference gain (one ring per field, longest first). Losses are in the bottom row, with the same layout. The card has its own Week/Month/Year/Years controls that look like the line tile's. A remembered "Circumferences" checkbox dropdown filters both circumference charts, and every chart has a legend. Trainers see it read-only.

## Key Decisions Made

| Decision          | Choice                                                                                           | Why (1 sentence)                                                                    | Source           |
| ----------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------- |
| What a change is  | The list's consecutive-entry delta for every entry in the window, including the first one versus an earlier entry | Matches the list's delta badge and the roadmap risk, and the chart read already returns it | Research / Plan |
| Chart shape       | Weight: one ring with the largest change; circumferences: one ring per field with its largest change, longest first | A literal reading of "top weight gain", and rings keep their line-chart colours           | Plan             |
| Period control    | The tile's own controls and cookie (extracted from the line tile); ignores Visualize mode         | Matches the "same buttons and fields" request without a cross-island event          | Plan             |
| Filter            | One "Circumferences" dropdown with checkboxes driving both circumference charts, remembered per account and trainee; the last field can't be unchecked | Compact on mobile, and gain and loss stay comparable                                    | Plan             |
| Ties / empty      | Latest entry wins a tie; an empty card keeps its title and says "No gains/losses in this period" | The grid never jumps, and the latest change is the most relevant                    | Plan             |
| Trainer & collapse| Shared read-only for a linked trainer; `<details>` starts open and remembers its state per account | Follows the S-41 precedent; RLS already allows the read                             | Research / Plan  |
| Ring scale        | Each gain/loss pair shares one maximum                                                          | Ring lengths compare across a pair                                                   | Plan             |
| Data path         | Computed client-side from the existing chart API; no RPC or migration                           | No extra query shape; the 5-year read already exists                                  | Research         |

## Scope

**In scope:**
- a pure `topChanges` helper with unit tests, and the new storage keys
- the period hook, controls and collapsible shell extracted from the line tile
- the radial chart, island and tile, plus kitchen-sink states
- the server seed, trainee and trainer mounts, and an E2E spec

**Out of scope:** first-to-last net change; top-N or "smallest" rings; following the line tile's period or Visualize mode; per-chart filters; good/bad colours; SQL aggregation or migrations.

## Architecture / Approach

`useChartPeriodRead` (period state, preference, days, fetch) and `ChartPeriodControls` are extracted from `MeasurementCharts` with no behaviour change, and `ChartsTile`'s shell becomes `CollapsibleChartTile`. The new `TopChangesCharts` island uses both under its own keys. It runs `topChanges` over the raw (unbucketed) entries and renders four `TopChangeChart`s with `RadialBarChart`, `ChartLegend` and field tokens. `/measurements` seeds the tile in parallel with the line tile and reuses the line tile's read when the period and anchor match.

## Phases at a Glance

| Phase                             | What it delivers                                            | Key risk                                                         |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Top changes logic              | Pure helper, pair scale, filter parse, keys, unit tests     | Tie and first-in-window rules diverging from the list delta      |
| 2. Extract shared chart plumbing  | Hook, period controls, shell; line tile unchanged           | A regression in a 688-line component the line E2E doesn't catch |
| 3. Top changes island and tile    | Four radial charts, legends, filter, states, kitchen sinks  | Radial layout on mobile; token check on new files                |
| 4. Wire into /measurements        | Server seed, trainee + trainer mounts, E2E, preview check   | Recharts polar modules breaking Workers hydration                |

**Prerequisites:** S-41 and S-45 done (both shipped); local Supabase for E2E and smoke.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- The recharts polar modules are assumed to hydrate on Workers like the line charts; Phase 4 checks this on the production preview.
- The Phase 2 extraction relies on the existing line-chart E2E spec and the kitchen sinks to catch regressions.
- A 5-year window with many entries renders client-side in one pass; this is assumed to be fast enough given the line tile already charts it.

## Success Criteria (Summary)

- The top weight gain matches the list's largest "up" weight delta for the same period.
- Both roles see four legible radial charts, in light and dark themes, with a remembered period, filter and open state.
- The line charts tile behaves exactly as before.
