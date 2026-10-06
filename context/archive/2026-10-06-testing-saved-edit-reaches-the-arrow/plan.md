# Saved Edit Reaches the Arrow Implementation Plan

## Overview

Prove one persisted weight edit changes the listed difference. Smoke posts `81.0` on the existing `2026-01-02` row, then the next journal read lists `↑ 1.0` and no longer lists `↓ 1.5`. The comparison-rule unit stays as it is. The cookbook then records that smoke step.

## Current State Analysis

Smoke creates `2026-01-01` / `80.0`, then `2026-01-02` / `78.5` with `smoke-earlier-trainee-note`, and the following `GET /measurements` expects `↓ 1.5` (`scripts/smoke.mjs:243-257`). The next step signs that trainee out (`scripts/smoke.mjs:258`). No step follows a successful edit with a new difference string.

A successful `POST /api/measurements/[id]` writes `weight_kg` and a new `created_at`, then redirects to `/measurements` (`src/pages/api/measurements/[id].ts:34-58`, `src/lib/services/measurements.ts:77-94`). The next list runs `withDeltas`. `formatDelta` is one text node: `↑ N.N`, `↓ N.N`, or `0.0` (`src/lib/measurement-deltas.ts:60-68`, `src/components/measurements/MeasurementList.astro:71-76`). On this pair the dates differ, so the `created_at` rewrite does not change which row is previous. `81.0` against the untouched `80.0` row is `↑ 1.0`. If the write leaves `78.5` stored, the list still contains `↓ 1.5`.

The unit case that saves weight 81 builds the rows in memory (`src/lib/measurement-deltas.test.ts:218-242`). Risk #1 already says that case does not count for this slice. §6.4 still says the saved-edit pattern is TBD (`context/foundation/test-plan.md:154`). The saved-edit gate is `planned until Phase 5 lands` (`context/foundation/test-plan.md:119`).

## Desired End State

While the first trainee is still signed in, and after `measurementId` is set, smoke posts `measurementForm("2026-01-02", "81.0", earlierNote)` to `/api/measurements/${measurementId}`. The response is 302 with location exactly `/measurements`. The following `GET /measurements` is 200, contains `↑ 1.0`, and does not contain `↓ 1.5`. Later rejected writes and the final journal check still find that row by the same note and id. §6.4, §6.5, §4, and §5 describe this smoke step. `src/lib/measurement-deltas.test.ts` is unchanged.

### Key Discoveries:

- The `↓ 1.5` GET is what stores `measurementId`, by finding `?edit=` in the `<li>` that contains `earlierNote` (`scripts/smoke.mjs:253-256`). The edit has to use that id.
- `measurementForm` sends all seven circumferences as `"50.0"` (`scripts/smoke.mjs:35-47`). Those circumference deltas render as `0.0`, so `0.0` cannot prove the saved weight. `↑ 1.0` and `↓ 1.5` are the weight strings on this pair.
- The runner treats `location` as a prefix unless `exactLocation` is set (`scripts/smoke.mjs:487-489`). A failed update redirects to `/measurements?edit=<id>&error=...`, which starts with `/measurements`.
- Body checks are global `includes` / `forbid` (`scripts/smoke.mjs:491-498`). The final primary-trainee GET expects `Add measurement` and `earlierNote`. It does not expect `↓ 1.5` (`scripts/smoke.mjs:475-479`).

## What We're NOT Doing

- A new unit case, or any edit to `src/lib/measurement-deltas.test.ts`.
- Importing or calling `withDeltas` from `scripts/smoke.mjs`.
- A Playwright spec, or a browser check of the arrow.
- A same-date note-only save, a delete, or a date change in this smoke step. The Phase 1 unit already locks those rows.
- Posting weight `80.0`, or any edit whose listed difference is `0.0`.
- Changing `measured_on` or `earlierNote` on this row.
- Asserting the accessible name `up` in place of the `↑ 1.0` text node.
- Changing the edit route, `updateMeasurement`, `withDeltas`, or `MeasurementList.astro`.
- Rewriting §1, §2, §3, or §8 of `context/foundation/test-plan.md`.

## Implementation Approach

