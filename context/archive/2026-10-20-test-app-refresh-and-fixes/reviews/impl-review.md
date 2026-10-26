<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Refresh the test plan, expand app tests, and fix iOS Safari menus

- **Plan**: context/changes/test-app-refresh-and-fixes/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-21
- **Verdict**: APPROVED
- **Findings**: 0 critical 0 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Menus e2e also Escape-closes and asserts Sign out gone

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: tests/e2e/measurements-menus.spec.ts
- **Detail**: Spec matches the planned Menu→Sign out and Actions→Edit/Delete contract, then also presses Escape and asserts Sign out is no longer visible. That close step is not in the plan contract. Benign; does not add browsers, kitchen-sink oracles, or Risk #8 coverage. (Playwright `setup` project is auth state only, not a second browser — not flagged.)
- **Fix**: Leave as-is (benign hardening of the open proof), or document the Escape close in a plan addendum if you want the contract to match the spec exactly.
- **Decision**: FIXED — plan addendum: Escape close + Sign out dismissed documented in Phase 1 menu-spec contract
