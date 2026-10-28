# Measurement Charts with Visualize and Clear Implementation Plan

## Overview

Add a collapsible **Charts** tile to `/measurements`, above the add form for trainees and above the list for trainers. It holds eight line charts, one per measurement field, for a Week / Month / Year / Years period that defaults to the list's selected month. Hovering a line shows each entry with its difference from the previous entry. Below the list, **Visualize** charts only the checked entries (up to 15) and **Clear** returns to the month view. The browser remembers whether the tile is open, the chosen period, and the selection. Roadmap slice S-41 / PRD MS-32.

## Current State Analysis

- **No chart and no range read exist.** No charting library is installed and there is no `src/components/ui/chart.tsx`. Every read is one month and one page of at most 15 rows (`src/pages/api/measurements/index.ts:52-112`, `src/lib/services/measurements.ts:216-312`).
- **The difference is reusable.** `deltasForVisiblePage(visible, older)` (`src/lib/measurement-page.ts:224-231`) plus `selectOlderRow` (`src/lib/services/measurements.ts:195-214`) give the list's difference, including when the predecessor is months earlier.
- **Checkboxes exist but are not remembered.** `selectedIds` is in-memory React state (`MeasurementBrowser.tsx:782`, toggles at :914-938, header at :1196-1204). Checkboxes also render in the trainer's read-only list. Nothing caps how many rows can be checked.
- **The accordion pattern exists.** It is a server-rendered `<details>` plus an inline script that writes localStorage and a cookie (`TraineeJournal.astro:64-135`). `measurements.astro` reads the cookie so the first render is right (`preferredAddForm`, `src/pages/measurements.astro:91-93`).
- **Storage keys** follow `tm.measurements.<thing>.<account>[.<trainee>]` (`measurement-page.ts:50-68`). The storage and cookie helpers are private to `MeasurementBrowser.tsx:626-653`. `src/components/hooks/` does not exist yet.
- **Limits:** weight 20–400, other fields 10–300 (`src/lib/measurement-input.ts:92-101`). `measurementLimits` is not exported.
- **Tokens:** only `--chart-1..5` exist (`src/styles/global.css:29-33, 66-70, 118-122`). `scripts/check-home-tokens.mjs:7-53` checks only the files in its hard-coded list.
- **Week helpers** `weekContaining` / `openingDay` (`src/lib/journal-calendar.ts:48, 78`) exist but are used only by tests.
- **Row cap:** local PostgREST `max_rows = 1000` (`supabase/config.toml:18`).

## Desired End State

On `/measurements`, a trainee sees a "Charts" tile above "Add your next measurement", and a trainer sees the same tile between the trainee picker and the read-only list. Opening the tile shows:

- Week / Month / Year / Years tabs with previous/next buttons and the current period label.
- Eight line charts in field order (Weight, Chest, Waist, Arm, Thigh, Calf, Hips, Navel), each coloured with its own token `--chart-1..8`.
- Each point is one entry. The tooltip shows the entry's date and time, the value with its unit, and the difference from the previous journal entry, the same as the list (`formatDelta`).
- Y-axis: from the charted values, rounded out to multiples of 5 with one step of padding, clamped to the field's input range. Ticks every 5.
- X-axis: time-scaled. With 8 or fewer entries there is one tick per entry date. With more, ticks are per day (week), per Monday (month) or per month (year and years).

Month mode follows the list's month as it changes. Checking up to 15 rows and pressing **Visualize** switches the tile to "Selected entries (n)" with exactly those entries, whatever their dates. **Clear** unchecks everything and returns to Month mode on the list's month. After a reload, the open/closed state (cookie, no flash), the period, the checked ids and the Visualize mode are all restored per account and trainee. Ids of deleted entries are dropped silently.

Verify with `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke`, and `npx playwright test` against the production preview.

### Key Discoveries:

