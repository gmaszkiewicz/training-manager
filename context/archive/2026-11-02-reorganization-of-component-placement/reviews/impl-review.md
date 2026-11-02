<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Reorganize the Avatar Menu

- **Plan**: context/changes/reorganization-of-component-placement/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-02
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Evidence

- `npm test`: 383/383 passed. `npm run lint`: clean. `npx astro check`: 0 errors, 0 warnings. `npm run check:home-tokens`: clean. `npm run build`: complete.
- `git grep -n "Hello," -- src` and `git grep -nE 'name: "Profile"|Hello, guest' -- tests`: no matches.
- `npx playwright test` (local Supabase): 20 passed, 1 failed, 9 did not run. The failure is `measurements-menus.spec.ts:18` (first tap on the phone hamburger before hydration). The same spec on `main` fails 4 of 4 locally, so it predates this change. CI e2e on `main` is green.
- PR #179 checks: `ci`, `smoke` and Workers Builds pass; `e2e` and `migration-check` still pending.

## Findings

### F1 — Progress 3.4 marked done while the PR e2e job is pending

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/reorganization-of-component-placement/plan.md (Progress 3.4)
- **Detail**: "3.4 CI e2e job is green on the PR" is `[x]` with no commit sha, but `gh pr checks 179` shows `e2e` pending. Locally, 3.1 is not fully green either: `measurements-menus.spec.ts` fails on its first hamburger tap (a hydration race that main reproduces locally too, so it is not a regression from this change).
- **Fix**: Uncheck 3.4 until the PR e2e job reports green, then re-check it.
- **Decision**: DISMISSED — the PR #179 e2e job finished green (4m35s) during the review, so 3.4 is accurate.

### F2 — `role` still read for the top bar but no longer used

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/profile-details.ts:77-95
- **Detail**: `readTopbarProfile` still selects `role` and `TopbarProfile` still carries it, but its only caller (`Topbar.astro`) no longer reads it. The plan chose "no change to the `readTopbarProfile` query", so this is a plan-level leftover, and the updated comment now describes a field with no consumer.
- **Fix**: Drop `role` from the select and from `TopbarProfile`, and trim the comment (or leave it and accept a dead column read).
- **Decision**: FIXED — `role` removed from `TopbarProfile`, the select and the return value; comment trimmed.

### F3 — Kitchen sink "role null" preview now duplicates the trainer preview

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/kitchen-sink/home.astro:126-141
- **Detail**: With `role` gone from `TopbarModelInput`, the "Signed in, role null" preview has exactly the same input as the "Trainer with no saved name on /measurements" preview (lines 89-105), and its caption still names a role the bar no longer reads.
- **Fix**: Remove the "role null" preview block (the trainer preview already covers an email-only name on /measurements).
- **Decision**: FIXED — duplicate preview block removed; the intro's "twelve product outcomes" became "eleven".
