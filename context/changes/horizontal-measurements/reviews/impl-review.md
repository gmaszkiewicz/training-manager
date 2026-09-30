<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Horizontal Measurements

- **Plan**: context/changes/horizontal-measurements/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-09-30
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Card width no longer matches the phase 4 contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/journal/TraineeJournal.astro:18
- **Detail**: Phase 4 says keep `min-w-0` and replace `max-w-2xl` with a wider max only as far as the nine columns need. Both cards are `w-max max-w-full` and have no `min-w-0`. `max-w-full` caps the card at its parent, while each column is still `w-40 shrink-0`. When the window is narrower than that row, the fields paint outside the card again. The same class is on `src/components/trainer/TrainerPanel.astro:34`. Widening the kitchen sinks to `max-w-[110rem]` only hides this when the viewport is at least that wide.
- **Fix A ⭐ Recommended**: Drop `max-w-full` so `w-max` keeps the border around the row. A narrow window scrolls the page, and the fields stay inside the card.
  - Strength: Matches the overflow fix already made, and it does not bring back a horizontal scrollbar on the row.
  - Tradeoff: On a laptop the page can scroll sideways. The plan already accepted a card wider than `max-w-2xl`.
  - Confidence: HIGH — the kitchen-sink overflow was this same shrink, and the measured row is about 1664px.
  - Blind spot: Have not re-measured a viewport under 1664px after this review.
- **Fix B**: Restore `overflow-x-auto` on the measurement row.
  - Strength: The row stays inside the card at every width.
  - Tradeoff: Brings back the scrollbar phase 4 and the "What We're NOT Doing" list removed.
  - Confidence: HIGH — that class is what phases 1–3 used.
  - Blind spot: None significant.
- **Decision**: REVISED — Fix A made the page scroll. Columns are `w-28` with `gap-2`. A 1000-character note no longer widens the card: the note wraps inside the row (`w-0 min-w-full`), and the textarea uses `field-sizing-fixed`.

### F2 — Kitchen sinks use an unplanned wider column

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/pages/kitchen-sink/journal.astro:37
- **Detail**: Phase 4 does not list the journal sink, and the trainer sink change was only a second link. Both pages now use `max-w-[110rem]` instead of `max-w-4xl`. That is the follow-up that keeps the full row on the review surface. The home and auth sinks still use `max-w-4xl`, and the project rule avoids arbitrary values in views. The trainer sink has the same class at line 49.
- **Fix**: Keep `max-w-[110rem]` on these two sinks. They are the review surface for a row that does not fit `max-w-4xl`.
- **Decision**: FIXED (kept max-w-[110rem]; no code change)

### F3 — Progress still records the scrolling card

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/horizontal-measurements/plan.md:313
- **Detail**: Checks 1.3, 2.4, and 3.3 are marked done for `max-w-2xl` and `min-w-0`. The current cards do not have those classes; phase 4 replaced them. Manual rows 3.7–3.10 and 4.5–4.12 are still unchecked. The user said those manual checks passed, but the Progress section does not say so. Live checks did pass: `npm run lint`, `npm run test` (32 tests), `npm run build`, and neither `MeasurementList.astro` nor the trainer link list uses `overflow-x-auto`.
- **Fix**: Mark 3.7–3.10 and 4.5–4.12 done, and leave 1.3, 2.4, and 3.3 as historical checks that phase 4 superseded.
- **Decision**: FIXED (manual rows 3.7–3.10 and 4.5–4.12 marked done; 1.3, 2.4, and 3.3 left as historical)

### F4 — Focus scroll helper has no scrollport left

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/MeasurementForm.tsx:81
- **Detail**: `scrollFieldIntoView` still calls `scrollIntoView` when a field is focused. Phase 4 removed the horizontal scrollport, so the helper no longer scrolls a row. It does not add a scrollbar.
- **Fix**: Remove `scrollFieldIntoView` and the `onFocus` handlers on the date and measurement cells.
- **Decision**: FIXED (removed scrollFieldIntoView and both onFocus handlers)
