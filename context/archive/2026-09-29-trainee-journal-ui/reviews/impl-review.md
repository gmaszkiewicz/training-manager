<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Trainee journal visual contract

- **Plan**: context/changes/trainee-journal-ui/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-09-29
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Kitchen sink stacks three full-viewport journals

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/components/journal/TraineeJournal.astro:19
- **Detail**: The Phase 3 contract requires the outer wrapper `flex min-h-screen items-center justify-center p-4`. The sink mounts that component three times (Default, Error, Empty). Each state is a full viewport. The auth sink instead uses a constrained shell (`min-h-[28rem]` in `src/pages/kitchen-sink/auth.astro:26`). Manual check 4.7 was confirmed, so the page is readable; it is still much longer than the auth sibling. This follows the plan rather than drifting from it.
- **Fix A ⭐ Recommended**: Keep the full-viewport shells
  - Strength: Matches the Phase 3 wrapper contract, and the sink review already accepted readability.
  - Tradeoff: The review page stays long.
  - Confidence: HIGH — the class is the one the plan named, and 4.7 is checked.
  - Blind spot: None significant.
- **Fix B**: Add an optional compact wrapper used only by the sink
  - Strength: The review page scans like the auth sink without changing the live dashboard.
  - Tradeoff: A prop the plan did not specify, and the sink no longer shows the real page shell.
  - Confidence: MEDIUM — auth uses a shorter shell, but that shell was written for the sink, not reused from the product page.
  - Blind spot: Have not measured how often reviewers scroll the journal sink.
- **Decision**: FIXED via Fix A (shells kept; no code change)

### F2 — JournalSinkStates helper is outside the named files

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/kitchen-sink/JournalSinkStates.tsx:1
- **Detail**: The plan put `SubmitButton` and `FormField` on `journal.astro`. Those components need a React icon, so the sink uses `JournalSinkStates.tsx` the same way `auth.astro` uses `AuthSinkStates`. Disabled and loading both pass `forcePending`. The error field id is `sink-measured-on`. No live writes.
- **Fix**: Keep the helper. It is the AuthSinkStates pattern the plan named.
- **Decision**: FIXED (helper kept; no code change)
