<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Trainee measurement delta

- **Plan**: `context/changes/trainee-measurement-delta/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-28
- **Verdict**: SOUND
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | PASS |
| Plan Completeness | WARNING |

## Grounding
7/7 paths ✓, 4/4 symbols ✓, brief↔plan ✓, Progress 25/25 ✓. `createServerClient<Database>` returns `SupabaseClient<Database, "public">` (`@supabase/ssr` 0.12), so typing `createClient` is compatible with its 5 callers.

## Findings

### F1 — Generated Supabase types will fail lint

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 1, change 2 (generated database types)
- **Detail**: `stylisticTypeChecked` enables `consistent-type-definitions` and `consistent-indexed-object-style`; `supabase gen types` writes `type Database = {…}` and an index-signature `Json`, so `npm run lint` (1.1) would fail. Prettier fixes formatting only.
- **Fix**: Add `src/db/database.types.ts` to the ignores in `eslint.config.js` and note that the file is generated and not linted.
- **Decision**: FIXED

### F2 — The CI test criterion can't pass on a plain branch push

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2, manual criterion 2.4
- **Detail**: `.github/workflows/ci.yml` runs only on pushes and pull requests to `main`, so a branch push starts no workflow.
- **Fix**: Reword 2.4 to "on the pull request to `main`" in both the phase block and Progress.
- **Decision**: FIXED

### F3 — MeasurementEntry repeats the generated row type

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 2, change 1 (`src/types.ts`)
- **Detail**: Phase 1 makes generated types the single source of truth (follow-up F5); a hand-written `MeasurementEntry` would drift when S-05/S-06 change the table.
- **Fix**: `MeasurementEntry = Omit<Database["public"]["Tables"]["measurements"]["Row"], "trainee_id">`.
- **Decision**: FIXED

### F4 — Wrong reason given for skipping the database future-date check

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: What We're NOT Doing
- **Detail**: Postgres accepts `current_date` in a CHECK; the real reasons are that it is evaluated only on write and that its UTC "today" contradicts the +1 day tolerance.
- **Fix**: Reword the bullet; the decision is unchanged.
- **Decision**: FIXED

### F5 — The smoke check for `↓ 1.5` depends on markup

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3, changes 4–5
- **Detail**: If the arrow and number render in separate elements, the HTML no longer contains `↓ 1.5` and smoke fails even though the feature works.
- **Fix**: Require `formatDelta` output to render as one text node.
- **Decision**: FIXED
