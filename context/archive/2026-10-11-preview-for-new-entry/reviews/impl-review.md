<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Preview the delta versus the previous entry from the new entry date

- **Plan**: context/changes/preview-for-new-entry/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-11
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Preview line does not use the list's difference treatment

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/MeasurementForm.tsx:329-376
- **Detail**: Phase 2 says each acceptable number renders `formatDelta` of `previewAgainst` in the list's difference line (`text-card-foreground mt-1 min-h-lh text-base font-semibold`), and a blank line is a non-breaking space with `aria-hidden`. The saved list still does that (`MeasurementBrowser.tsx:533-542`). The form splits the arrow (`absolute top-1/2 left-3`) from `delta.difference.toFixed(1)` (`block pl-10`), uses `text-sm`, and does not call `formatDelta`. It also renders `Against ${previousMinuteLabel(...)}` under the date when any field string is non-empty (lines 250-253, 329-336). That caption is not in the current plan. Commit `f933465` made this layout after manual steps 2.4 and 2.5 were stamped on `2e1077b`. Lookup, stale-response drop, edit mode, and the accessible name still match the plan.
- **Fix A ⭐ Recommended**: Record the shipped layout in the Phase 2 contract: arrow under the field icon, one-decimal number under the value, `text-sm`, and the Against caption.
  - Strength: Matches `f933465`, whose message states that alignment and landed on purpose.
  - Tradeoff: The new-entry preview no longer shares the saved list's difference line.
  - Confidence: HIGH — the commit message and the form both describe this layout.
  - Blind spot: Nobody re-checked the row in the browser after `f933465`; manual sign-off predates it.
- **Fix B**: Render `formatDelta` in `text-card-foreground mt-1 min-h-lh text-base font-semibold` and remove the Against caption.
  - Strength: Restores the written Phase 2 contract and the list's treatment.
  - Tradeoff: Undoes the alignment commit.
  - Confidence: MEDIUM — the plan is explicit, and a later commit deliberately left it.
  - Blind spot: Which layout reads better in the horizontal row was not compared in this review.
- **Decision**: FIXED via Fix A

### F2 — Roadmap still promises copying previous values

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/foundation/roadmap.md:46
- **Detail**: The current plan defers copying a previous row into the new entry, and the form has no copy control. MS-18 (line 46), the S-26 table row (line 85), stream A (line 93), and the S-26 outcome (line 423) still say the trainee can copy one value or all values. Phase 1 only flipped S-26 status to `in-progress`.
- **Fix**: Drop the copy clause from those four S-26 / MS-18 sentences so the roadmap matches the deferred copy.
- **Decision**: FIXED

## Verification

- `npm test` — pass. 7 files, 84 tests.
- `npm run lint` — pass.
- Manual Progress rows 1.4, 2.4, and 2.5 are checked. They are tied to `0e5dde3` and `2e1077b`. The layout in F1 landed later, in `f933465`.
