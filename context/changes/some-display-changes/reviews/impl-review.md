<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Inline measurement errors and clearer button states

- **Plan**: context/changes/some-display-changes/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-15
- **Verdict**: REJECTED
- **Findings**: 1 critical 2 warnings 0 observations

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

### F1 — Measurement errors render as hover bubbles instead of one reserved line

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/MeasurementForm.tsx:458
- **Detail**: Phase 1 still specifies one reserved `text-xs` line as the first child of the form, showing only `firstMeasurementError`, set on blur and cleared on change. `adbecef` did that. `763878f` replaced it and left the plan text in place. HEAD has no `firstMeasurementError`. Each measurement with a message renders `FieldBubble` inside its `w-28` column (`MeasurementForm.tsx:706`). The bubble wraps (`break-words`, `max-w-56`) and is `invisible` unless the column is hovered, focused, or `errorsRevealed` (`MeasurementForm.tsx:464`). `onChange` calls `setMeasurementError` (`MeasurementForm.tsx:727`), so invalid text is checked on every keystroke. A failed Add stores every schema message and forces those bubbles visible for 3000ms (`MeasurementForm.tsx:555` and `:600`). `describedBy` is set for every field with a message, and that id points at a node that is `visibility: hidden` after blur, so the error is not shown and is not exposed as the field description. This also breaks the not-doing list: no keystroke errors, no stacked measurement messages, no message wrapped in the column. Date and Note still use `FieldError` under the control. Phase 2 matches the plan: `button.tsx` uses `disabled:bg-muted`, `disabled:text-muted-foreground`, `disabled:shadow-none`, and `aria-pressed:not-disabled:ring-2` with the ring token. `default` and `outline` fills are unchanged. No new `aria-pressed` was added.
- **Fix A ⭐ Recommended**: Restore the reserved one-line band, blur-only updates, and `firstMeasurementError`, and stop validating on each keystroke.
  - Strength: Matches the phase contract, the not-doing list, and manual rows 1.5–1.7 and 1.9. The message stays visible after blur, so `aria-describedby` can point at a rendered line.
  - Tradeoff: Removes the per-field bubbles and the 3-second reveal added in `763878f`.
  - Confidence: HIGH — `adbecef` implemented this contract; `763878f` replaced it without rewriting the plan body.
  - Blind spot: This review did not re-run the journal checks in a browser.
- **Fix B**: Rewrite the phase 1 contract, the not-doing list, and the manual rows to describe per-field bubbles, keystroke validation, and the 3-second reveal.
  - Strength: Keeps the UI already committed in `763878f`.
  - Tradeoff: Accepts hidden-after-blur errors, wrapped text in the column, and more than one measurement message, which the plan and issue 99 currently exclude. The bubble would still need a visibility decision before the manual checks can pass.
  - Confidence: MEDIUM — the commit message says the replacement was intentional, and the plan text was not updated to match.
  - Blind spot: Whether the bubble behavior is a product change to keep is undecided.
- **Decision**: Fixed via Fix B

### F2 — Negative measurements use a new sentence

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/measurement-input.ts:78
- **Detail**: The plan says not to change the measurement sentences. A leading minus used to fall through to the decimal sentence. HEAD adds a `negative` reason and returns `${label} cannot be negative`. `measurement-input.test.ts:286` locks that sentence in. The same schema is what create and update parse, so the API returns the new sentence too.
- **Fix**: Remove the negative branch so a leading minus keeps the existing decimal sentence.
- **Decision**: Fixed differently — kept `${label} cannot be negative` and recorded it in the plan contract, the helper tests, and the not-doing list.

### F3 — Phase 1 manual rows are checked against the bubble commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/some-display-changes/plan.md:212
- **Detail**: Rows 1.5–1.10 are `[x]` with SHA `763878f`. That commit replaces the shared line with bubbles, validates while typing, and reveals remaining errors for 3 seconds. The row titles still require a one-line gap, a single Weight message, and the same band on edit. Rows 1.6, 1.7, and 1.9 are not met. Row 1.5 is only half met: an untouched form starts with an empty error map, and there is no reserved line. Row 1.8 is met: Date and Note still render through `FieldError` on Add. Row 1.10 is met for the save block: `handleSubmit` still `preventDefault`s when the full schema fails. Automated checks were re-run in this review and passed: `npm test` (111 tests), `npm run lint`, `npm run check:home-tokens`, and `npx astro check` (0 errors). Phase 2 manual rows match the button class contract in the diff.
- **Fix**: Mark Progress rows 1.5, 1.6, 1.7, and 1.9 pending until the form matches those titles.
- **Decision**: Fixed differently — retitled Progress rows 1.5–1.10 to the bubble checks and left them checked. Row 1.8 was already the Date and Note check.

## Verification

| Command | Result |
|---------|--------|
| `npm test` | Pass — 9 files, 111 tests |
| `npm run lint` | Pass |
| `npm run check:home-tokens` | Pass — clean |
| `npx astro check` | Pass — 0 errors, 0 warnings, 0 hints |
