<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Component Version System

- **Plan**: context/changes/component-version-system/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-11-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 6 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Automated checks run in this review

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run check:home-tokens` | PASS (clean) |
| `npx astro check` | PASS (0 errors, 0 warnings, 194 files) |
| `npm test` | PASS (22 files, 375 tests) |
| `npm run build` | FAIL with EPERM on `dist/client`: a stale `astro preview --port 4321` process held the folder. Building into a separate `--outDir` PASSED. |
| `npm run migration-check` | PASS (`20261101120000_profile_component_settings.sql` applied) |
| `npm run db:types` | PASS (no diff) |
| `npx playwright test` | NOT RUN: the stale preview holds `dist/`, and stopping it was not allowed in this session |
| `npm run smoke` | NOT RUN, for the same reason |

## Findings

### F1 — Turning a module off hides its rows instead of disabling them

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/settings/ComponentsForm.tsx:251
- **Detail**:
  - The plan says (Desired End State; Phase 3 §4; manual check 3.7) that a switched-off module's rows "stay visible but disabled". The table wrapper is instead `hidden={!moduleOn}`.
  - The values are still kept on save, because the hidden inputs stay mounted, so the data contract holds.
  - Commit a25e7b7 says this was deliberate ("A switched-off module collapses its component list"). But plan.md was never updated, and 3.7 was ticked against the plan's wording.
- **Fix A ⭐ Recommended**: Add a note to plan.md (Desired End State and 3.7) saying the rows collapse.
  - Strength: Keeps a deliberate UX choice that the commit records. The plan becomes ground truth again.
  - Tradeoff: The plan changes after the fact.
  - Confidence: HIGH — the save behaviour already meets the contract.
  - Blind spot: Whether you prefer seeing the disabled rows.
- **Fix B**: Remove `hidden` so the rows stay visible and disabled.
  - Strength: Matches the plan and change.md literally.
  - Tradeoff: The e2e and kitchen sink may need small updates.
  - Confidence: MED — the e2e locators for this state are not checked yet.
  - Blind spot: Whether component-settings.spec relies on the rows being hidden.
- **Decision**: FIXED (Fix A): plan addendum in the Desired End State; check 3.7 annotated

### F2 — A trainer with Find trainee off and no linked trainees gets a blank page

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/trainer/TrainerPanel.astro:119-122
- **Detail**:
  - `everyComponentOff` checks only whether components are switched on. The list and chart tiles also need `trainerLinks.length > 0` / `selectedLink`.
  - With Find trainee off, the other components on and no links, nothing renders: no tiles and no off-card. The trainer is left with no way to request access from this page.
- **Fix A ⭐ Recommended**: Show `ComponentsOffCard`, or a hint pointing to Settings → Components, whenever no tile would actually render (shown and has data).
  - Strength: Covers every "nothing to show" combination with one rule.
  - Tradeoff: The empty-state card copy may need a variant ("Turn on Find trainee to add a trainee").
  - Confidence: HIGH — the condition is local to TrainerPanel.
  - Blind spot: Any trainee-side combination that leaves the page empty in the same way has not been checked.
- **Fix B**: Always render Find trainee while the trainer has no links, whatever the setting.
  - Strength: The trainer can always start.
  - Tradeoff: It overrides the user's explicit off choice.
  - Confidence: MED.
  - Blind spot: Whether that surprise is acceptable.
- **Decision**: FIXED (Fix A): TrainerPanel renders ComponentsOffCard whenever no switchable tile can render; a "Find trainee is off" variant covers the no-trainee case

### F3 — Settings-mutating e2e specs race other specs in local parallel runs

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: playwright.config.ts:15,18 · tests/e2e/component-settings.spec.ts:9 · tests/e2e/top-changes-charts.spec.ts:8
- **Detail**:
  - `fullyParallel: true` with `workers: undefined` runs spec files in parallel locally, and every spec uses the one throwaway trainee.
  - `mode: "serial"` only orders tests inside a file. So the all-off or module-off tests can hide tiles from `measurement-prefill`, `measurements-narrow` or `measurement-charts` while those run.
  - CI uses `workers: 1`, so it is safe there. Local runs can flake.
- **Fix A ⭐ Recommended**: Move the two settings specs into their own Playwright project with `workers: 1`. Make that project a dependency of, or depend on, the main project so it never overlaps.
  - Strength: No new user setup. Isolation is explicit in the config.
  - Tradeoff: Local runs take a little longer.
  - Confidence: MED — the project dependency ordering with the existing setup project needs care.
  - Blind spot: How the current setup project and storageState are wired.
- **Fix B**: Give the settings specs their own throwaway user.
  - Strength: Full isolation, and they can run in parallel.
  - Tradeoff: CI must create a second user, and a new storageState is needed.
  - Confidence: MED.
  - Blind spot: How CI creates the trainee today.
- **Decision**: FIXED (Fix A): a separate "settings" Playwright project (workers: 1, depends on "chromium") runs component-settings and top-changes-charts; "chromium" ignores them

### F4 — The plan's tile names disagree with the registry labels that shipped

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/journal/TraineeJournal.astro:124,137,165 · src/components/measurements/TopChangesCharts.tsx:40
- **Detail**:
  - Phase 1 §2 and change.md say "New measurements" / "Measurements".
  - The code uses the Phase 2 registry labels "New measurement", "Your measurements" and "Top progression".
  - The code is consistent; the plan contradicts itself.
- **Fix**: Add a one-line note to plan.md that the registry labels are the canonical tile titles.
- **Decision**: FIXED: plan addendum; the registry labels are the canonical tile titles

### F5 — With Measurements for off, a trainer cannot switch which trainee is charted

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/trainer/TrainerPanel.astro:166 · src/pages/measurements.astro:340
- **Detail**:
  - The picker renders only inside the Measurements for tile or the all-off card.
  - The plan says the charts follow the remembered or first trainee, so this matches the plan. A trainer with several trainees is still stuck on one.
- **Fix**: Accept as planned, or render the picker above the chart tiles when the list tile is off.
- **Decision**: FIXED (differently, per user): the picker is its own "Choose trainee" tile under Find trainee; a required registry component trainee-picker (v1.0, no Off) is listed in Settings → Components; Measurements for holds only the list; plan addendum

### F6 — The Settings → Components page reads the same profile row twice

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/settings/components.astro:21
- **Detail**:
  - `readComponentSettings` and `readProfileRole` run in parallel against the same `profiles` row, and Topbar reads it a third time.
  - `profile.astro` uses one read.
- **Fix**: One `select("role, component_settings")` helper in profile-details.ts.
- **Decision**: FIXED: readComponentSettingsDetails makes one select("role, component_settings")

### F7 — Preview badge puts a `<button>` inside `<summary>`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/PreviewBadge.tsx:21
- **Detail**:
  - Interactive content inside `<summary>` is invalid HTML, and assistive technology handles it inconsistently.
  - Before the island hydrates, clicking the badge still toggles the tile.
  - It works after hydration, and e2e covers that.
- **Fix**: Accept, or move the badge next to (outside) `<summary>` in CollapsibleTile.
- **Decision**: FIXED: the badge moved out of <details> into the card (absolute, left of the chevron); click handler removed; e2e locates it through data-tile-card

### F8 — `component_settings` has no size bound

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261101120000_profile_component_settings.sql:7
- **Detail**:
  - The check only requires a JSON object.
  - Through PostgREST, a user can store a large blob in their own row. It is then fetched on every Topbar and `/measurements` request.
  - Parsing stays bounded because only registry keys are walked, and only the user's own requests are affected.
- **Fix**: Optionally add `pg_column_size(component_settings) < 4096` in a later migration.
- **Decision**: FIXED: pg_column_size(component_settings) <= 4096 added to the check in the unpushed migration

### F9 — E2E and smoke were not re-verified in this review

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**:
  - A stale `astro preview --port 4321` process (started 16:45) holds `dist/`, so `npm run build`, `npx playwright test` and `npm run smoke` cannot run in place. Stopping the process was not allowed in this session.
  - Progress marks 1.4, 3.3, 4.3 and 4.4 as passed at their commits. CI will re-check them.
  - Every other automated check passed here, and building to a separate output folder succeeded.
- **Fix**: Stop the stale preview, then run `npm run build && npx playwright test && npm run smoke`.
- **Decision**: FIXED: the stale preview was stopped; build PASS; smoke PASS; e2e chromium 20 passed and 1 failed (measurements-menus 360×800 Menu, which also fails 3 of 3 on the committed code, so it was already broken before these fixes); the settings project, 9 tests, all PASS with --no-deps
