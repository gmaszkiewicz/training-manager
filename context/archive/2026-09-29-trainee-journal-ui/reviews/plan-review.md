<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Trainee journal visual contract

- **Plan**: `context/changes/trainee-journal-ui/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-29
- **Verdict**: SOUND (after triage fixes)
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING (F2 — addressed) |
| Plan Completeness | WARNING (F1, F3 — addressed) |

## Grounding

Grounding: 5/5 paths ✓, 4/4 symbols ✓, brief↔plan ✓

## Findings

### F1 — FormField `name` when `idPrefix` prefixes ids

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — MeasurementForm contract
- **Detail**: `FormField` defaults `name` to `id`; prefixed ids without explicit `name={field.field}` would break POST field names.
- **Fix**: Require explicit `name={field.field}` on every `FormField` in Phase 3 contract.
- **Decision**: FIXED

### F2 — React islands in Astro without `client:` on TraineeJournal

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 — TraineeJournal shell
- **Detail**: No repo precedent for `Button` in `.astro` without `client:load`; SSR expected to work.
- **Fix A ⭐ Recommended**: Keep SSR-only; add Critical Details note and expanded Phase 3 manual checks for Sign out POST and load-failure `ServerError`.
- **Decision**: FIXED via Fix A

### F3 — Kitchen sink Error section references private `FieldError`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 4 — Error section
- **Detail**: `FieldError` is not exported from `MeasurementForm.tsx`.
- **Fix**: Use `FormField` with sink-scoped id (AuthSinkStates pattern).
- **Decision**: FIXED

### F4 — Static `MeasurementWithDeltas` fixture for Default sink

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Completeness
- **Location**: Phase 4 — Default section
- **Detail**: Fixture location unspecified.
- **Fix**: Inline const in `journal.astro` frontmatter using `measurementFields`.
- **Decision**: FIXED

### F5 — `npm run smoke` not listed after view change

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Blind Spots
- **Location**: Testing Strategy / Phase 3
- **Detail**: CI smoke exercises `/dashboard` flows.
- **Fix**: Phase 3 automated criterion for `npm run smoke` with running server.
- **Decision**: FIXED
