<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Delta After Edit and Delete

- **Plan**: context/changes/testing-delta-after-edit-delete/plan.md
- **Scope**: Phase 1 of 4
- **Reviewed phases**: 1
- **Date**: 2026-10-04
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Success criteria

- `npm test` exits 0. Recorded 2026-10-04: 4 files, 35 tests, exit 0.
- Progress 1.2 is checked. The three cases expect `↑ 2.0`, `↑ 1.0`, and `↓ 2.0` with null deltas on the 2025-12-28 row.
- Progress 1.3 is still unchecked. Manual confirmation is pending, not rubber-stamped.

## Findings

### F1 — Two edit cases are already newest-first

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/measurement-deltas.test.ts:207
- **Detail**: The phase contract says pass B before A. The testing strategy says each array is passed in an order that is not already newest first. The starting pair and the saved-81 case call `withDeltas([b, a])` and expect ids `b`, `a`, so those two inputs are already newest first. A helper that trusted that order and compared neighbors would keep those two green. The date-move case also passes `[b, a]` but expects `a`, `b`, so it still fails if the sort is skipped. The arrows, differences, and null oldest row match the signed edit plan.
- **Fix**: Keep `withDeltas([b, a])`. The phase contract requires that order, and the date-move case already passes an input that is not newest first.
- **Decision**: FIXED — kept `withDeltas([b, a])`; the tests already follow the phase contract, so no edit was required

### F2 — Rollout status flipped outside the phase commit

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/foundation/test-plan.md:70
- **Detail**: The working tree changes rollout phase 1 status from `researched` to `implementing`. That line is not in commit `250b05e`. Phase 1's file is `src/lib/measurement-deltas.test.ts`. Phase 4 is the §6.1 cookbook and §6.5 note, which this edit does not touch. The rollout table says the orchestrator updates Status as artifacts appear.
- **Fix**: Leave the status stamp unstaged. It is rollout bookkeeping, not a Phase 1 test change and not the cookbook.
- **Decision**: FIXED — left `implementing` unstaged in context/foundation/test-plan.md
