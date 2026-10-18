<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Measurements Screen on a Phone

- **Plan**: context/changes/mobile-devices-ui-measurements/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-18
- **Verdict**: REJECTED
- **Findings**: 1 critical 3 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Phone metrics scroll sideways instead of stacking

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/MeasurementForm.tsx:1050
- **Detail**: Phase 1 stacks the date and eight metrics in one column below `calc(80rem + 4px + 15px)`, and says `overflow-x-auto` on the row does not meet the plan. Commits `72bf081` and `3ab0834` did that. Commit `3a7617e` replaced it. The add form wraps the metrics in `overflow-x-auto` and sizes each one `w-[5.5625rem]` (`MeasurementForm.tsx:1061`), not `w-full`. The saved list does the same at `MeasurementBrowser.tsx:390` and `:1024`, with a different narrow width, `w-[4.875rem]` (`MeasurementBrowser.tsx:148`). Wide columns are `9.75rem` and `5.5rem`, not `w-56` and `w-28`. The breakpoint is `77.5rem` (`src/styles/global.css:85`), not `calc(80rem + 4px + 15px)`. The journal and trainer cards are always `max-w-[74rem] p-4` (`TraineeJournal.astro:48-49`); the loaded floor `min-w-[calc(75rem+4px)]` and the narrow `px-1` are gone. At the wide breakpoint, Edit and Delete leave the date (`MeasurementBrowser.tsx:422`) and the note opens from an icon (`:418`) instead of sitting full width under the row. The linked-trainee control no longer restores `w-max` or the in-flow email sizer at the breakpoint (`LinkedTraineeField.tsx:66`).
- **Fix A ⭐ Recommended**: Restore the `72bf081` layout classes and the `3ab0834` viewport assertions.
  - Strength: Matches the reviewed plan, including the ban on a horizontal scrollbar, and puts every field inside a 360px viewport.
  - Tradeoff: Drops the phone screen in `3a7617e` (the strip, the `74rem` card, and the collapsible add form).
  - Confidence: HIGH — the plan and the two earlier commits state the contract.
  - Blind spot: The later commit may be a deliberate product change that was never written back into the plan.
- **Fix B**: Amend the plan so the strip, `77.5rem`, and the new column widths are the contract, and rewrite the success criteria.
  - Strength: Keeps the screen that is on disk.
  - Tradeoff: Contradicts "What We're NOT Doing" and the slice outcome that every field stays on screen at 360px. The current 360px test does not show Navel is reachable.
  - Confidence: MEDIUM — the commit message says the phone screen is finished, but the plan was not updated.
  - Blind spot: Have not confirmed in a browser that the inner strip can be scrolled to Navel while `html` keeps `overflow-x: clip`.
- **Decision**: PENDING

### F2 — 360px test no longer keeps every field on screen

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: tests/e2e/measurements-narrow.spec.ts:51
- **Detail**: Phase 2 requires the date and all eight inputs to be visible at 360×800, each box inside the viewport (`x >= 0` and `x + width <= 360`), and Navel below Weight. The spec now checks only the date and Weight inside the viewport (`:57-61`), then requires Navel to the right of Weight (`:62-63`) and does not check Chest, Waist, Arm, Thigh, Calf, or Hips. `npx playwright test` passed (4 tests). Navel can sit past 360px and the test still passes. The 1400×900 case still requires Navel to the right of Weight on one row. No second Playwright project was added, and `storageState` is still the Chromium project's.
- **Fix A ⭐ Recommended**: Restore the phase 2 assertions: all eight fields inside the 360px viewport, and Navel below Weight.
  - Strength: The test again fails if a later edit clips a field, which is the reason phase 2 exists.
  - Tradeoff: It fails against the current strip until F1 is restored.
  - Confidence: HIGH — `3ab0834` already contained these assertions.
  - Blind spot: None significant.
- **Fix B**: If the strip stays, assert that scrolling the strip brings every metric fully inside the viewport.
  - Strength: Locks reachability for the layout that is on disk.
  - Tradeoff: Accepts sideways scrolling, which the plan forbids, and no longer locks "Navel below Weight".
  - Confidence: MEDIUM — depends on the F1 decision.
  - Blind spot: Have not measured the strip's `scrollWidth` in a browser.
- **Decision**: PENDING

### F3 — Auth, home, and shared Input were restyled

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/input.tsx:11
- **Detail**: The plan does not restyle the shared top bar, `Input`, or the auth screens, and it leaves the measurements top-bar wrapper as it is. `3a7617e` sets the shared input to `bg-background`, wraps the measurements top bar in `max-w-[74rem]` and passes `measurementChrome` (`src/pages/measurements.astro:170-174`), and applies that chrome to sign-in, sign-up, confirm-email, reset-password, profile, and the home hero. The footer libraries panel was rebuilt. The add form is now a collapsible `details` that stores open or closed (`TraineeJournal.astro:44-45`). `button.tsx` was not edited. Numeric limits and delta math are unchanged.
- **Fix A ⭐ Recommended**: Revert the files outside the plan's component list (Input, auth, home, profile, footer, layout chrome, measurements top bar) and decide the measurement row in F1.
  - Strength: Keeps this change inside the measurements screen the slice describes.
  - Tradeoff: The `74rem` card and canvas background would no longer be shared with auth and home.
  - Confidence: HIGH — those files are named in "What We're NOT Doing" or are absent from "Changes Required".
  - Blind spot: Have not checked whether the home hero change removed a signed-in action that another screen depends on.
- **Fix B**: Record the chrome as a plan addendum and keep it.
  - Strength: Preserves one visual shell across the app.
  - Tradeoff: A measurements slice now owns auth, home, and the shared input.
  - Confidence: MEDIUM — the commit treats it as one screen finish, but no plan note says so.
  - Blind spot: Original-scope review of those screens has not happened.
- **Decision**: PENDING

### F4 — Libraries dialog closes on any click inside it

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/Footer.astro:79
- **Detail**: The dialog click listener calls `dialog.close()` for every click, including clicks on the dependency list. The previous listener closed only when the click target was the backdrop or the close control. This file is part of the out-of-plan footer restyle in F3.
- **Fix**: Close only when `event.target === dialog` or the click is on `[data-close]`.
- **Decision**: PENDING
