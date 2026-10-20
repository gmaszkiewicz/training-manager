---
date: 2026-10-20T12:36:14+02:00
researcher: Auto
git_commit: 5a329bc6d09ce719aa69d876d3d7493ba9472dc9
branch: cursor/tests-app-refresh-and-fixes
repository: training-manager
topic: "Ground S-34 / MS-26 refresh risks A (mobile menus) and B (off-page delta) against test-plan.md and change.md Notes"
tags: [research, codebase, test-plan, measurements, playwright, deltas, mobile, dropdown-menu]
status: complete
last_updated: 2026-10-20
last_updated_by: Auto
---

# Research: Ground S-34 / MS-26 refresh risks A and B

**Date**: 2026-10-20T12:36:14+02:00
**Researcher**: Auto
**Git Commit**: 5a329bc6d09ce719aa69d876d3d7493ba9472dc9
**Branch**: cursor/tests-app-refresh-and-fixes
**Repository**: training-manager

## Research Question

Ground the refresh change `test-app-refresh-and-fixes` (S-34 / MS-26) against `context/foundation/test-plan.md` and the accepted brief in `change.md` Notes. For Risks A and B (new candidates, not yet in §2): locate the real failure path in code, verify or correct the response guidance, find existing tests, pick the cheapest useful layer, and flag speculative risks or misleading hot-spot evidence. Also ground first-tap / pointer handling on the measurements mobile shell, Playwright projects/browsers, and whether guide §4 “four product test files” is stale.

## Summary

**Risk A is a real, unproven product gap on the live measurements shell.** Phone-width Sign out and row edit/delete both open only through Radix `DropdownMenu` triggers in `TopbarActions.tsx` and `MeasurementBrowser.tsx` `RowActions`, with no app-level first-tap / touch workaround on those triggers. Playwright today runs **Desktop Chrome only** (`playwright.config.ts:25-31`); CI installs Chromium only (`.github/workflows/ci.yml:102-103`). The existing 360×800 spec checks add-form layout, not menus (`tests/e2e/measurements-narrow.spec.ts:48-64`). Auth setup asserts a visible inline **Sign out** button at default desktop width (`tests/e2e/auth.setup.ts:24`), which is the wide bar — not the hamburger. Response A’s prove / challenge / avoid guidance holds; cheapest useful layer is a targeted Playwright interaction on `/measurements` at phone width, with WebKit and Firefox projects if the acceptance bar includes those engines. Desktop Chromium alone cannot prove Safari iOS or Firefox.

**Risk B’s merge rule is already unit-locked; the remaining gap is thinner than the brief’s “missing risk” framing.** Journal list deltas run `selectPage` (month-bounded) → `selectOlderRow` (whole journal, no month filter) → `deltasForVisiblePage` (`src/lib/services/measurements.ts:277-307`, `src/lib/measurement-page.ts:224-231`). `measurement-previous` is the **add-form** predecessor API, not the month-page list path. `measurement-page.test.ts` already proves off-page previous matches full-journal `withDeltas`, including cross-month on page 2 (`:380-396`). Smoke asserts June’s live API `weightDelta` against an off-month January predecessor (`scripts/smoke.mjs:354-361`, `:638-641`); January catalog checks **row count only** (`:345-351`, `:634-636`). Response B should be corrected: do **not** add a duplicate unit for the merge rule; do **not** promote to e2e. Optional cheapest gap-fill is a thin smoke (or request) for same-month `page=2` through `readMeasurementPage` if the plan wants PostgREST wiring beyond the June case.

**Guide §4 is stale on counts and versions.** Inspected product tests: **10** Vitest files under `src/**/*.test.ts` (9 in `src/lib`, 1 in `src/components/ui`) plus **2** Playwright specs — matching the brief’s **12** — not “four … under `src/lib`, plus one end-to-end seed” (`test-plan.md:87`). Manifest versions are Vitest `^5.0.4` and Playwright `^1.64.1` (`package.json`), while §4 still cites `^5.0.2` / `^1.63.0`.

Hot-spot dirs in the brief are **likelihood evidence only**. For these two risks, `src/components/measurements` is on the failure path for A and display for B; `src/lib/services` owns B’s query wiring. `src/components/auth` and `src/components/trainer` do not own hamburger / row `DropdownMenu` or off-page list deltas on the paths inspected. Kitchen-sink is correctly excluded as an oracle (§7 + Response A).

## Detailed Findings

### Risk A — mobile / cross-browser menus

**Failure path (observed).** On viewports below `--breakpoint-measurement-row: 77.5rem` (`src/styles/global.css:91-92`), the inline nav and Sign out are CSS-hidden and the hamburger `DropdownMenu` is shown (`TopbarActions.tsx:40-86`). Row edit/delete use the same Radix pattern in `RowActions` (`MeasurementBrowser.tsx:448-478`), placed under the date cell when `measurement-row:hidden` (`MeasurementBrowser.tsx` phone-width branch). Open/close is default Radix pointer/click handling via `dropdown-menu.tsx:6-15` — no `onPointerDown` / `modal` override / `@media (hover: hover)` on those triggers in the inspected files.