Extend `scripts/smoke.mjs` with two steps on the first trainee, immediately after `measurements shows the weight delta` and before `signout clears session`. The POST is the save. The following GET is the proof the listed difference comes from `81.0`. Leave the comparison-rule unit untouched. The cookbook phase then replaces the §6.4 placeholder, notes the shipment in §6.5, and marks the saved-edit gate required.

## Critical Implementation Details

- **State sequencing** — Insert the pair after the GET that both expects `↓ 1.5` and sets `measurementId`, and before `signout clears session`. The first trainee's cookie is still in the jar only in that window. Set `exactLocation: true` on the POST. Without it, an error redirect that starts with `/measurements` satisfies the location check.

## Phase 1: Saved weight lists ↑ 1.0

### Overview

Add the persisted-edit proof to smoke.

- **Behavior asserted:** editing the `2026-01-02` row from `78.5` to `81.0`, with the date and note left as they are, redirects to exact `/measurements`, and the next list contains `↑ 1.0` and excludes `↓ 1.5`.
- **Regression caught:** the list still shows the pre-edit difference after a successful weight save.
- **Research source:** `context/changes/testing-saved-edit-reaches-the-arrow/research.md` section "The smoke edit that shows the saved weight".
- **Edge / error / boundary:** `81.0` is inside 20–400 and uses one decimal. The two dates stay different, so the `created_at` rewrite does not change the previous row. `0.0` is already on the page for unchanged circumferences.
- **Anti-pattern avoided:** a new in-memory unit; a smoke call to `withDeltas`; Playwright; weight `80.0`; a same-date reorder.

### Changes Required:

#### 1. Smoke script

**File**: `scripts/smoke.mjs`

**Intent**: Post one weight edit while the first trainee is still signed in, then read the journal. The list read is what shows the saved weight reached the arrow. The exact redirect shows the update succeeded.

**Contract**: Insert two steps after `measurements shows the weight delta` and before `signout clears session`. Call `measurementForm("2026-01-02", "81.0", earlierNote)` and POST it to `/api/measurements/${measurementId}`.

1. Expect status 302, location `/measurements`, and `exactLocation: true`.
2. GET `/measurements`. Expect status 200, body `↑ 1.0`, and `forbid` set to `↓ 1.5`.

Leave the earlier create steps and the `↓ 1.5` expectation where they are. Do not edit `src/lib/measurement-deltas.test.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` exits 0
- The edit POST uses weight `81.0`, date `2026-01-02`, and note `smoke-earlier-trainee-note`, and expects 302 with exact location `/measurements`
- The following GET expects 200, body `↑ 1.0`, and forbids `↓ 1.5`

#### Manual Verification:

- Those two steps sit after `measurements shows the weight delta` and before `signout clears session`
- `src/lib/measurement-deltas.test.ts` is unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Cookbook

### Overview

Record the smoke pattern, and mark the saved-edit gate required.

### Changes Required:

#### 1. Test plan cookbook, stack note, and gate row

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the §6.4 placeholder so the next saved-weight check extends this smoke script. Note in §6.5 that this phase shipped. Point the §4 smoke note and the §5 saved-edit gate at that script.

**Contract**: Replace the §6.4 bullet `A saved weight edit on the list: TBD — see §3 Phase 5.` The pattern is `scripts/smoke.mjs`, run with `npm run smoke`. After `measurements shows the weight delta` and before sign-out, POST `/api/measurements/${measurementId}` with `measurementForm("2026-01-02", "81.0", earlierNote)`, expect 302 and exact location `/measurements`, then GET `/measurements` expecting `↑ 1.0` and forbidding `↓ 1.5`. The comparison-rule unit stays. A new in-memory unit, a `withDeltas` call from smoke, Playwright, a same-date note-only save, and weight `80.0` are not part of this pattern. §6.5 records that rollout phase 5 shipped those two steps, that the existing comparison-rule unit was left in place, that no new Vitest case was added, that smoke does not call `withDeltas`, and that no Playwright check was added, with `Checked` set to the UTC date of the cookbook commit. In §4, the smoke row notes that Phase 5 adds this edit. In §5, the saved-edit gate's Required cell becomes `required`. Do not edit §1, §2, §3, or §8.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- `scripts/smoke.mjs` still places the `81.0` edit after `measurements shows the weight delta` and before `signout clears session`, and the following GET expects `↑ 1.0` and forbids `↓ 1.5`

