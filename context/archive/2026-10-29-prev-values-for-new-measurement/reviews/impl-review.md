<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Prefill a New Measurement from the Previous Entry

- **Plan**: context/changes/prev-values-for-new-measurement/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-29
- **Verdict**: REJECTED
- **Findings**: 1 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
| --------- | ------- |
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | FAIL |

Automated checks run: `npm test` (296 passed), `npm run lint` (clean), `npx astro check` (0 errors), `npm run build` (ok), `npx playwright test tests/e2e/measurement-prefill.spec.ts` (**failed**, F1). The full E2E suite was not re-run.

## Findings

### F1 — Prefill E2E difference-slot locator matches journal rows too

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/measurement-prefill.spec.ts:90
- **Detail**: `page.locator('[aria-label="<Field> unchanged 0.0 <unit>"]')` is not scoped to the add form. The journal table renders the same aria-label for any row whose value did not change from its previous entry. Locally it failed with a strict-mode violation (2 elements for "Navel unchanged 0.0 cm": one in the form, one in the table cell). Whether it passes depends on what the shared trainee's journal holds, so criterion 2.1 is data-dependent and flaky.
- **Fix**: Scope the locator to the add form, e.g. `page.locator("details[data-add-form]").locator(...)` (or `page.locator("form")`).
- **Decision**: FIXED — locator scoped to `details[data-add-form]`; spec passes (2 passed, 1.1m), lint clean.

### F2 — Plan still says date changes never rewrite the fields

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Scope Discipline
- **Location**: context/changes/prev-values-for-new-measurement/plan.md (Desired End State, What We're NOT Doing, Progress 1.7); plan-brief.md (Key Decisions)
- **Detail**: Mid-Phase-1 the user asked for the add form to refill untyped fields from the entry before a picked minute, and for the page read to use a now + 14h + 1 min wall-clock bound. This is recorded only in change.md. The plan still lists "No re-prefill when the date changes", its Desired End State says changing the date "never rewrites the measurement fields", the page-read contract says `now.toISOString()`, and Manual 1.7 ("Moving the date earlier does not change the field values") is ticked `[x]` although the code now does the opposite.
- **Fix**: Add a "Scope change (Phase 1)" addendum to plan.md and plan-brief.md describing the refill rule, typed-field preservation, emptying when no earlier entry exists, and the 14h bound; reword Progress 1.7 to the behaviour that was actually verified.
  - Strength: Plan becomes the source of truth again before archive; future reviews will not flag the behaviour as drift.
  - Tradeoff: Rewording an already-ticked manual row; it should be re-checked by hand, not just relabelled.
  - Confidence: HIGH — the change is user-requested and already described in change.md.
  - Blind spot: None significant.
- **Decision**: FIXED — added "Scope change (Phase 1)" section to plan.md, struck the superseded Desired End State / NOT Doing bullets, added a superseded note under Progress 1.7 (title kept per progress convention; needs a manual re-check), updated plan-brief.md Key Decisions and Out of scope.

### F3 — Date-follow refill in the form has no test beyond the pure helper

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: src/components/measurements/MeasurementForm.tsx:626-627, 681-683, 796, 1033
- **Detail**: `prefillUntypedFields` is unit-tested, but the wiring that decides when it runs (`followsDate` set only on a real minute change, `typedFields` filled on input, the `editingId === null` guard, the stale-response `active` guard) is not covered anywhere. A regression there would silently overwrite typed values or the edit form's own values, which is exactly the risk the plan-brief named for Phase 1.
- **Fix**: Add one case to tests/e2e/measurement-prefill.spec.ts: seed two entries a few minutes apart, type into one field, pick a minute between them, and assert untyped fields switch to the older entry while the typed field keeps its value.
  - Strength: Covers the user-requested behaviour on the real path, with the existing seeding/cleanup helpers.
  - Tradeoff: Another minute-sensitive test on the shared trainee; picking minutes in the past avoids the next-minute wait.
  - Confidence: MED — date picker interaction in E2E already exists in other specs, but adds runtime.
  - Blind spot: Haven't checked whether a React component test harness exists that would be cheaper.
- **Decision**: FIXED — added "a picked minute refills the untyped fields from the entry before it" to measurement-prefill.spec.ts (seeds one entry yesterday 03:00, types Weight, picks yesterday 03:30, asserts Weight kept and the other seven refilled; cleans up). Passes; disabling the refill line makes it fail (deliberate-break check).

### F4 — 14-hour wall-clock bound hand-rolled in the page

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/measurements.astro:183
- **Detail**: `new Date(now.getTime() + (14 * 60 + 1) * 60 * 1000).toISOString().slice(0, 19)` repeats the save endpoint's ceiling, which already lives in src/lib/measurement-input.ts as `MIN_UTC_OFFSET_MINUTES` / `wallClockCeiling`. If the accepted offset range changes, the prefill bound silently diverges.
- **Fix**: Export a small helper from measurement-input.ts built on `MIN_UTC_OFFSET_MINUTES` (e.g. `latestWallClockBound(now)`) with a unit test, and call it from the page.
- **Decision**: FIXED — added `latestMeasuredOnBound(now)` (wallClockCeiling at MIN_UTC_OFFSET_MINUTES, one minute ahead) with a unit test pinning it to the save ceiling; measurements.astro calls it. 297 unit tests pass; prefill E2E passes.

### F5 — Field list spelled out by hand in two new places

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/measurement-previous.ts:26-38; src/pages/measurements.astro:186-187
- **Detail**: `measurementFieldValues` lists all eight fields with a repeated ternary, and the page destructures all eight to build `previousEntry`, while `measurementFields` in measurement-input.ts is the canonical list (the new test already compares against it). A ninth field would need three manual edits.
- **Fix**: Build both from `measurementFields` (e.g. `Object.fromEntries(measurementFields.map(...))`), keeping the explicit pick so only measurement values are serialized to the island.
- **Decision**: FIXED — `measurementFieldValues` now maps over `measurementFields`; new `measurementValues(entry)` pick helper (unit-tested) replaces the page's eight-field destructure.

### F6 — Initial prefill and initial difference baseline can name different entries

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/measurements.astro:183-188
- **Detail**: The prefill comes from the newest entry before now + 14h; the difference preview compares against the entry before the browser's local minute. They agree unless the trainee has an entry later than their current local minute (e.g. saved in a timezone further east, then moved west). Then the form shows that later entry's values with non-zero differences against an older one. Rare edge case, no data risk.
- **Fix**: Accept and mention it in the F2 addendum.
- **Decision**: ACCEPTED — documented as a known edge in plan.md "Scope change (Phase 1)".

## Triage summary

- Fixed: F1, F2, F3, F4, F5 (5)
- Accepted: F6 (1)
- Follow-up: Progress 1.7 needs a manual re-check against the scope-change wording.