**First-tap / pointer handling today.** Document `pointerdown` listeners exist for note dialog dismiss, month list, and date popup (`MeasurementBrowser.tsx:262+`, `:957+`; `MeasurementForm.tsx:713+`) — not on menu triggers. Trainer search uses `onPointerDown={reopenList}` (`TraineeEmailSearch.tsx:180`) — not reused for menus. No `touch-action` or Safari first-tap comments were found on the menu path. Product code for the S-34 “first-tap fix” is **not** present in the inspected files; the risk remains an unverified failure mode pending device/browser runs.

**Existing tests.** No Vitest covers `TopbarActions` / `RowActions` UI. Playwright projects: `setup` + `chromium` with `devices["Desktop Chrome"]` only (`playwright.config.ts:25-31`). `measurements-narrow.spec.ts` uses 360×800 but never clicks Menu or row Actions (`:48-64`). `auth.setup.ts:24` expects `getByRole("button", { name: "Sign out" })` visible — at default desktop width that is the inline button (`TopbarActions.tsx:44-49`), not the hamburger path.

**Kitchen-sink.** Home sink mounts the same `Topbar`; journal sink can exercise row menus without Sign out. Neither is the signed-in `/measurements` oracle. Response A’s challenge (“kitchen-sink stands in for live measurements”) is correct to reject.

**Response A verdict.** Keep prove / challenge / avoid as written in `change.md`. Correct the stack context: browsers under test today are **Chromium only**; adding WebKit/Firefox projects is a prerequisite for claiming those engines, and desktop WebKit still does not equal Safari iOS on a real device. Likely cheapest layer remains targeted Playwright on live `/measurements` at phone width (reachable Sign out / Edit / Delete), not screenshot or CSS-class oracles.

### Risk B — off-page previous-entry delta

**Failure path (observed).** `readMeasurementPage` loads month-bounded page rows via `selectPage` (`measurements.ts:168-193`), then `selectOlderRow` for the chronologically oldest row on that page with no month filter (`:195-214`, `:290-307`), then `deltasForVisiblePage` (`measurement-page.ts:224-231`). Returned entries are visible ids only; the older row is comparison input only. In paged production mode, `MeasurementBrowser` displays server-provided deltas and does not recompute them from a full in-memory journal.

**Not this path.** `measurement-previous.ts` / `GET /api/measurements/previous` / `readPreviousMeasurement` feed the add-form preview. Conflating those units with Risk B would mis-scope the phase.

**Existing tests.**

| Layer | What it proves for Risk B |
| ----- | ------------------------- |
| `measurement-page.test.ts:380-396` (+ `expectPageMatchesJournal` `:316-334`) | In-memory: visible page deltas equal full-journal `withDeltas` when previous is off-page (same month page 1) and when previous is another month (page 2) |
| `measurement-deltas.test.ts` | Full-list `withDeltas` rule — no paging contract |
| `measurement-previous.test.ts` | Add-form predecessor only — **not** Risk B |
| Smoke June (`smoke.mjs:638-641`, `juneDifference` `:354-361`) | Live `readMeasurementPage` path: June page shows `weightDelta` up 8 vs earlier January row |
| Smoke January catalog (`:345-351`, `:634-636`) | `entriesLength` / `pageCount` only — does **not** prove delta |
| E2E | No month-page / arrow assertions in inspected specs |

**Response B verdict.** Challenge (“paging tests that only check row count prove the delta”) is valid against January catalog and against `pageSlice` / `viewOf` cases. **Correction:** existing `deltasForVisiblePage` units **already** catch the product merge rule the brief feared was missing; a new phase that only re-asserts that rule duplicates green coverage. Skip a new unit for the algorithm. Do not promote to e2e. Optional remaining gap: same-month multi-page through PostgREST (`size=2&page=2` style) is not in smoke; June covers cross-month off-page via the live path. Cheapest gap-fill if the plan wants more than June: extend smoke (or a thin service integration), not Playwright.

### Stack / §4 grounding

- **Test files (product):** 10 Vitest + 2 Playwright specs = 12 (brief accurate; §4 stale). Skill self-tests under `.cursor/skills/**` are outside the product count.
- **Playwright:** Chromium desktop only; phone width is a per-spec viewport, not a mobile device project.
- **Versions:** package Vitest `^5.0.4`, `@playwright/test` `^1.64.1`; §4 cites older pins and `checked: 2026-10-05` stack grounding.
- **CI:** `e2e` job installs Chromium and runs `npx playwright test`; `smoke` and `migration-check` remain separate.
- **§7:** Kitchen-sink and broad screenshot matrix stay correctly excluded for this refresh; Risk A needs interaction proof, not a visual matrix.

### Hot-spot evidence (likelihood only)

