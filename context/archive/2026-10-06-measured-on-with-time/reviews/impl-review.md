<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Add time of day to measured_on

- **Plan**: context/changes/measured-on-with-time/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-10-08
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 1 warnings 1 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Findings

### F1 — Lint fails on smoke line length

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: scripts/smoke.mjs:251
- **Detail**: `npm run lint` fails with three prettier/prettier errors, at lines 251, 394, and 437. Each `measurementForm(...)` call is one line longer than Prettier allows. Phase 3's automated check is `npm run lint` and `npx astro check`. Astro check passed. The other automated checks passed: `npm test` (42), `npm run migration-check`, and `npm run db:types` with `measured_on` still typed as `string`.
- **Fix**: Wrap those three calls with `npx eslint --fix scripts/smoke.mjs`.
- **Decision**: FIXED

### F2 — Five automated Progress rows have no commit SHA

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/measured-on-with-time/plan.md:275
- **Detail**: Rows 1.1, 1.2, 2.1, 2.2, and 3.1 are `[x]` without a ` — <sha>` suffix. The work landed in `daa4e23`. Rows 1.3–3.5 already carry that SHA, and 4.1–4.3 carry `9ff7b4b`.
- **Fix**: Append ` — daa4e23` to rows 1.1, 1.2, 2.1, 2.2, and 3.1.
- **Decision**: FIXED
