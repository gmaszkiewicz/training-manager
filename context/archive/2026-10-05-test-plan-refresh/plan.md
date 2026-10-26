# Test Plan Refresh Implementation Plan

## Overview

Rewrite `context/foundation/test-plan.md` so the next unprotected risks are a migration that runs after measurement rows exist, and a saved weight edit that the list shows. This change updates the guide. It does not add those tests.

## Current State Analysis

The guide was last updated 2026-10-04. Rollout phases 1–3 are `complete`. Risks #1–#5 stay in place. Section 4 says the manifest has no Playwright (`context/foundation/test-plan.md:89`). Section 7 excludes kitchen-sink screens, visual restyles, and a new browser suite.

Research on this branch found seven migration files and no `UPDATE`, `DELETE FROM`, `TRUNCATE`, or `DROP TABLE` in them. Hosted apply is `npx supabase db push` when `WORKERS_CI_BRANCH` is `main` (`scripts/workers-build.mjs:13-19`). That command checks its exit code. `supabase start` in CI applies those files before any measurement row exists (`.github/workflows/ci.yml:43`). The unit case that mentions a saved weight of 81 builds the row in memory (`src/lib/measurement-deltas.test.ts:218-232`). Smoke expects `↓ 1.5` after two creates (`scripts/smoke.mjs:244-256`). `package.json:47` depends on `@playwright/test` `^1.63.0`. The CI jobs `ci` and `smoke` do not run it.

## Desired End State

A reader of the guide sees risks #1–#5 unchanged in number, risk #6 appended, and phases 4 and 5 `not started`. Risk #6 is proved by inserting a known row, applying the migration under test, and selecting its numbers, count, and owner. Risk #1 still uses the comparison-rule unit and also names one smoke edit of a saved weight. Section 4 records Playwright 1.63.0 for the signed-out seed. Section 7 still excludes kitchen-sink screens and visual restyles, and limits browsers to no suite beyond that seed.

Verify by reading sections 1–8 against the success criteria below. The product suite is unchanged.

### Key Discoveries:

- `scripts/workers-build.mjs:13-19` pushes migrations on `main` and checks the process exit code.
- `src/lib/services/measurements.ts:20-21` selects measurement columns and omits `trainee_id`, so journal HTML cannot prove ownership.
- `src/lib/services/measurements.ts:77-94` writes `weight_kg` and a new `created_at` on edit. `src/lib/services/measurements.ts:34` then runs `withDeltas` on the selected rows.
- `supabase/config.toml:70` points the reset seed at `./seed.sql`. That file is absent. This change does not resolve that.

## What We're NOT Doing

- Adding the local Supabase migration check or the smoke edit. Those are rollout phases 4 and 5, left `not started`.
- Naming the SQL client that will read `trainee_id`. The later phase 4 change does that.
- Opening change folders for phases 4 and 5, or pointing their Change folder cells at `context/changes/test-plan-refresh/`.
- Renumbering risks #1–#5, or reopening phases 1–3.
- Adding a Playwright job to CI, or a second phase for the signed-out seed.
- Filling cookbook patterns for phases 4 and 5 with a shipped test. Those stay pointers until the phases ship.
- Editing `scripts/smoke.mjs`, migration SQL, or Vitest files.

## Implementation Approach

Edit `context/foundation/test-plan.md` in two passes so the orchestrator section and the stack section do not disagree. Phase 1 writes the risk map and the rollout rows. Phase 2 writes the stack, the gates, the cookbook pointers, the exclusions, and the dates. Research anchors stay in `research.md`. The guide's risk section states scenarios and evidence.

## Critical Implementation Details

Section 2's Source column and its response-guidance cells take evidence (interview, PRD, roadmap, hot-spot directories with counts, the documented migration rule). They do not take `file:line`, function names, or module names. Section 3 status words are the parser literals. Phases 4 and 5 use `not started` and change folder `—`. Do not mark them `change opened`.

## Phase 1: Risk map and rollout

### Overview

Refresh the hot-spot counts, append risk #6 with the insert-then-apply proof, adjust risk #1 so one smoke edit sits beside the unit, and add rollout phases 4 and 5 as not started. Phases 1–3 stay complete.