- `deltasForVisiblePage` + `selectOlderRow` give the list's difference. Calling them on a whole period gives a tooltip difference that matches by construction (`measurement-page.ts:224`, `services/measurements.ts:195`).
- `measurement_months` RPC (`services/measurements.ts:239`) gives the earliest month with data cheaply. That bounds the Years window without scanning rows.
- GET trainer pattern: role from `readProfileRole`, the `trainee` param validated by `UUID_PATTERN`, and row-level security returns empty rows when no link exists (`api/measurements/index.ts:74-86`).
- `NotificationsTable.tsx:216-231`: bulk-action buttons are `variant="outline" size="sm"` and disabled with no selection.
- The e2e accordion selector pattern is the summary button by accessible name (`tests/e2e/measurements-narrow.spec.ts:29-36`).
- `infrastructure.md` pre-mortem: CommonJS packages and Auto Minify broke island hydration only in production, so recharts must be proven on the preview build.

## What We're NOT Doing

- No week strip or day buttons in the list. The list stays month-paged.
- Tile prev/next does not move the list's month. Only list to tile syncing exists.
- No aggregation or averaging: every point is a real entry.
- No new database index, migration or RPC. The range read uses the existing unique `(trainee_id, measured_on)` index.
- No good/bad (red/green) colouring of differences (PRD non-goal).
- No chart export, zoom or brush. No charts on the hub or the profile.
- The selection is not mirrored to a cookie (UUID lists are too large). The period and selection apply after hydration.
- No server-side render of chart data. The tile shows a loading state and fetches after hydration.

## Implementation Approach

Pure rules go first, in `src/lib/measurement-chart.ts`, with unit tests. The server range and by-id reads then reuse the existing difference code, behind one new GET route that follows the existing auth and trainer pattern. The tile is an Astro `<details>` wrapper, with the persistence script copied from the add form, around one React island, `MeasurementCharts`. That island fetches by period or by ids and renders eight shadcn/recharts charts. The list keeps owning selection. Selection crosses islands through a hook in `src/components/hooks/` that saves to localStorage and sends a `window` CustomEvent. Both islands use the hook, so they stay in sync without a shared parent.

## Critical Implementation Details

- **Time zones:** `measured_on` is wall-clock time with no zone (`YYYY-MM-DD HH:mm[:ss]`). Turn it into an x coordinate by parsing it as UTC (`Date.UTC`) and compute all window and tick boundaries in UTC, as `journal-calendar.ts` does. Using `new Date(localString)` would shift points across DST.
- **Ordering:** the tile hydrates separately from the list. On mount it must read the stored selection itself and not wait for an event. The list must send the month-change event only after its state settles (after `loadPage` resolves), so the tile never charts a month the list rejected.

## Phase 1: Chart range data

### Overview

Pure chart rules, exported field limits, two new service reads and the `/api/measurements/chart` route. With these, the API returns the entries and differences for a period or for a set of ids, before any UI exists.

### Changes Required:

#### 1. Export field limits

**File**: `src/lib/measurement-input.ts`

**Intent**: The y-axis is clamped to each field's input range, so the existing limits table must be importable without duplicating the numbers.

**Contract**: Export `measurementLimits` (or an accessor `measurementFieldLimits(field): { min: number; max: number }`), with the same values as today.

#### 2. Pure chart rules

**File**: `src/lib/measurement-chart.ts` (new), `src/lib/measurement-chart.test.ts` (new)

**Intent**: Keep every rule that is not about rendering in one tested module: period windows, stepping, axis domains and ticks, the selection limit and stale-id reconciliation.

