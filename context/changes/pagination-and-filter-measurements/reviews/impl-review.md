<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Pagination and filter measurements

- **Plan**: context/changes/pagination-and-filter-measurements/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-10-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 1 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Saved month and page size travel in a cookie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/pages/measurements.astro:66
- **Detail**: The plan forbids putting the month, page, or page size in a cookie, and the first HTML is page 1 of the month of UTC today at size 10. A saved choice that differs is a later read. The page reads cookies named with the storage keys and passes that month and page size into `readMeasurementPage`. The island writes the same cookie from `document.cookie` (`Path=/; Max-Age=31536000; SameSite=Lax`, not HttpOnly) when the month or page size changes, and copies `localStorage` onto the cookie after mount. The page index is not stored. This was requested during phase 4 so the saved page is in the first HTML. It is not written into the plan.
- **Fix A ⭐ Recommended**: Add a plan addendum that the saved month and page size also live in that cookie, and that the first HTML uses them.
  - Strength: Matches the behavior you already checked, and the next review will not treat it as drift.
  - Tradeoff: The written "no cookie" line stops being the contract.
  - Confidence: HIGH — you chose this during phase 4 and confirmed the first HTML.
  - Blind spot: None significant.
- **Fix B**: Remove the cookie and restore the post-mount read when storage differs from today and 10.
  - Strength: The plan's first-HTML contract returns.
  - Tradeoff: The saved month flashes in again after load, which is the behavior you asked to remove.
  - Confidence: HIGH — that path is still in the mount effect when storage and the server page disagree.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A

### F2 — Month list stops at the first 1000 timestamps

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/measurements.ts:95
- **Detail**: `selectMeasuredOn` selects every `measured_on` for the trainee with no order and no limit. `readMeasurementPage` treats that array as the complete month list. `supabase/config.toml` sets `max_rows = 1000`, and PostgREST does not error when it cuts the response. Past that cap, some months never appear in the dropdown. The same query runs on every page, month, and page-size change. The visible page itself is limited to 5, 10, or 15.
- **Fix**: Read `measured_on` in order and keep requesting until a page comes back shorter than the cap, collapsing to `YYYY-MM` as you go. If a page is full, do not treat the list as complete.
  - Strength: The dropdown can still reach an older month after 1000 rows, without a new table.
  - Tradeoff: A very long journal takes more than one month-name query.
  - Confidence: MEDIUM — the cap is in config; this repo has not been run with 1000 rows.
  - Blind spot: Hosted Supabase may use a different `max_rows` than the local config.
- **Decision**: FIXED

### F3 — Journal width uses a calc the token check skips

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/journal/TraineeJournal.astro:48
- **Detail**: The loaded journal and the trainer card set `min-w-[calc(75rem+4px)]`. `scripts/check-home-tokens.mjs` only flags `-[<number>px|rem]`, so a `calc(...)` arbitrary size in a file on that list does not fail the gate. The same class is on `TrainerPanel.astro`.
- **Fix**: Teach the token check to reject arbitrary values inside `-[...]`, including `calc(...)`.
- **Decision**: PENDING