### Changes Required:

#### 1. Strategy and risk map

**File**: `context/foundation/test-plan.md`

**Intent**: Section 1 records the 2026-10-05 hot-spot window: `src`, `scripts`, `supabase`, 51 commits in 30 days. The next checks named in that section are a migration applied onto existing measurement rows, then one saved weight edit. Kitchen-sink churn stays out of scope. Section 2 keeps risks #1–#5. Risk #1's source count for `src/lib` becomes 17 commits in 30 days. `src/components/measurements` stays 10. Risk #1's response keeps the comparison-rule unit and adds one smoke edit whose listed difference comes from the saved weight. The challenge is that hand-built rows prove the edit route wrote that weight. A request that only repeats the pure comparison stays an anti-pattern, as does a new unit that builds the edited row in memory, and Playwright for this write.

**Contract**: Append risk #6. Impact High. Likelihood High. The scenario is a migration that applies on a database that already has measurement rows and then changes their numbers, drops rows, or leaves them owned by the wrong trainee. Source is interview Q2 and Q4, the documented rule that migrations reach hosted Supabase before the new Worker and stay backward compatible, and hot-spot `supabase/migrations` (7 commits/30d). The response proof is: insert one known row (numbers and owning trainee), apply the migration under test, then select the numeric columns, the row count, and the owning trainee. Expected values come from the insert. The challenges are: a successful `db push` means the rows survived; an empty database stands in for a hosted database that already has rows; the migration SQL is the expected value. The cheapest layer is a local Supabase check with that sequence. Anti-patterns are diffing migration files against themselves, testing only an empty database, a browser tour, and copying an `UPDATE` from the migration into the assertion. The signed-out journal visit stays off the map and is named as the S-19 seed. Header `Last updated` stays on the phase 2 date bump.

#### 2. Rollout rows

**File**: `context/foundation/test-plan.md`

**Intent**: Section 3 gains two rows so the next `/10x-test-plan` opens phase 4 first.

**Contract**: Leave rows 1–3 `complete` with their current change folders. Add row 4, "Hosted migration preserves measurements", goal "Prove a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied", risks `#6`, test type "local Supabase check", status `not started`, change folder `—`. Add row 5, "Saved edit reaches the arrow", goal "Prove one persisted weight edit changes the listed difference", risks `#1`, test type "one smoke edit", status `not started`, change folder `—`.

### Success Criteria:

#### Automated Verification:

- Section 3 keeps phases 1–3 at `complete` and adds phases 4 and 5 at `not started` with change folder `—`
- Section 2 keeps risks #1–#5, appends risk #6, and cites no file:line anchor

#### Manual Verification:

- Risk #6 proof reads: insert a known measurement row, apply the migration under test, then select its numbers, count, and owning trainee
- Risk #1 response keeps the comparison-rule unit and adds one smoke edit of a saved weight

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Stack, gates, and exclusions

### Overview

Record the browser runner that already exists, point the cookbook at the two new phases without filling them in, narrow the browser exclusion, and bump the freshness dates.

### Changes Required:

#### 1. Stack and gates

**File**: `context/foundation/test-plan.md`

**Intent**: Section 4 matches the manifest and the CI workflow. Section 5 keeps today's required gates and marks the two new checks as planned until their phases land.

**Contract**: The test-base line stays sparse: Vitest, four product test files under `src/lib`, plus one end-to-end seed. The e2e row names Playwright Test 1.63.0 as the local browser layer for the signed-out seed S-19 owns. The CI `e2e` job runs `npx playwright test`. Do not add a Playwright job for risks #1–#6. The grounding note, checked 2026-10-05, records Context7 on `/microsoft/playwright` v1.63.0 for `webServer` and `storageState`, WebSearch available and unused, cursor-ide-browser available and unused as a test layer, and no Supabase or Cloudflare docs MCP. The API-mocking row records that phase 2 shipped without a mock library. Section 5 keeps lint, `astro check`, the home token check, Vitest, and smoke as required. The phase 4 migration check and the phase 5 saved-edit step are planned until those phases land. No Playwright gate row.