Brief cites `src/components/measurements`, `src/pages/api`, `src/components/auth`, `src/components/trainer`, `src/lib/services`. For Risks A/B on the inspected paths: measurements UI owns menu triggers; services own off-page older-row lookup; API index wires `readMeasurementPage`. Auth component trees inspected have no hamburger/`RowActions` menus. Trainer UI does not own the trainee row-action menus on the writeable journal (trainer preview uses `readOnly`). Treating auth/trainer churn as anchors for A or B would be misleading.

## Code References

- `src/components/TopbarActions.tsx:40-86` — wide Sign out vs hamburger `DropdownMenu`
- `src/components/measurements/MeasurementBrowser.tsx:448-478` — `RowActions` Edit/Delete
- `src/components/ui/dropdown-menu.tsx:6-15` — thin Radix wrappers, no touch overrides
- `src/styles/global.css:91-92` — `measurement-row` breakpoint 77.5rem
- `src/lib/services/measurements.ts:168-214`, `:277-307` — `selectPage`, `selectOlderRow`, `readMeasurementPage` delta merge
- `src/lib/measurement-page.ts:224-231` — `deltasForVisiblePage`
- `src/lib/measurement-page.test.ts:316-334`, `:380-396` — off-page previous equals full journal
- `scripts/smoke.mjs:345-361`, `:634-641` — January count-only vs June `weightDelta`
- `playwright.config.ts:25-31` — chromium-only projects
- `tests/e2e/measurements-narrow.spec.ts:48-64` — 360px layout, no menu clicks
- `tests/e2e/auth.setup.ts:24` — desktop Sign out visibility
- `.github/workflows/ci.yml:102-103` — Chromium install + Playwright
- `context/foundation/test-plan.md:87` — stale “four product test files” claim
- `context/changes/test-app-refresh-and-fixes/change.md:54-72` — accepted Response A/B brief

## Architecture Insights

- Menus are one Radix pattern shared by top bar and rows; a first-tap fix likely lands once in the shared trigger path or both call sites, not in auth/trainer.
- List deltas are server-computed for paged mode; UI regression on arrows without a wrong API payload would be formatting-only — favoring API/unit proof for Risk B over browser tours.
- Add-form previous (`measurement-previous`) and list off-page previous (`selectOlderRow`) are sibling concepts with different filters; plans must not merge their tests.

## Historical Context (from prior changes)

- `context/archive/2026-10-08-pagination-and-filter-measurements/` — introduced month paging and the off-page predecessor contract (supported).
- `context/archive/2026-10-10-query-optimization/research.md` and `plan.md` — kept `selectOlderRow` + `deltasForVisiblePage` while replacing the full-journal month walk; smoke June difference was added as live proof (supported for cross-month off-page; does not claim same-month page 2).
- `context/archive/2026-10-11-preview-for-new-entry/research.md` — separates list off-page predecessor from typed-minute add-form lookup (supported; reinforces not using `measurement-previous` units for Risk B).
- `context/archive/2026-10-18-mobile-devices-ui-measurements/` — shipped the narrow measurements layout that makes the hamburger / under-date row actions the phone path (supported as likelihood for Risk A; no Safari first-tap fix in that archive’s product outcome as inspected here).

## Related Research

- `context/archive/2026-10-10-query-optimization/research.md` — list read and off-page predecessor
- `context/archive/2026-10-11-preview-for-new-entry/research.md` — add-form previous vs page older row

## Open Questions

- Whether Radix `DropdownMenu` actually requires a second tap (or never opens) on real Safari iOS / Firefox is **unobserved** in this session (static review only). Planning should treat Response A’s prove step as the verification, not as a confirmed bug reproduction.
- Whether desktop WebKit in CI is an acceptable stand-in for Safari iOS for S-34 acceptance, or a real-device check remains required, is a product choice for `/10x-plan` (roadmap has flagged device-only risk in related notes; not re-decided here).
- Whether to add a same-month `page=2` smoke assertion is optional given June + units; decide in plan based on appetite for PostgREST filter coverage of `strictlyBeforeFilter`.

## Planning handoff (settled for `/10x-plan`)

| Item | Settled fact | Source |
| ---- | ------------ | ------ |
| Risk A failure path | Radix menus in `TopbarActions` + `RowActions` on `/measurements` below 77.5rem | code anchors above |
| Risk A cheapest layer | Targeted Playwright interaction; add webkit/firefox projects to claim those browsers; no kitchen-sink / screenshot oracle | Response A + config |
| Risk B merge rule | Already covered by `deltasForVisiblePage` units | `measurement-page.test.ts:380-396` |
| Risk B live path | June smoke covers cross-month off-page; January catalog does not | `smoke.mjs` |
| Risk B cheapest layer | Skip duplicate unit; skip e2e; optional thin smoke for intra-month page 2 | Response B corrected |
| §4 refresh | Update file counts (10 Vitest + 2 specs), Playwright projects (chromium today), version pins, `checked:` dates | manifests + configs |
| Do not edit `test-plan.md` until the plan’s documentation sub-phase | Per `change.md` Notes | change brief |
