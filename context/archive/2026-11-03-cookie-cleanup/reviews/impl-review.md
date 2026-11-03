<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Cookie Cleanup Implementation Plan

- **Plan**: context/changes/cookie-cleanup/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-11-03
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Cleanup trusts a naming convention that nothing enforces

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/preference-cookies.ts:11
- **Detail**: `staleAccountCookieNames` treats every `tm.*` cookie whose 4th dot-segment (index 3) is not the signed-in account id as stale. All 16 key builders in src/lib/measurement-page.ts:51-137 currently follow `tm.measurements.<name>.<accountId>[.<traineeId>]`, but nothing ties them to `ACCOUNT_SEGMENT_INDEX`. A future `tm.*` key with another shape (e.g. `tm.hub.<accountId>`, or an account id in a different slot) would be expired by the middleware on every signed-in request: the preference would silently never stick, with no failing test.
- **Fix**: Add a unit test in src/lib/preference-cookies.test.ts that builds every `*StorageKey` from measurement-page.ts with the own account id and asserts `staleAccountCookieNames` returns `[]` for them, plus a one-line comment above the key builders pointing to the policy.
- **Decision**: FIXED — key-builder test in src/lib/preference-cookies.test.ts plus a comment in src/lib/measurement-page.ts

### F2 — Flaky find-trainee e2e under the full suite

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/find-trainee.spec.ts:107, tests/e2e/find-trainee.spec.ts:125
- **Detail**: Criterion 2.2 (`npx playwright test`) failed on the first full run during this review (2 failed, 15 did not run, 27 passed). The two tests passed in isolation together with cookie-cleanup.spec.ts, and a second full run passed 44/44. The spec does not touch `tm.*` cookies, so this looks like pre-existing flakiness under parallel load, not a regression from this change. CI could still go red intermittently.
- **Fix**: Track it as a separate follow-up (capture a trace with `--repeat-each` on the two tests); no change in this branch.
- **Decision**: DISMISSED — not reproducible: `--repeat-each=10` passed 71/71; fails only under full-suite load. Noted in follow-ups/review-fixes.md

### F3 — Middleware skip rules have no automated test

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/middleware.ts:29
- **Detail**: The guard that skips cleanup for guests and for `/api/auth/*` (the plan's critical timing rule against wiping the incoming account's cookies at sign-in) is covered only by manual testing. The e2e spec proves the signed-in path only. A later refactor of the condition would go unnoticed.
- **Fix**: Add a guest case to tests/e2e/cookie-cleanup.spec.ts (fresh context without storage state, seed a foreign `tm.*` cookie, visit `/`, assert it is still there).
- **Decision**: FIXED — guest case added to tests/e2e/cookie-cleanup.spec.ts
