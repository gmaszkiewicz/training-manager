<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Top progression 0.9 (RC) and Unified Period Pickers

- **Plan**: context/changes/changes-to-measurments-and-progressions/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4, 5
- **Date**: 2026-11-03
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Automated verification (2026-11-03)

- `npm run lint`: pass
- `npm run check:home-tokens`: pass (clean)
- `npx astro check`: pass (0 errors, 0 warnings, 0 hints)
- `npm test`: pass (24 files, 435 tests)
- `npm run migration-check`: pass. It applies `20261102130000_top_changes_rc_default.sql`, migrates the profile fixture, and re-runs the migration idempotently.
- `npx playwright test`:
  - Run 1: the menus spec failed once (`measurements-menus.spec.ts:8`). That code is not touched by this branch, so it looks like a hydration flake.
  - Run 2: the menus spec passed, and `component-settings.spec.ts:81` failed (see F2).
  - All 42 other settings and chromium specs pass.
- `npm run build`: not verified. EPERM on `dist/client`: the directory is locked by an outside process, and nothing is listening on port 4321. `npm run smoke` was not run.

## Findings

### F1 — Month label rule labels at least 6 days, but the plan says 3

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/lib/measurement-top-changes.ts:181-213 (`labelMonthDays`, `MIN_LABELLED_DAYS = 6`)
- **Detail**:
  - The plan (Phase 2 §2, change.md note 8) says to label the days with progress. When fewer than 3 are labelled, add the first, the last and the middle (`ceil(days/2)`) day.
  - Commit 26b5897 (Phase 3) raised the minimum to 6, using evenly spread anchors (1, 31, 7, 13, 19, 25), and skips an anchor next to a progress day. Plan, plan-brief and change.md were never updated.
  - The unit tests (`measurement-top-changes.test.ts:297-328, 407-422`) encode the new rule, so none of the plan's worked examples is tested.
  - Since Phase 5, 0.9 draws only `changedSubPeriods`, which are all labelled. The top-up anchors therefore never render in the shipped UI.
- **Fix A ⭐ Recommended**: Record the 6-anchor rule in the plan as an addendum and update change.md note 8 and plan-brief.
  - Strength: The code, the tests and the shipped UI already agree, and the change was made deliberately during Phase 3.
  - Tradeoff: The plan's worked examples become historical.
  - Confidence: HIGH. Phase 5 makes the anchors invisible in 0.9, so the choice has no user-visible effect today.
  - Blind spot: It is not verified that the user explicitly approved the change from 3 to 6 during Phase 3's manual check.
- **Fix B**: Revert to `MIN_LABELLED_DAYS = 3` with first/last/middle anchors, and restore the plan's worked-example tests.
  - Strength: Exact match with the plan and note 8.
  - Tradeoff: Rework for a rule the UI doesn't render.
  - Confidence: MED. The reason for the change was not recorded.
  - Blind spot: Whether Phase 3's radar readability drove the change.
- **Decision**: FIXED (Fix A): addendum in plan.md Phase 2 §2, note in change.md note 8, label rule updated in plan-brief.md.

### F2 — Uncommitted tooltip full stop breaks the RC badge e2e test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/components/measurements/VersionBadge.tsx:8 (working tree), tests/e2e/component-settings.spec.ts:99,108
- **Detail**:
  - During this review the working tree changed `RC_BADGE_TOOLTIP` to "Release candidate - it may contain bugs." (with a full stop).
  - The e2e test, the plan, change.md note 7 and the kitchen-sink copy (`journal.astro:332`) all use the text without the full stop, so `component-settings.spec.ts:81` fails.
  - The committed code (HEAD) is consistent.
  - The full stop does match the Preview tooltip ("Preview version — it may contain bugs.").
- **Fix**: Choose one text and align all four places. If the full stop stays, update the test (lines 99 and 108), journal.astro:332 and the plan's tooltip text.
- **Decision**: FIXED: kept the full stop and aligned component-settings.spec.ts:99,108, journal.astro:332 and plan.md (lines 22, 232, 278). The e2e re-run is still pending: an orphaned `astro preview`/`workerd` process locks `dist/client`, so the Playwright webServer build fails with EPERM.

### F3 — `useStoredFields` hook lives in a component file and duplicates 0.1

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/measurements/TopChangesChartsRc.tsx:61-90
- **Detail**:
  - CLAUDE.md says to extract hooks to `src/components/hooks/`.
  - `useStoredFields` copies, almost line for line, the restore-then-write logic in `TopChangesCharts.tsx:228-253`: `readStored`, then `parseTopChartsFields`, a restored flag, then `writePreference`.
  - The tile-heading effect is also duplicated (`TopChangesChartsRc.tsx:240-251`).
- **Fix**: Move `useStoredFields` to `src/components/hooks/useStoredFields.ts` and use it from both islands (0.1 with `topChartsFieldsStorageKey`).
- **Decision**: FIXED: extracted to `src/components/hooks/useStoredFields.ts` and used by `TopChangesCharts.tsx` and `TopChangesChartsRc.tsx`. Lint, astro check and `npm test` (435) pass. The e2e re-run is pending (`dist` lock, see F2). The heading effect is still duplicated and was left as is.

