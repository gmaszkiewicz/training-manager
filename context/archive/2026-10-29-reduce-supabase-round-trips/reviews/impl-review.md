<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Reduce Supabase Round Trips

- **Plan**: context/changes/reduce-supabase-round-trips/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-29
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 0 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | PASS    |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | WARNING |

## Verification evidence

- `npm test`: 303/303 passed
- `npx astro check`: 0 errors, 0 warnings, 0 hints
- `npm run lint`: clean
- `npm run build`: complete
- `npx wrangler deploy --dry-run`: accepted
- `npx playwright test` (local): 14 passed, 2 failed (`measurements-menus`, `profile-avatar`) on strict-mode duplicate elements. The local `main` baseline failed too, on a stale Vite optimize-deps cache, so this is the environment. CI run 40943933888 on `dd8ff99`, which holds all the code, passed every job (ci, smoke, e2e, migration-check).
- `npm run smoke`: not run locally; covered by the CI smoke job above.
- Phase 2 parallelization: each early read is awaited on every path, including a failed list. The service functions catch their own errors and return `{ ok }`, so no read can be left floating. The `?edit=` + `?delete=` precedence keeps the current order.

## Findings

### F1 — Plan doesn't record the /settings getUser() decision

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/middleware.ts:8-19
- **Detail**: The middleware adds `SERVER_VERIFIED_ROUTES = ["/settings"]`, which calls `getUser()` there. The plan says "no extra `getUser()` is added". This was a deliberate decision (commit 87cfb36): local Supabase signs ES256 tokens, not HS256 as the plan assumed, so `getClaims()` verifies locally and the smoke step "other session ends" broke. Three parts of the plan still describe the old premise: Current State Analysis ("Local Supabase signs JWTs with the legacy HS256 secret"), Key Discoveries ("no extra `getUser()` is added") and Testing Strategy ("on the HS256 fallback path"). The only record of the decision is a commit message.
- **Fix**: Add an addendum to plan.md recording that local Supabase signs ES256, that `/settings` stays server-verified through `getUser()`, and why. Correct the three passages listed above.
- **Decision**: FIXED — plan addendum added; Current State, Key Discoveries and Testing Strategy corrected

### F2 — timing.md doesn't meet its recording contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/reduce-supabase-round-trips/timing.md:19-22
- **Detail**: The contract asks for each run's median and individual values. The before run has only its min and max (median "_not recorded_"), and the after run reads "mostly < 0.300, one outlier 1.20" with median "< 0.300". So item 3.6 ("median below the before median") is inferred from after values below the before minimum, not measured. The conclusion probably holds, but the evidence is weaker than the contract asks for. The before run can't be repeated now that the change is deployed.
- **Fix**: Add a note to timing.md saying that individual values weren't kept, and that 3.6 rests on the after values being below the before minimum. Optionally record a fresh after run with all 5 values and a numeric median.
- **Decision**: FIXED — recording-gap note added to timing.md