#### Manual Verification:

- §6.4 names the smoke pattern: edit `2026-01-02` to weight `81.0`, exact `/measurements` redirect, then a list that contains `↑ 1.0` and excludes `↓ 1.5`
- §6.5 records the shipped steps, the existing comparison-rule unit left in place, no new in-memory unit, no `withDeltas` call from smoke, and no Playwright
- §4 names the saved-weight edit on `scripts/smoke.mjs`, and the §5 saved-edit gate is `required`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new Vitest case. `npm test` stays green because this change does not edit the comparison rule. The in-memory saved-81 case remains where it is.

### Integration Tests:

- `npm run smoke` is the persisted-edit proof. It needs the same running app and local Supabase the CI smoke job uses. `BASE_URL` defaults to `http://localhost:4321`.

### Manual Testing Steps:

1. Read the new smoke expectations against this plan: weight `81.0`, date `2026-01-02`, note `smoke-earlier-trainee-note`, exact location `/measurements`, body `↑ 1.0`, and `forbid` equal to `↓ 1.5`.
2. Confirm those steps sit after `measurements shows the weight delta` and before `signout clears session`.
3. Confirm §6.4, §6.5, §4, and §5 match phase 2, and that `src/lib/measurement-deltas.test.ts` is unchanged.

## Performance Considerations

The script gains two requests on the existing first trainee. That stays inside the sequential smoke run. No application change and no new latency budget.

## Migration Notes

No schema, migration, or data backfill. The arrow stays computed at list time. The table does not gain a stored delta.

## References

- Rollout guide: `context/foundation/test-plan.md` §2 risk #1, §3 phase 5, §4, §5, §6.4
- Research: `context/changes/testing-saved-edit-reaches-the-arrow/research.md`
- Prior smoke cookbook: `context/archive/2026-10-04-testing-reject-illegal-measurements/plan.md`
- Edit redirect: `src/pages/api/measurements/[id].ts:34-58`
- Update writes weight and `created_at`: `src/lib/services/measurements.ts:77-94`
- Arrow string: `src/lib/measurement-deltas.ts:60-68`, `src/components/measurements/MeasurementList.astro:71-76`
- In-memory saved 81: `src/lib/measurement-deltas.test.ts:218-242`
- Smoke insertion point: `scripts/smoke.mjs:243-258`
- Location prefix rule: `scripts/smoke.mjs:487-489`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Saved weight lists ↑ 1.0

#### Automated

- [x] 1.1 `npm run smoke` exits 0 — 74aaeea
- [x] 1.2 The edit POST uses weight `81.0`, date `2026-01-02`, and note `smoke-earlier-trainee-note`, and expects 302 with exact location `/measurements` — 74aaeea
- [x] 1.3 The following GET expects 200, body `↑ 1.0`, and forbids `↓ 1.5` — 74aaeea

#### Manual

- [x] 1.4 Those two steps sit after `measurements shows the weight delta` and before `signout clears session` — 74aaeea
- [x] 1.5 `src/lib/measurement-deltas.test.ts` is unchanged — 74aaeea

### Phase 2: Cookbook

#### Automated

- [x] 2.1 `npm test` exits 0 — 2092fb7
- [x] 2.2 `scripts/smoke.mjs` still places the `81.0` edit after `measurements shows the weight delta` and before `signout clears session`, and the following GET expects `↑ 1.0` and forbids `↓ 1.5` — 2092fb7

#### Manual

- [x] 2.3 §6.4 names the smoke pattern: edit `2026-01-02` to weight `81.0`, exact `/measurements` redirect, then a list that contains `↑ 1.0` and excludes `↓ 1.5` — 2092fb7
- [x] 2.4 §6.5 records the shipped steps, the existing comparison-rule unit left in place, no new in-memory unit, no `withDeltas` call from smoke, and no Playwright — 2092fb7
- [x] 2.5 §4 names the saved-weight edit on `scripts/smoke.mjs`, and the §5 saved-edit gate is `required` — 2092fb7
