<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Journal calendar and saved-entry display

- **Plan**: context/changes/calendar-upgrade-and-visual-fixes/plan.md
- **Scope**: Full plan (completed phases only; phase 4 still open)
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-12
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warnings 0 observations

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

### F1 — Month list scrolls the loaded month to center

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/components/measurements/MeasurementBrowser.tsx:441
- **Detail**: When the month list is open and `dates` has more than six months, an effect sets `scrollTop` so the `aria-pressed` row is vertically centered. The plan says the list shows six rows and scrolls. It does not say to move the viewport to the loaded month. `dates` stays newest first, so without this effect a loaded month outside the first six rows would sit below the fold.
- **Fix A ⭐ Recommended**: Record the scroll-to-center behavior in the plan's floating-list contract.
  - Strength: Keeps the loaded month visible inside the six-row window the plan already requires.
  - Tradeoff: The plan picks up a behavior that was not in the reviewed contract.
  - Confidence: HIGH — the effect is the only extra, and newest-first order would otherwise hide the pressed row.
  - Blind spot: None significant.
- **Fix B**: Remove the effect at `MeasurementBrowser.tsx:441-452`.
  - Strength: The list then only scrolls when the reader moves it, which is all the plan describes.
  - Tradeoff: Opening a long list on an older month shows the newest six labels, and the pressed month is off-screen.
  - Confidence: HIGH — `dates` is newest first and `max-h-68` clips to six rows.
  - Blind spot: None significant.
- **Decision**: Fixed via Fix A