#### 2. Cookbook, exclusions, and dates

**File**: `context/foundation/test-plan.md`

**Intent**: Future authors can see where a migration check and a saved-edit check will go, and what this refresh still refuses to spend budget on.

**Contract**: Leave sections 6.1–6.3 and 6.5 as they are. In section 6.4, add two pointers: a migration that runs after rows exist is TBD, see section 3 phase 4; a saved weight edit on the list is TBD, see section 3 phase 5. Section 7 keeps the kitchen-sink and visual-restyle exclusion (hot-spot `src/pages/kitchen-sink`, 12 commits/30d). The browser exclusion becomes: no broad browser or screenshot suite beyond the signed-out seed. Re-evaluate if a failure can only be seen in a rendered page and no unit or request result exposes it. Set the header `Last updated` and all three section 8 dates to 2026-10-05.

### Success Criteria:

#### Automated Verification:

- Section 4 names Playwright 1.63.0, records the grounding note checked 2026-10-05, and does not say the manifest has no Playwright
- The header Last updated line and section 8 dates are 2026-10-05

#### Manual Verification:

- Section 7 keeps kitchen-sink screens and visual restyles excluded, and limits browsers to no suite beyond the signed-out seed
- Section 6 points phases 4 and 5 at TBD and does not record a shipped migration check or saved-edit step
- Section 5 keeps the existing required gates and marks the phase 4 migration check and the phase 5 saved-edit step as planned until those phases land

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new Vitest file. The comparison-rule unit stays as phase 1 of the rollout already shipped it.

### Integration Tests:

- No new smoke step and no new migration check in this change.

### Manual Testing Steps:

1. Read section 2 and confirm risk #6's proof is insert, apply the migration under test, select.
2. Read section 3 and confirm phases 1–3 are complete and phases 4 and 5 are not started.
3. Read sections 4, 5, 6, and 7 and confirm Playwright is recorded, CI gains no Playwright job, and the new cookbook lines are TBD pointers.

## Performance Considerations

The guide edit does not change request latency, bundle size, or the migration apply path.

## Migration Notes

This change does not add or edit a SQL migration. Hosted apply stays `supabase db push` on a `main` Workers build before the new Worker. Rollout phases 1–3 stay `complete`.

## References

- Related research: `context/changes/test-plan-refresh/research.md`
- Accepted refresh notes: `context/changes/test-plan-refresh/change.md`
- Guide being edited: `context/foundation/test-plan.md`
- Schema: `.cursor/skills/10x-test-plan/references/test-plan-schema.md`
- Similar wording: `context/foundation/test-plan.md:52-60` (existing response-guidance rows)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Risk map and rollout

#### Automated

- [x] 1.1 Section 3 keeps phases 1–3 at `complete` and adds phases 4 and 5 at `not started` with change folder `—` — 9c5cac4
- [x] 1.2 Section 2 keeps risks #1–#5, appends risk #6, and cites no file:line anchor — 9c5cac4

#### Manual

- [x] 1.3 Risk #6 proof reads: insert a known measurement row, apply the migration under test, then select its numbers, count, and owning trainee — 9c5cac4
- [x] 1.4 Risk #1 response keeps the comparison-rule unit and adds one smoke edit of a saved weight — 9c5cac4

### Phase 2: Stack, gates, and exclusions

#### Automated

- [x] 2.1 Section 4 names Playwright 1.63.0, records the grounding note checked 2026-10-05, and does not say the manifest has no Playwright — 3c33147
- [x] 2.2 The header Last updated line and section 8 dates are 2026-10-05 — 3c33147

#### Manual

- [x] 2.3 Section 7 keeps kitchen-sink screens and visual restyles excluded, and limits browsers to no suite beyond the signed-out seed — 3c33147
- [x] 2.4 Section 6 points phases 4 and 5 at TBD and does not record a shipped migration check or saved-edit step — 3c33147
- [x] 2.5 Section 5 keeps the existing required gates and marks the phase 4 migration check and the phase 5 saved-edit step as planned until those phases land — 3c33147
