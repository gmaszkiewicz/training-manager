<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Inline measurement errors and clearer button states

- **Plan**: context/changes/some-display-changes/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-16
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Findings

### F1 — Version footer and library dialog are outside the plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: src/components/Footer.astro:13
- **Detail**: `e54b149` adds a footer on every layout page, and `0e5930e` turns "TM (v.0.0.1)" into a dialog titled "training-manager" that lists Dependencies and Dev dependencies from `package.json`. `Layout.astro` renders it, and auth, kitchen-sink, measurements, profile, and the home welcome page change their page height classes to make room. The plan does not mention a footer. The classes use the same tokens as the top bar (`border-border`, `bg-card`, `text-muted-foreground`). Versions are read from `package.json` at build time. The planned measurement bubbles, button contrast, duplicate-date bubble, note counter, and one-minute check still match the plan.
- **Fix A ⭐ Recommended**: Record the version footer and the library dialog in the plan.
  - Strength: Keeps the footer already committed in `e54b149` and `0e5930e`. It uses existing tokens and does not fetch remote versions.
  - Tradeoff: This change's scope grows from the measurements journal to every page.
  - Confidence: HIGH — the commits name the footer, and `Layout.astro` is the only mount.
  - Blind spot: Whether the footer belongs in S-30 or a separate change is undecided.
- **Fix B**: Remove the footer, the dialog, and the page-height edits, and add them as follow-up work.
  - Strength: Keeps this change to the journal errors and button states the plan describes.
  - Tradeoff: Drops a footer that is already on every page.
  - Confidence: MEDIUM — nothing in the measurement form depends on the footer, but the layout padding edits would need to be reverted with it.
  - Blind spot: None significant.
- **Decision**: Fixed via Fix A

### F2 — The current-minute limit is only in the form

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/MeasurementForm.tsx:93
- **Detail**: `8e7a547` stops the calendar and the clock at the browser's current minute and, on Add, sets `Date and time must not be later than now` through `FieldError`. The schema still rejects only a calendar date after UTC tomorrow (`src/lib/measurement-input.ts:187`, "Date must not be later than one day from today"). Create and update parse with that schema and then insert. A direct POST can still save a later minute today or any time tomorrow. The form's ceiling is the browser's local minute. The stored `measured_on` is a timestamp without time zone.
- **Fix A ⭐ Recommended**: Reject a minute later than now inside `measuredOn()`, using the same naive timestamp the form submits, so create and update enforce it.
  - Strength: A skipped form can no longer store a time the calendar refuses.
  - Tradeoff: The server clock and the browser clock can disagree, so a minute the form allows can still be rejected, or the reverse, around midnight and across time zones.
  - Confidence: MEDIUM — the form compares local minute strings, and the schema currently compares a UTC date.
  - Blind spot: The server's timezone versus the browser's local minute has not been checked against a real save.
- **Fix B**: Record the current-minute stop as a client-only calendar limit and leave the API at one day from today.
  - Strength: Avoids a server check that can disagree with the browser minute.
  - Tradeoff: A direct POST can still save a future minute the form will not offer.
  - Confidence: HIGH — that is what the code does now.
  - Blind spot: None significant.
- **Decision**: Fixed via Fix A

### F3 — Lint fails on formatting

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/components/Footer.astro:13
- **Detail**: `npm run lint` reports 15 Prettier errors, all auto-fixable: the footer class and dialog markup in `src/components/Footer.astro`, and the future-date message ternary in `src/components/measurements/MeasurementForm.tsx:717`. `npm test` passed (114 tests). `npm run check:home-tokens` passed. `npx astro check` passed with 0 errors. Phase 1 and phase 2 manual rows are checked. The bubble and button rows match the code. The footer and the current-minute limit have no Progress rows.
- **Fix**: Run `eslint --fix` on `src/components/Footer.astro` and `src/components/measurements/MeasurementForm.tsx`.
- **Decision**: Fixed via Fix now

## Verification

| Command | Result |
|---------|--------|
| `npm test` | Pass — 9 files, 114 tests |
| `npm run lint` | Fail — 15 Prettier errors in `Footer.astro` and `MeasurementForm.tsx` |
| `npm run check:home-tokens` | Pass — clean |
| `npx astro check` | Pass — 0 errors, 0 warnings, 0 hints |