### F4 — Migration also re-enables users who switched Top progression off on purpose

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261102130000_top_changes_rc_default.sql:5-7
- **Detail**:
  - Saved settings store every component's resolved value, so a deliberate "off" looks the same as a default "off". The migration moves both to "0.9", and nothing records which rows it moved.
  - The SQL itself is sound: it only touches `{components,top-changes}`, is null-safe, idempotent, within the 4096-byte check, and backward compatible.
  - The plan's Migration Notes accept this risk explicitly.
- **Fix**: Mention it in the release notes ("if you had switched Top progression off, switch it off again in Settings").
- **Decision**: FIXED: release-note line added to plan.md Migration Notes for the PR description.

### F5 — Bar values are not reachable by keyboard

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/TopChangeBarChart.tsx:139, 165
- **Detail**:
  - `BarChart` has no `accessibilityLayer`, while `MeasurementChart.tsx:110` sets it on its `LineChart`.
  - The `overflow-x-auto` plot that scrolls sideways has no `tabIndex`.
  - This is not a regression: the 0.1 radar lacked the layer too, and the legend gives each series' top value in text.
- **Fix**: Add `accessibilityLayer` to the BarChart, plus `tabIndex={0}` and an aria-label on the scroll container.
- **Decision**: FIXED: `accessibilityLayer` added to the data BarChart. The scroll container is a focusable `role="region"` named by the card title (`aria-labelledby={titleId}`). Lint and astro check pass. The e2e re-run is pending (`dist` lock, see F2).

### F6 — `TopChangesTile` version prop typed `string | null` instead of `"0.1" | "0.9"`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/TopChangesTile.astro
- **Detail**: The plan's contract is `version: "0.1" | "0.9"` (default "0.1"). The implementation accepts any string and picks the RC island only for "0.9", so a typo silently renders 0.1.
- **Fix**: Narrow the prop type (map `ComponentTile.version` to the union at the call sites), or document why it is a string.
- **Decision**: DISMISSED: already documented at TopChangesTile.astro:33. `ComponentTile.version` is `string | null` registry-wide, and narrowing it is not worth a mapper.

### F7 — The 0.9 island imports helpers from the 0.1 island's file

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/measurements/TopChangesChartsRc.tsx:7-12
- **Detail**: `CircumferenceFilter`, `ownTile`, `weightSeries` and `topChangesHeading` are now exported from `TopChangesCharts.tsx` (0.1) and imported by 0.9. Removing 0.1 later will require moving them first.
- **Fix**: Move them into `top-change-chart-parts.tsx` now, or when 0.1 is retired.
- **Decision**: FIXED: `topChangesTileId`, `topChangesHeading`, `ownTile`, `weightSeries` and `CircumferenceFilter` moved to `top-change-chart-parts.tsx`. Both islands and `TopChangesTile.astro` import from there. Lint, check:home-tokens, astro check and `npm test` pass. The e2e re-run is pending (`dist` lock, see F2).

### F8 — plan-brief.md is stale and has uncommitted edits

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/changes-to-measurments-and-progressions/plan-brief.md:24, 31, 35, 48
- **Detail**: The brief still describes area charts for Phase 5, which were dropped for bar charts, and the 3-label rule (see F1). It also has uncommitted working-tree edits.
- **Fix**: Align the brief with the plan (bar charts, the chosen label rule) and commit it.
- **Decision**: FIXED: the area-chart wording is replaced with Phase 5's bar charts, Month-wide period box and compact footer (the label rule was fixed under F1). Not committed.

## Triage summary

- Fixed: F1 (Fix A), F2, F3, F4, F5, F7, F8 (7)
- Dismissed: F6 (already documented) (1)
- Verified after triage: `npx playwright test` passes (43/43), and its webServer runs `npm run build` successfully.
- Follow-up fix: `measurements-menus.spec.ts` clicked Menu, the avatar and row Actions once. 0.9 being on by default adds a `client:load` Recharts island to `/measurements`, which delays hydration of the top bar. The three clicks now retry until the menu shows, the pattern used in `account-menu.spec.ts`.

## Notes

- **Unplanned files are all benign:**
  - `playwright.config.ts` runs the new spec serially with the settings specs.
  - `scripts/migration-check.mjs` adds the fixture for the new migration.
  - `ChartsTile.astro` and `kitchen-sink/trainer.astro` are the `preview` → `stage` rename.
  - `component-settings-helpers.ts` gets the new default.
  - `roadmap.md` is bookkeeping.
- **Inline "Could not load charts" alert** (`TopChangesChartsRc.tsx:288-293`) copies the existing sibling pattern (`MeasurementCharts.tsx`, `TopChangesCharts.tsx`). The toast lesson would apply to all three, so it is left for a separate change.
- **"Row wraps on a phone"** (Phases 1 and 3) was superseded by Phase 5's "never wraps", and the code follows Phase 5.
