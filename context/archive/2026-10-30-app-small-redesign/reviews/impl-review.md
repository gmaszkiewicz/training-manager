<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Small Redesign: Lucide Icons and Dark Theme

- **Plan**: context/changes/app-small-redesign/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-10-31
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated evidence (2026-10-31): `npm run lint` clean; `npm run check:home-tokens` clean; `npx astro check` 0 errors / 0 warnings / 0 hints; `npm test` 311/311; `npm run build` complete; no hex in `src/components/Banner.astro`; `npx playwright test` 21/21 (including the 4 theme specs).

## Findings

### F1 — Unplanned Request read access button change

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/trainer/TrainerPanel.astro:99, src/pages/kitchen-sink/trainer.astro:101
- **Detail**: Commit a4baa97 switches Request read access from `variant="smoke"` to the default button and updates the trainer kitchen sink text. Neither file is in the plan. The change looks harmless (probably a dark-mode readability fix found during the 3.9 walk), but it leaves the `smoke` variant in `src/components/ui/button.tsx:13` with no callers, and the `--smoke` tokens in `global.css` are now used only through that dead variant.
- **Fix**: Add a short addendum to plan.md recording the change and why. Leave the `smoke` variant in place or remove it in a later change.
- **Decision**: FIXED — addendum added to plan.md before Progress

### F2 — useTheme repeats the browser-storage helpers

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/hooks/useTheme.ts:64-69
- **Detail**: `setPreference` wraps `localStorage.setItem` in its own try/catch. `src/lib/browser-storage.ts` already exports `writeStored` for this, and `useMeasurementChartSelection` and `MeasurementCharts` use it. The read path can stay as it is, because its in-memory fallback is behaviour `readStored` does not have.
- **Fix**: Replace the try/catch in `setPreference` with `writeStored(THEME_STORAGE_KEY, next)`.
- **Decision**: FIXED — setPreference now calls writeStored

### F3 — E2E "before hydration" depends on the hook never setting the class on mount

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/theme.spec.ts:26
- **Detail**: The spec reads the class at `domcontentloaded` and says that is before the islands hydrate. That timing is not guaranteed. The test isolates the head script only because `useTheme` calls `applyTheme` on a pick or an OS change and never on mount. The deliberate-break check (4.4) confirms this today. If someone later adds a mount-time `applyTheme`, the spec would keep passing even without the head script.
- **Fix**: Reword the comment to state the real invariant: only the head script sets the class on load, and the hook applies it only on a pick or an OS change.
- **Decision**: FIXED (differently) — the reload and fresh-load checks now abort `/_astro/*.js` so no island hydrates. Deliberate break (head script removed plus a mount-time `applyTheme` in useTheme) failed all 4 theme tests; restored code passes.
