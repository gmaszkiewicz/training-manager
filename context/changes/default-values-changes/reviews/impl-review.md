<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Default values for the measurement accordion and entries per page

- **Plan**: context/changes/default-values-changes/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-20
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 0 observations

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

### F1 — Server error overwrites a saved closed add form

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/journal/TraineeJournal.astro:114
- **Detail**: A server error forces `<details open>` and omits `data-restore`, so the script does not read storage. Chrome still fires `toggle` for that initial open after the following inline script registers its listener. `remember()` then writes `"open"` to localStorage and the cookie. A stored `"closed"` preference is replaced, and the next visit stays open. `addFormStartsOpen` itself follows the plan. Reproduced with a `<details open>` element and a following script: the title became `toggle:true`.
- **Fix A ⭐ Recommended**: Ignore the initial `toggle` when `data-restore` is not `"true"`, and persist only a later user toggle.
  - Strength: A stored closed form survives a server-error visit, which is what the saved-choice rule means.
  - Tradeoff: Edits the inline script the plan said to leave in place. The error visit still shows the form open.
  - Confidence: HIGH — the load-time `toggle` fired in this browser with the same element-then-script order.
  - Blind spot: Not rechecked on the real `/measurements` page with the MeasurementForm island mounted.
- **Fix B**: Leave the script. An error visit saves the form as open.
  - Strength: Matches the plan's instruction to keep the existing toggle script.
  - Tradeoff: A collapsed form becomes open on the next visit after any server error.
  - Confidence: HIGH — the write is the existing listener, not a new storage channel.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A
