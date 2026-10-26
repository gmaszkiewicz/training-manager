<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Product home

- **Plan**: context/changes/product-home/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-09-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 0 observations

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

### F1 — Bar actions and the token scanner live outside the planned files

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/TopbarActions.tsx:1
- **Detail**: The plan put the bar Button islands in `src/components/Topbar.astro` and the token check in `package.json` plus `.github/workflows/ci.yml`. `Button` with `asChild` did not receive its link when mounted from the Astro file, so Sign in, Sign up, Dashboard, and Sign out live in `src/components/TopbarActions.tsx`. The scanner is `scripts/check-home-tokens.mjs`, matching other repo scripts, and `package.json` only wires `npm run check:home-tokens`. Sign out is still `type="submit"` inside a form that posts to `/api/auth/signout`.
- **Fix**: Keep both files. They are the working form of the planned bar and the planned check.
- **Decision**: FIXED — kept `src/components/TopbarActions.tsx` and `scripts/check-home-tokens.mjs`

### F2 — Token scan does not cover the files that render the home buttons

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: scripts/check-home-tokens.mjs:7
- **Detail**: The plan says a later palette edit on the home should fail the check, and it also says to scan only `Welcome.astro`, `Topbar.astro`, and `index.astro`. After F1, those three files no longer contain the buttons. `HomeActions.tsx` and `TopbarActions.tsx` do. A palette class added there would leave `npm run check:home-tokens` green. The written check currently exits 0 and CI runs it.
- **Fix A ⭐ Recommended**: Add `src/components/TopbarActions.tsx` and `src/components/home/HomeActions.tsx` to the scanner file list.
  - Strength: Matches the plan's intent that a palette class on the home fails CI. Those two files are where the buttons are.
  - Tradeoff: The written contract named only the three Astro files.
  - Confidence: HIGH — `Topbar.astro` only mounts the island, so a palette class on a bar button is not in the scanned set.
  - Blind spot: `src/pages/kitchen-sink/home.astro` also shows buttons and quotes `ring-[3px]` as text, which the current regex would flag if that file were added.
- **Fix B**: Leave the scan on the three files the plan named.
  - Strength: Matches the written file list exactly.
  - Tradeoff: CI stays green if a palette class lands on the hero or bar buttons.
  - Confidence: HIGH — the plan names those three files and no others.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — scanner now includes `HomeActions.tsx` and `TopbarActions.tsx`