**Contract**:
- `type ChartPeriod = "week" | "month" | "year" | "years"`, `parseChartPeriod(value: unknown): ChartPeriod` (default `"month"`).
- `chartWindow(period, anchorDay: "YYYY-MM-DD", earliestMonth: string | null, today): { start: string; end: string }`: half-open window in the `monthWindow` format (`measurement-page.ts:193`).
  - Week: Monday-first week containing the anchor (reuse `weekContaining`).
  - Month: the anchor's month (reuse `monthWindow`).
  - Year: the anchor's calendar year.
  - Years: Jan 1 of the earliest year with data (or of today's year when there is none) up to Jan 1 of the year after today.
- `stepAnchor(period, anchorDay, direction: -1 | 1): string` (week ±7 days, month ±1 month, year ±1 year; years does not step). `chartPeriodLabel(period, anchorDay): string` (e.g. "27 Oct – 2 Nov 2026", "October 2026" via `monthLabel`, "2026", "All years").
- `monthAnchor(month, today): string`: today when the month is today's month, otherwise `${month}-01`. This is the anchor used when the list month drives the tile.
- `yAxis(values: number[], field): { domain: [number, number]; ticks: number[] }`:
  - Lower bound: floor of the minimum to a multiple of 5, minus 5. Upper bound: ceiling of the maximum to a multiple of 5, plus 5.
  - Clamp both bounds to the field's limits, rounded outward to multiples of 5 (weight 20–400, others 10–300).
  - Ticks every 5. An empty `values` returns `null`: no chart is drawn, and the tile shows its empty state instead.
- `xTicks(points: number[] /* UTC ms */, window: { start; end } | null, period: ChartPeriod | "selected"): number[]`:
  - 8 or fewer distinct entries: one tick per entry.
  - More than 8: per day for a week, per Monday for a month, per month (1st) for a year or years.
  - `"selected"`: buckets chosen from the span: up to 7 days → per day, up to 31 days → per Monday, otherwise per month.
- `measuredOnMs(measuredOn: string): number`: parses as UTC (see Critical Implementation Details).
- `CHART_SELECTION_LIMIT = 15`; `limitSelection(current: readonly string[], toAdd: readonly string[], limit): string[]` (keeps order and adds until the limit); `reconcileSelection(ids, foundIds): string[]` (drops ids that are not found).
- Storage keys, added next to the existing ones in `src/lib/measurement-page.ts`:
  - `chartsOpenStorageKey(account)` → `tm.measurements.charts.${account}`, plus `parseChartsOpen` (same values as `parseAddFormOpen`).
  - `chartsPeriodStorageKey(account, trainee)`.
  - `chartsSelectionStorageKey(account, trainee)` (checked ids).
  - `chartsVisualizedStorageKey(account, trainee)` (visualized ids).

#### 3. Range and by-id reads

**File**: `src/lib/services/measurements.ts`

**Intent**: Read every entry in a window without hitting PostgREST's `max_rows`, and read selected entries by id. Each entry carries the same difference the list shows.

**Contract**:
- `readMeasurementRange(supabase, traineeId, { period, anchor, now }): Promise<{ ok: true; window; entries: MeasurementWithDeltas[] } | { ok: false }>`
  - Calls `measurement_months` for the earliest month (Years only), then `chartWindow`.
  - Pages `measurementColumns` with `.range(from, from + 999)`, ordered `measured_on asc, id asc`, until a short page.
  - Calls `selectOlderRow` once for the oldest row, then `deltasForVisiblePage`.
- `readMeasurementsByIds(supabase, traineeId, ids: string[]): Promise<{ ok: true; entries: MeasurementWithDeltas[] } | { ok: false }>`
  - One `.in("id", ids)` read scoped to the trainee.
  - Then `selectOlderRow` for each found row, in parallel (at most 15). Each row's difference is against its own journal predecessor, not the previous selected entry.
  - Entries come back oldest first. Ids that are missing are simply absent.

#### 4. Chart API route

**File**: `src/pages/api/measurements/chart.ts` (new)

**Intent**: One JSON GET for the island, with the same auth, role and trainer handling as the list GET.

**Contract**: `export const prerender = false`; `GET /api/measurements/chart`.
- Either `period ∈ {week,month,year,years}` & `anchor=YYYY-MM-DD`, or `ids=<uuid>,<uuid>…` (1–15 UUIDs, zod-validated). Trainers add `trainee=<uuid>`.
- Responses:
  - 401 when signed out.
  - 400 for invalid params.
  - 403 when there is no profile role.
  - 500 when the read fails.
  - 200 with `{ entries, window }` (`window` is `null` in ids mode).
- `Cache-Control: no-store`. Copy the `json` helper and the role and trainee resolution from `api/measurements/index.ts:35-86`.

#### 5. Smoke checks

**File**: `scripts/smoke.mjs`

**Intent**: Prove the range read and difference contract against a real Supabase.

**Contract**: New checks.
- A month read returns that month's entries oldest first. An entry whose predecessor sits in an earlier month carries the same difference as the list GET for the same entry (reuse the existing January/June fixtures around `smoke.mjs:600`).
- An ids read with one unknown UUID returns only the known entries.
- 16 ids → 400.
- A trainer without a link gets empty `entries`.

### Success Criteria:

#### Automated Verification:

- Unit tests for `measurement-chart.ts` pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`
- Smoke passes against the preview with local Supabase: `npm run smoke`

#### Manual Verification:

- `GET /api/measurements/chart?period=years&anchor=<today>` as a trainee returns every entry oldest first, and the tooltip-ready differences match the list for the first entry of a month

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Charts tile

### Overview

Install the chart component, add the colour tokens, and build the `MeasurementCharts` island and the collapsible `ChartsTile`. Wire them into the trainee journal and the trainer panel, and remember the open state and the period.

### Changes Required:

#### 1. Chart component and tokens

**File**: `src/components/ui/chart.tsx` (via `npx shadcn@latest add chart`), `package.json`, `src/styles/global.css`

**Intent**: Use the shadcn chart wrapper (recharts) as the rendering layer. Add three tokens so each of the 8 fields has its own colour.

**Contract**: `--chart-6..8` in `:root` and `.dark`, exposed as `--color-chart-6..8` in `@theme inline`, with contrast tuned against `--card` in both themes. Field → token follows the `measurementFields` order (weight → `chart-1` … navel → `chart-8`).

#### 2. Charts island

**File**: `src/components/measurements/MeasurementCharts.tsx` (new), `src/components/measurements/MeasurementChart.tsx` (new)

**Intent**: Render the period controls, a status line, and eight charts fetched from `/api/measurements/chart`.

**Contract**:
- Props: `accountUserId`, `subjectTraineeId`, `readOnly` (sends `trainee` when true), `month` (the list's server month), `today`, plus an optional `entries` for kitchen-sink local mode (no fetch, the same pattern as `MeasurementBrowser`'s `paged` flag).
- Period tabs use `src/components/ui/tabs.tsx` (Week / Month / Year / Years). Previous/next are `Button variant="outline" size="icon"` with aria-labels "Previous period" / "Next period", hidden for Years. The label comes from `chartPeriodLabel`.
- The period is restored from `chartsPeriodStorageKey` after hydration and written on change. The anchor starts from `monthAnchor(month, today)`.
- States:
  - Loading: skeleton text "Loading charts…".
  - Error: "Could not load charts".
  - Empty period: "No measurements in this period".
  - Visualize mode: heading "Selected entries (n)" (wired in Phase 3).
- Out-of-order responses are discarded with a request serial, as in `MeasurementBrowser.tsx:792-813`.
- Each `MeasurementChart` gets its field, label, unit and points:
  - It renders a `ChartContainer` + `LineChart` with a numeric time x-axis (`measuredOnMs`, ticks from `xTicks`, short date labels) and a y-axis from `yAxis`.
  - Lines have dots. The tooltip shows the date and time, the value with its unit, and `formatDelta` of that field's difference, or "First entry" when there is none.
  - Charts sit in a responsive grid: 1 column on a phone, 2 at the measurement breakpoint. Only tokens and shared components are used.

#### 3. Collapsible tile

**File**: `src/components/measurements/ChartsTile.astro` (new), `src/components/journal/TraineeJournal.astro`, `src/components/trainer/TrainerPanel.astro`, `src/pages/measurements.astro`

**Intent**: Wrap the island in an accordion that looks and persists like "Add your next measurement", and place it above the add form (trainee) or above the read-only list (trainer).

**Contract**:
- `ChartsTile` props: `accountUserId`, `subjectTraineeId`, `readOnly`, `month`, `today`, `startsOpen: boolean`, optional `entries`.
- `<details data-charts-tile data-storage-key={chartsOpenStorageKey(account)}>` with summary text "Charts" and the same chevron. An inline script is copied from `TraineeJournal.astro:91-135`, minus the server-error skip. `MeasurementCharts client:load` goes inside.
- The tile starts open unless the user closed it (the same rule as `addFormStartsOpen` without the error case). `measurements.astro` reads the cookie with a `preferredChartsOpen(account)` helper and passes it through `TraineeJournal` and `TrainerPanel` props.
- Placement:
  - Trainee: before the add-form `<details>` (`TraineeJournal.astro:64`), not in edit mode.
  - Trainer: between `LinkedTraineeField` and `MeasurementBrowser` (`TrainerPanel.astro:89-94`).

#### 4. List and tile stay independent

**File**: `src/components/measurements/MeasurementBrowser.tsx`, `src/components/measurements/MeasurementCharts.tsx`

**Intent**: The list's month picker and the tile's week/month/year picker do not move or reload each other (revised from the earlier list → tile month signal).

**Contract**:
- No month events pass between the list and the tile in either direction.
- The tile starts from its remembered anchor (cookie, then storage); only without one does it start from `monthAnchor(listMonth, today)`.

#### 5. Kitchen sinks and token check

**File**: `src/pages/kitchen-sink/journal.astro`, `src/pages/kitchen-sink/trainer.astro`, `scripts/check-home-tokens.mjs`

**Intent**: Show the tile's states with static data and enforce tokens on the new files.

**Contract**:
- The journal sink shows the tile in Default (open, data), Closed, Empty period and Loading states, using the `entries` local mode.
- The trainer sink shows the tile above the read-only list.
- `FILES` gains `ChartsTile.astro`, `MeasurementCharts.tsx`, `MeasurementChart.tsx` and `src/components/ui/chart.tsx`. If shadcn's generated `chart.tsx` uses banned literals, swap them for tokens.

### Success Criteria:

#### Automated Verification:

- Token check passes with the new files listed: `npm run check:home-tokens`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Unit tests pass: `npm test`
- Production build passes: `npm run build`
- Smoke passes on the production preview: `npm run smoke`

#### Manual Verification:

- On the production preview (`npm run preview`), the Charts tile hydrates and renders eight coloured charts in light and dark themes (no Auto Minify or CommonJS breakage)
- Hovering a point shows the date and time, the value with its unit, and a difference matching the list row, including the first entry of a month
- Week / Month / Year / Years and prev/next change the charts. Changing the list month moves Month mode. The period survives a reload
- Closing the tile and reloading renders it closed with no flash. The add form's own state is unaffected
- A trainer viewing a linked trainee sees the same tile above the read-only list
- The layout at phone width has no horizontal scroll, and the kitchen sinks show every state

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Visualize & Clear

### Overview

Cap selection at 15, remember the checked and visualized ids per account and trainee, add Visualize and Clear under the table, and switch the tile to the selected entries. Ids of deleted entries are cleaned up.

### Changes Required:

#### 1. Shared selection hook

**File**: `src/components/hooks/useMeasurementChartSelection.ts` (new), `src/lib/browser-storage.ts` (new, optional)

**Intent**: Keep one source of truth for the checked and visualized ids, shared by the list and tile islands through localStorage and a window event.

**Contract**:
- `useMeasurementChartSelection(accountUserId, subjectTraineeId)` returns `{ checkedIds, visualizedIds, setChecked(ids), visualize(), clear(), reconcile(foundIds) }`.
- Values persist as JSON arrays under the Phase 1 keys, and each write dispatches `tm:measurements:chart-selection`.
- Both islands subscribe and re-read on the event. The hook re-reads storage on mount.
- `visualize()` copies the checked ids into the visualized ids. `clear()` empties both.
- With no account or trainee (kitchen-sink local mode), state stays in memory.
- If the `readStored`/`writeStored` try/catch helpers are needed in two places, move them out of `MeasurementBrowser.tsx:626-653` into a small shared module.

#### 2. List: limit, persistence, buttons

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: The checkboxes become the remembered, capped selection that drives Visualize.

**Contract**:
- Swap the local `selectedIds` state for the hook's `checkedIds`.
- Row toggles and "Select all" go through `limitSelection(…, CHART_SELECTION_LIMIT)`. Unchecked row checkboxes are disabled when 15 are checked.
- Below the pager (after `:1278`) there is a row with:
  - `Button variant="outline" size="sm"` **Visualize**, disabled when nothing is checked.
  - **Clear**, disabled when nothing is checked or visualized.
  - Muted text "n of 15 selected".
- Clear also sends the tile back to Month mode: the tile reacts to an empty visualized set by restoring `period = "month"` at the list month and saving it.

#### 3. Tile: selected-entries mode and reconcile

**File**: `src/components/measurements/MeasurementCharts.tsx`

**Intent**: Chart exactly the visualized entries, and drop stale ids.

**Contract**:
- When `visualizedIds` is non-empty, fetch `?ids=…` (plus `trainee` for trainers). Hide the period tabs and prev/next, show "Selected entries (n)", and use `xTicks(…, null, "selected")`.
- After the response, call `reconcile(found ids)`. That prunes ids missing from the response out of both the checked and visualized lists, and the list unchecks them.
- If every id was stale, the tile falls back to period mode.

#### 4. E2E

**File**: `tests/e2e/measurement-charts.spec.ts` (new)

**Intent**: Prove the hydrated tile and the cross-island Visualize/Clear flow on the production preview build.

**Contract**: As the throwaway trainee from `auth.setup.ts`, with entries seeded through the UI or API like the existing specs:
- The "Charts" summary toggles the tile, and the closed state survives a reload.
- Checking 2 rows and pressing Visualize shows "Selected entries (2)", and it survives a reload.
- Clear removes the heading and unchecks the rows.

Role and accessible-name selectors only.

### Success Criteria:

#### Automated Verification:

- Unit tests for `limitSelection` / `reconcileSelection` pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`
- Production build passes: `npm run build`
- Smoke passes: `npm run smoke`
- E2E passes on the preview, including the new charts spec: `npx playwright test`

#### Manual Verification:

- Checking rows across two months, then Visualize, charts exactly those entries with their journal differences. The 16th checkbox is disabled
- After a reload, the checked rows and "Selected entries (n)" come back. Switching to another trainee (trainer) or account shows no leaked selection
- Deleting a visualized entry and returning drops it silently, with no error toast
- Clear unchecks every row and returns the tile to Month mode on the list's month

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `chartWindow` for each period:
  - A week crossing a month and a year boundary (Mon 29 Dec 2025 → 4 Jan 2026).
  - December months.
  - Years with and without data.
- `stepAnchor` at month ends (31 Jan + 1 month → the anchor stays valid). `monthAnchor` for the current and a past month.
- `yAxis`:
  - 70.0–72.4 kg → domain [65, 80], ticks every 5.
  - Values next to a limit clamp (weight 21 → lower bound 20).
  - Navel 299 → upper bound 300.
  - Empty → `null`.
- `xTicks`:
  - 8 entries → 8 ticks. 9 entries in a month → Mondays.
  - Year → 12 month ticks.
  - `"selected"` spans of 3 days, 20 days and 200 days.
- `measuredOnMs` across a DST date gives exact 24 h steps.
- `limitSelection`:
  - Adding past 15 stops at 15 and keeps the order.
  - Ids already present are not duplicated.
- `reconcileSelection` drops missing ids and keeps the order.
- The new storage keys are scoped by account and trainee (same style as `measurement-page.test.ts:75-77`).

### Integration Tests:

- Smoke (Phase 1, item 5): range read, a predecessor in an earlier month, ids with an unknown id, the 16-id rejection, an unlinked trainer.
- Playwright (Phase 3, item 4): the tile toggle persists, and Visualize/Clear persist across a reload.

### Manual Testing Steps:

1. As a trainee with entries in two months, open `/measurements`. The Charts tile is open above the add form with eight charts for the current month.
2. Hover a Weight point. The difference equals the list row's Weight difference.
3. Switch to Year, then Years, then Week. Use prev/next. Reload: the period is kept.
4. Change the list month. Month mode follows.
5. Check 3 rows across two months and press Visualize. You see "Selected entries (3)". Reload: it is kept.
6. Delete one of them and come back. You see "Selected entries (2)".
7. Clear: the rows are unchecked and the Month view is back.
8. Sign in as a linked trainer. The tile shows above the read-only list. Switching trainee does not carry the trainee's selection over.

## Performance Considerations

- The range read is paged in 1000-row chunks on the unique `(trainee_id, measured_on)` index. A typical journal (one entry a day or less) means one round trip per Year view and a few for Years. No list query changes, so the S-24 list path stays lean.
- The ids read is one `in` query plus at most 15 parallel `limit 1` predecessor reads.
- recharts adds roughly 100 KB gzip to the `/measurements` island bundle. It is loaded with `client:load` like the other islands. Check the bundle size in the build output.

## Migration Notes

No schema change. New localStorage keys and one new cookie (`tm.measurements.charts.<account>`) need no cleanup. When a key is missing, the defaults apply (tile open, Month mode, nothing selected).

## References

- Related research: `context/changes/visualization-of-measurements/research.md`
- Roadmap slice: `context/foundation/roadmap.md` (S-41)
- Accordion and persistence pattern: `src/components/journal/TraineeJournal.astro:64-135`
- Paged read and difference: `src/lib/services/measurements.ts:195-312`, `src/lib/measurement-page.ts:193-231`
- GET auth and trainer pattern: `src/pages/api/measurements/index.ts:52-112`
- Selection state: `src/components/measurements/MeasurementBrowser.tsx:782, 910-938, 1196-1204`
- Bulk-action buttons: `src/components/hub/NotificationsTable.tsx:216-231`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Chart range data

#### Automated

- [x] 1.1 Unit tests for `measurement-chart.ts` pass: `npm test` — 532bcc8
- [x] 1.2 Lint passes: `npm run lint` — 532bcc8
- [x] 1.3 Type check passes: `npx astro check` — 532bcc8
- [x] 1.4 Build passes: `npm run build` — 532bcc8
- [x] 1.5 Smoke passes against the preview with local Supabase: `npm run smoke` — 532bcc8

#### Manual

- [x] 1.6 `GET /api/measurements/chart?period=years&anchor=<today>` as a trainee returns every entry oldest first, and the tooltip-ready differences match the list for the first entry of a month — 532bcc8

### Phase 2: Charts tile

#### Automated

- [x] 2.1 Token check passes with the new files listed: `npm run check:home-tokens` — f07c65c
- [x] 2.2 Lint passes: `npm run lint` — f07c65c
- [x] 2.3 Type check passes: `npx astro check` — f07c65c
- [x] 2.4 Unit tests pass: `npm test` — f07c65c
- [x] 2.5 Production build passes: `npm run build` — f07c65c
- [x] 2.6 Smoke passes on the production preview: `npm run smoke` — f07c65c

#### Manual

- [x] 2.7 On the production preview (`npm run preview`), the Charts tile hydrates and renders eight coloured charts in light and dark themes (no Auto Minify or CommonJS breakage) — f07c65c
- [x] 2.8 Hovering a point shows the date and time, the value with its unit, and a difference matching the list row, including the first entry of a month — f07c65c
- [x] 2.9 Week / Month / Year / Years and prev/next change the charts. Changing the list month moves Month mode. The period survives a reload — f07c65c
- [x] 2.10 Closing the tile and reloading renders it closed with no flash. The add form's own state is unaffected — f07c65c
- [x] 2.11 A trainer viewing a linked trainee sees the same tile above the read-only list — f07c65c
- [x] 2.12 The layout at phone width has no horizontal scroll, and the kitchen sinks show every state — f07c65c

### Phase 3: Visualize & Clear

#### Automated

- [ ] 3.1 Unit tests for `limitSelection` / `reconcileSelection` pass: `npm test`
- [ ] 3.2 Lint passes: `npm run lint`
- [ ] 3.3 Token check passes: `npm run check:home-tokens`
- [ ] 3.4 Type check passes: `npx astro check`
- [ ] 3.5 Production build passes: `npm run build`
- [ ] 3.6 Smoke passes: `npm run smoke`
- [ ] 3.7 E2E passes on the preview, including the new charts spec: `npx playwright test`

#### Manual

- [ ] 3.8 Checking rows across two months, then Visualize, charts exactly those entries with their journal differences. The 16th checkbox is disabled
- [ ] 3.9 After a reload, the checked rows and "Selected entries (n)" come back. Switching to another trainee (trainer) or account shows no leaked selection
- [ ] 3.10 Deleting a visualized entry and returning drops it silently, with no error toast
- [ ] 3.11 Clear unchecks every row and returns the tile to Month mode on the list's month
