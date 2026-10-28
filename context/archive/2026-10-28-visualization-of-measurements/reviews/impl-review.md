<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Measurement Charts with Visualize and Clear

- **Plan**: context/changes/visualization-of-measurements/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-28
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

Automated checks were re-run during this review, and all passed:
- `npm run lint`
- `npm run check:home-tokens`
- `npx astro check` (0 errors)
- `npm test` (296 tests)
- `npm run build`
- `npm run smoke`
- `npx playwright test` (14 tests)

## Findings

### F1 — Implementation redesigned against the plan, and the plan was not amended

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence / Scope Discipline
- **Location**:
  - src/components/measurements/MeasurementCharts.tsx:375
  - src/pages/measurements.astro:126-146
  - src/components/journal/TraineeJournal.astro:179
  - src/components/trainer/TrainerPanel.astro:142
  - src/lib/measurement-chart.ts:146
- **Detail**: The commit bodies (f07c65c, 87a5697) record these as deliberate choices, but the plan's contracts and "What We're NOT Doing" list still describe the original design:
  - **(a) Aggregation.** Period views plot only `latestPerBucket`, the latest entry per day, month or year. This breaks "No aggregation: every point is a real entry".
  - **(b) Server-side chart data.** The initial chart is rendered on the server (`readInitialChart`), and a second cookie (`chartsPeriod`) holds the period. This breaks "No server-side render of chart data" and "the period applies after hydration". Migration Notes list only one cookie.
  - **(c) Placement.** The tile sits below the table for both roles. The plan put it above the add form, or between the trainee picker and the list for trainers. The change.md Notes also say "above the new-entry tile".
  - **(d) Years mode.** Years is a fixed last 5 years, requested with `from`/`to`. `period=years&anchor=` now returns 400.
  - **(e) Period controls.** A button group with `aria-pressed` replaces `ui/tabs`. Prev/next jump to periods that have entries, and an extra picker was added. `stepAnchor` is now dead code.
- **Fix A ⭐ Recommended**: Add a "Deviations" addendum to plan.md. Update the NOT-doing list, the Years and placement contracts, and Migration Notes (the second cookie). Align the change.md Notes.
  - Strength: The commits show these were intentional, and the e2e and smoke tests already cover the new behaviour. This brings the source of truth back in line before archiving.
  - Tradeoff: The plan becomes a record of what was built rather than the original intent.
  - Confidence: HIGH — every deviation is listed in the commit bodies.
  - Blind spot: Not verified that each choice (especially aggregation and placement) was user-directed rather than agent-initiated.
- **Fix B**: Revert to the plan: real entries, no server-side chart data, tile above the add form.
  - Strength: Matches the original change request ("above the new-entry tile", every entry plotted).
  - Tradeoff: Large rework of shipped and tested behaviour. The e2e assertions on "Monthly progression" would change.
  - Confidence: MED — reverting server-side data reintroduces the loading flash this design avoids.
  - Blind spot: User intent behind the redesign is unknown.
- **Decision**: FIXED (Fix A): plan.md now has a Deviations section and revised NOT-doing and Migration Notes; change.md Notes are amended.

### F2 — Selection breaks entirely when localStorage is unavailable

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/hooks/useMeasurementChartSelection.ts:111-160
- **Detail**: On the real page, `keys` is non-null, so the snapshot comes only from `readSnapshot(keys)` (storage). Memory is used only when `keys === null`. If storage throws or is blocked (private mode, blocked site data), `writeStored` does nothing. Clicking a checkbox then has no visible effect, and Visualize and Clear stay disabled. Before this branch, `selectedIds` was `useState` and worked without storage. This contradicts the `browser-storage.ts` promise that "the controls still update on screen".
- **Fix**: Always mirror writes into `memoryRef`/`setMemory`. Use memory when storage is unavailable, for example with a one-time probe, or a fallback when the read returns null after a successful in-memory write.
  - Strength: Restores the pre-branch behaviour, and persistence stays best-effort.
  - Tradeoff: Two sources of truth inside the hook. The precedence rule must be clear.
  - Confidence: HIGH — the fallback path already exists for `keys === null`.
  - Blind spot: The cross-island sync without storage needs the event to carry the ids. That has not been checked.
- **Decision**: FIXED: a module-level `pageSelection` map holds the selection, shared by both islands on the page. Page memory wins once written, and storage only seeds the first read.

### F3 — Full-journal days read on every /measurements render

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality (Performance)
- **Location**: src/lib/services/measurements.ts:394-421, src/pages/measurements.astro:142
- **Detail**: `readMeasurementDays` pages through every `measured_on` row of the trainee's whole history, 1000 rows per request. It runs on every server render, for the trainee and for each trainee a trainer selects, and again from the island's `days=1` fetch. The roadmap risk says "must not walk the whole journal". Each page of rows is also a Worker subrequest. The plan's own Years design used the cheap `measurement_months` RPC for this.
- **Fix A ⭐ Recommended**: Add an additive, backward-compatible RPC `measurement_days(trainee)` that returns `distinct date(measured_on)`, mirroring `measurement_months`.
  - Strength: One round trip, any journal size. Follows an existing pattern.
  - Tradeoff: A migration, which the plan said to avoid. It is additive, so safe under the deploy order.
  - Confidence: HIGH — `measurement_months` is the template.
  - Blind spot: The RLS and security-definer setup of the existing RPC has not been checked.
