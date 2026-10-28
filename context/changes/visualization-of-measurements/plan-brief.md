# Measurement Charts with Visualize and Clear — Plan Brief

> Full plan: `context/changes/visualization-of-measurements/plan.md`
> Research: `context/changes/visualization-of-measurements/research.md`

## What & Why

Trainees and their trainers can read measurements only as a table, one month and one page at a time. Roadmap slice S-41 (MS-32) adds a collapsible Charts tile with eight line charts, one per field. It covers a week, month, year or all years, has hover tooltips showing each entry and its difference from the previous entry, and adds Visualize/Clear for entries checked in the list. Every choice is remembered by the browser.

## Starting Point

There is no chart library, no range read, and no period other than one month (`api/measurements/index.ts:52-112`). The list's difference logic (`deltasForVisiblePage` + `selectOlderRow`) and its row checkboxes already exist. The checkboxes are in memory only and have no limit. The add form's `<details>` with localStorage plus a cookie is the accordion pattern to copy.

## Desired End State

On `/measurements`, a "Charts" tile sits above the add form (trainee) or above the read-only list (trainer). It has Week / Month / Year / Years tabs with prev/next, and eight coloured charts whose tooltips show the same difference as the list. Month mode follows the list's month. Checking up to 15 rows and pressing Visualize charts exactly those entries, whatever their dates. Clear unchecks them and returns to Month mode on the list's month. After a reload, the open state (with no flash), the period and the selection all come back, scoped per account and trainee. Deleted ids are dropped silently.

## Key Decisions Made

| Decision          | Choice                                                                                         | Why (1 sentence)                                                                                         | Source |
| ----------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Chart library     | shadcn `chart` (recharts), proven on the production preview                                    | Tooltips, dots and token-based config come ready-made, which fits the shadcn convention                  | Plan   |
| Y-axis            | Fitted to the data, rounded out to multiples of 5 with one step of padding, clamped to the input range, ticks every 5 | Keeps the step-5 rule while making real trends visible, instead of 59–81 ticks on a flat line   | Plan   |
| Colours           | Add `--chart-6..8` (light and dark), one token per field                                       | Each measurement keeps its own colour without literal colours                                            | Plan   |
| Selection limit   | Up to 15. Visualize charts the checked entries whatever their dates                            | A whole 15-row page fits, and comparisons across months work                                             | Plan   |
| Period controls   | Tile tabs. Month (and Week/Year anchor) follows the list's month. Years = every year with data | The default is literally "the currently selected month" and stays in step with the list                  | Plan   |
| Trainer           | Same tile above the read-only list, with Visualize/Clear                                       | Trainers get the trend view, and both roles share one component                                          | Plan   |
| Remembered state  | Open state: localStorage + cookie. Period, checked ids, visualized ids: localStorage per account and trainee | No accordion flash, and no cookie holding a UUID list                                     | Plan   |
| X-axis / row cap  | Up to 8 entries: a tick per entry. More: per day / Monday / month. Reads paged in 1000-row chunks | Fits phone width and never truncates history past `max_rows`                                          | Plan   |
| Tooltip difference | Reuse `deltasForVisiblePage` + `selectOlderRow`, with a per-entry predecessor for Visualize   | Matches the list by construction, including a predecessor from before the period                         | Research |
| Clear             | Unchecks all rows and returns the tile to Month mode on the list's month                       | Matches "restores the original visualization of the month"                                               | Plan   |

## Scope

**In scope:**

- Pure rules in `src/lib/measurement-chart.ts`:
  - period windows and stepping
  - axes
  - the selection limit and reconciliation
  - storage keys
- `readMeasurementRange` / `readMeasurementsByIds` and `GET /api/measurements/chart`
- The `MeasurementCharts` island, the `ChartsTile.astro` accordion, the list-to-tile month event
- Visualize/Clear, a shared selection hook in `src/components/hooks/`
- Kitchen sinks, the token check, unit tests, smoke checks and one Playwright spec

**Out of scope:**

- A week strip in the list. Tile prev/next does not move the list.
- Aggregation, zoom or export.
- New indexes or migrations.
- Red/green difference colouring.
- A cookie mirror for the selection.
- Server-rendered chart data.

## Architecture / Approach

A server-rendered `<details>` (`ChartsTile.astro`, with the add form's persistence script and a cookie read by `measurements.astro`) wraps one React island, `MeasurementCharts`. The island fetches `/api/measurements/chart` by `period`+`anchor` or by `ids`, and renders eight shadcn/recharts charts. The list island owns the checkboxes and the Visualize/Clear buttons. A hook saves the checked and visualized ids to localStorage and sends a `window` event that the tile hears. A second event carries the list's settled month to the tile. Server reads reuse the existing difference functions and the existing auth and trainer handling, under row-level security.

## Phases at a Glance

| Phase                 | What it delivers                                                         | Key risk                                                              |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1. Chart range data   | Pure chart rules, exported limits, range and by-id reads, chart API, smoke | The difference must match the list when the predecessor is outside the window |
| 2. Charts tile        | recharts, tokens, island, accordion for both roles, month sync, kitchen sinks | recharts hydration on the production Workers build (Auto Minify / CommonJS) |
| 3. Visualize & Clear  | 15-entry limit, remembered selection across islands, buttons, stale cleanup, e2e | Ordering of two islands hydrating with shared storage            |

**Prerequisites:** S-23, S-27 and S-33 are done. Local Supabase (Docker) for smoke and e2e.
**Estimated effort:** about 3 sessions, one per phase.

## Open Risks & Assumptions

- Wide spans (for example 60→120 kg over years) give many 5-step ticks. Recharts hides overlapping labels, but the grid stays dense.
- Years mode for a very long journal makes several 1000-row round trips. This is acceptable at `small` scale; the hosted `max_rows` was not inspected.
- recharts adds about 100 KB gzip to the `/measurements` bundle.
- `measured_on` is wall-clock time with no zone. All x maths must use UTC parsing, or points shift across DST.

## Success Criteria (Summary)

- The trainee and the trainer see eight charts whose hover difference equals the list's difference, for any period.
- Visualize/Clear works across months and survives a reload without leaking between trainees or accounts.
- Lint, the token check, `astro check`, unit tests, build, smoke and Playwright on the production preview all pass.
