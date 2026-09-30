<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Shared top bar

- **Plan**: context/changes/shared-topbar/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-09-30
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — readProfileRole does not catch a thrown Supabase error

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/ensure-profile.ts:29
- **Detail**: `readProfileRole` awaits `findProfile` with no `try/catch`. A select that returns `{ error }` already becomes `null`, which matches the plan. A thrown client or network error does not. `ensureProfile` in the same file wraps that call and returns `{ ok: false }`. A throw from the bar's read would fail SSR on every signed-in page that mounts `Topbar`.
- **Fix**: Wrap `readProfileRole` in `try/catch` and return `null` on throw, the same soft-fail `ensureProfile` uses.
- **Decision**: FIXED