- **Fix B**: Bound the days read to the 5-year window that Years already uses.
  - Strength: No migration. Caps the cost.
  - Tradeoff: Still about 1 row per entry, and periods older than 5 years drop out of the picker.
  - Confidence: MED — unclear whether the picker needs older periods.
  - Blind spot: Week and month navigation beyond 5 years.
- **Decision**: FIXED (Fix A):
  - The `measurement_days` RPC (migration 20261028200000) uses security invoker, so RLS applies. It returns one `text[]` value, so it is never cut at max_rows.
  - `readMeasurementDays` now makes one call.
  - All checks pass: lint, tsc, migration-check, build, smoke (including the days checks), Playwright (14 passed), unit tests (296 passed).

### F4 — Checked-off criteria contradict the shipped behaviour

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: plan.md Progress 1.6, 2.9
- **Detail**:
  - 2.9 says "Changing the list month moves Month mode". That contradicts contract 2.4 (independent pickers) and the code, yet it is checked.
  - 1.6 checks `period=years&anchor=<today>`, which now returns 400.
  - The Testing Strategy still says "8 entries → 8 ticks" for every period, but the year and years views always tick per month or per year.
- **Fix**: Reword 1.6, 2.9 and the tick bullet to match the shipped behaviour, as part of the F1 addendum.
- **Decision**: FIXED:
  - The phase-block criteria and the Testing Strategy tick bullet are reworded.
  - The Progress titles are kept, per the convention, and mapped in Deviations → "Criteria as verified".

### F5 — reconcile may prune ids from a stale response

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/MeasurementCharts.tsx:529-541, src/components/hooks/useMeasurementChartSelection.ts:180-194
- **Detail**: `reconcile(foundIds)` compares against the visualized ids currently in storage, not the ids that were requested. If Visualize runs between the fetch resolving and the effect re-running, newly visualized ids could be pruned. The window is narrow, so this is plausible rather than reproduced.
- **Fix**: `reconcile(requestedIds, foundIds)`, pruning only ids that were requested and not returned.
- **Decision**: FIXED: the effect captures the ids it requested, and `reconcile(requestedIds, foundIds)` prunes only requested ids that are missing. As a result, `reconcileSelection` is no longer imported by production code; it is still unit-tested.

### F6 — Failed chart fetch is never retried; failed days fetch is silent

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/MeasurementCharts.tsx:525-538
- **Detail**: A failed fetch still sets `shownQuery.current`, so the same query stays in the error state until the period or ids change. A failed days fetch returns `[]` and shows an empty picker with no error.
- **Fix**: Don't record failed queries in `shownQuery`, and surface the days-read failure in the error state.
- **Decision**: FIXED:
  - A failed read resets `shownQuery` to null, so returning to that query reads it again.
  - `readDays` returns null on failure. In period mode, a failed days read shows "Could not load charts".

### F7 — Trainer branch reads the initial chart on a failing list path

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/measurements.astro:227 (vs :174)
- **Detail**: The trainee branch calls `readInitialChart` only when `listed.ok`. The trainer branch calls it unconditionally, which adds two queries on an already failing path.
- **Fix**: Guard the trainer call with `listed.ok`, as in the trainee branch.
- **Decision**: FIXED: the trainer branch now calls `readInitialChart` inside `if (listed.ok)`.

### F8 — E2E seeding can fail at the start of a UTC month

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/measurement-charts.spec.ts:23-31
- **Detail**: `seedEntries` seeds backwards from now within the current UTC month. In the first minute or two of a month it cannot seed 2 entries, so the test fails.
- **Fix**: Seed into a fixed past month, or step forward from the 1st of the month.
- **Decision**: FIXED (adapted, because the add endpoint takes only past times): in the first `count + 1` minutes of a UTC month, `seedEntries` waits until enough past minutes exist, and extends the test timeout by the wait.

### F9 — Dead code and copied helpers

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/measurement-chart.ts (`stepAnchor`), src/pages/api/measurements/chart.ts, src/components/measurements/ChartsTile.astro:99-133
- **Detail**:
  - `stepAnchor` is tested but no production code uses it.
  - `UUID_PATTERN` and `json()` are now duplicated in a third API file.
  - The persisted-`<details>` inline script is a near-verbatim copy of the one in TraineeJournal.
- **Fix**: Delete `stepAnchor` and its tests, and leave the helper extraction for a follow-up.
- **Decision**: FIXED:
  - Deleted `stepAnchor`, `reconcileSelection` (unused after F5) and the now-unused `addMonthsClamped`/`daysInMonth`, along with their tests.
  - The duplicated `UUID_PATTERN`/`json()` and the copied details script are left for a follow-up.

## Triage summary

- **Fixed**: F1 (Fix A), F2, F3 (Fix A), F4, F5, F6, F7, F8 (adapted), F9 (9 findings)
- **Skipped**: none

After triage, all checks were re-run and pass:
- `npm run lint`
- `npm run check:home-tokens`
- `npx astro check`
- `npm test` (291 tests)
- `npm run build`
- `npm run smoke`
- `npm run migration-check`
- `npx playwright test` (14 tests)
