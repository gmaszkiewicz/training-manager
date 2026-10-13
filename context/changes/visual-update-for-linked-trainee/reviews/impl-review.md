<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Linked trainee field Implementation Plan

- **Plan**: context/changes/visual-update-for-linked-trainee/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Dropdown chevrons landed after the plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/components/measurements/MeasurementBrowser.tsx:557
- **Detail**: Phases 1 and 2 match the plan (`a48c4c5`, `28967bc`). `adjacentTrainerLinks` follows array index only, the tests cover `ada@` / `bea@` / `cyd@`, and `LinkedTraineeField` has the specified group, disabled ends, `encodeURIComponent` links, dismiss behavior, `aria-current="page"`, and scroll when `links.length > 6`. `TrainerPanel.astro` mounts it with `client:load` inside `flex justify-center`. Commit `52bf305` then rewrote both center buttons. The month field, which success criterion 2.9 and "What We're NOT Doing" leave unchanged, now renders a `ChevronDown` on each side of every sizing label and a rotating chevron on the closed control (`MeasurementBrowser.tsx:555-568`). The email control gained the same visible chevron (`LinkedTraineeField.tsx:96-99`). Month stepping, the month list, and `aria-pressed` are untouched. Progress row 2.9 was checked against `28967bc`, before this commit.
- **Fix A ⭐ Recommended**: Keep the chevrons and record them as a plan addendum
  - Strength: Both pickers already share the dropdown cue, and month behavior is otherwise the control the plan copied.
  - Tradeoff: Criterion 2.9 ("month field unchanged") is no longer literal.
  - Confidence: HIGH — `52bf305` only rewrites the inner label markup in these two files.
  - Blind spot: The kitchen sink was not reopened in a browser after this commit.
- **Fix B**: Revert `52bf305` so both center labels match the reviewed plan
  - Strength: Restores the month field and the email span the plan specified.
  - Tradeoff: Drops the dropdown cue on both controls.
  - Confidence: HIGH — the commit has no other callers or schema changes.
  - Blind spot: None significant.
- **Decision**: Fixed via Fix A

### F2 — Email width row ignores the new chevrons

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/trainer/LinkedTraineeField.tsx:89
- **Detail**: The month button's hidden row measures each label with a chevron on both sides (`MeasurementBrowser.tsx:557-561`), so its width stays stable. The email button's hidden row is still the raw address (`LinkedTraineeField.tsx:89-94`) while the visible row adds two chevrons and `gap-2` (`:96-99`). When linked emails are similar length, selecting the longest address widens the button by those icons and shifts the arrows. This only matters if the chevron in F1 stays.
- **Fix**: Measure each hidden email the same way as the month labels: `flex items-center gap-2` with a `ChevronDown` on each side of the address.
- **Decision**: Fixed
