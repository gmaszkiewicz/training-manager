# Delta After Edit and Delete Implementation Plan

## Overview

Add unit cases for the comparison chain after an edit or a delete. The expected arrows come from the signed edit and delete plans. The same cases are the arrows a linked trainer sees, because both screens run that one comparison on the rows they loaded.

## Current State Analysis

`withDeltas` sorts by `measured_on`, then `created_at`, then `id`, compares each later row with the one immediately before it, and sets `deltas: null` on the first row in that order. The list is returned newest first. `formatDelta` prints `↑`, `↓`, or `0.0`. Edit and delete do not store a delta. The next list passes the saved rows through `withDeltas`. The trainee journal and the linked-trainer preview each do that on their own request.

`src/lib/measurement-deltas.test.ts` already covers an empty list, one entry with null deltas, a 1.5 kg decrease, a 0.2 increase, equal weight as `0.0`, newest-first order, a backfilled date, same-date order by `created_at`, and an id tie. It does not use the signed edit chain or the signed delete chain. The helper sets `note: null`.

Research on commit `0ce889d` closed the thin-integration gate: a saved edit, a delete, and the trainer preview do not keep a second comparison.

### Key Discoveries:

- Sort, predecessor, and null delta on the oldest sorted row: `src/lib/measurement-deltas.ts:3-58`. Zero tenths become `direction: "none"` at `src/lib/measurement-deltas.ts:25-33`. `none` formats as `0.0` at `src/lib/measurement-deltas.ts:60-68`.
- The existing file calls `withDeltas` and `formatDelta` directly and builds rows with `entry()` (`src/lib/measurement-deltas.test.ts:6-20`).
- Signed edit oracle: `context/archive/2026-10-02-edit-measurement-entry/plan.md:19` and the checks at lines 161–162 and 185–187. Signed delete oracle: `context/archive/2026-10-02-delete-measurement-entry/plan.md:19` and the check at line 156.
- A save rewrites `created_at` even when the numbers stay put (`src/lib/services/measurements.ts:77-94`). Among rows that share `measured_on`, that row becomes the newest of that date. A later `measured_on` stays above it.

## Desired End State

`npm test` fails if an edited or remaining row compares with the wrong previous row, keeps a pre-edit weight, or shows a comparison on the oldest remaining row. A note-only save of a shared date is represented by a later timestamp and the same numbers, and the arrows follow that order. `context/foundation/test-plan.md` §6.1 tells the next author to add a unit case from the signed-plan arrows. The trainer preview is those same arrows.

### Key Discoveries:

- Post-write rows are the input. The test does not call `updateMeasurement` or `deleteMeasurement`.
- Display strings in the signed plans are `↑ 2.0`, `↑ 1.0`, `↓ 2.0`, and `↓ 1.0`. The existing tests store a whole-number gap as `difference: 1` or `difference: 2` and format it with one decimal place.
- Risk #4 is covered when those strings are asserted once. A second call would subtract again.

## What We're NOT Doing

- A request, route, or database test. Research showed the next list applies the same rule to the saved rows.
- A test that `updateMeasurement` writes `created_at`. The note-only case receives the row after that write.
- Changes to `withDeltas`, `formatDelta`, `scripts/smoke.mjs`, or the journal UI.
- A second `withDeltas` call, a `TrainerPanel` assertion, a screenshot, or a kitchen-sink case.
- Restating the empty list, the single entry, equal-weight `0.0`, the backfilled date, the generic same-date order, or the id tie.
- The page string `No measurements yet`. The empty list is already a unit case.
- Ownership, email linking, and illegal values. Those are rollout phases 2 and 3.
- An AI-native or browser check. A deterministic arrow already catches this regression. Checked 2026-10-04.

## Implementation Approach

Extend `src/lib/measurement-deltas.test.ts` with the signed edit chain, the signed delete chain, and one note-only same-date case. Pass each array in an order that is not already newest first, using the existing `entry()` helper. Assert `weight_kg` direction and difference, the `formatDelta` string from the signed plan, newest-first ids, and `deltas: null` on the oldest remaining row. Leave the other seven fields at the helper default and do not restate the eight-field object from the 1.5 kg test. The last phase writes the cookbook in §6.1 and a short note in §6.5.

## Critical Implementation Details

The expected arrows are the sentences in the signed edit and delete plans. Do not print `withDeltas` and paste the result into the test. For the value edit and the date move, the two `measured_on` values differ, so `created_at` is not what picks the previous row; change the weight or the date and leave the timestamp rule to the note-only case. In that case the saved row keeps `weight_kg: 80`, receives `created_at: "2026-01-01T18:00:00.000Z"` and a non-null note, and the 2026-01-08 row stays first. Whole-number gaps use `difference: 2` or `difference: 1`, matching the existing file, and the formatted string still has one decimal place (`↑ 2.0`).

## Phase 1: Signed edit chain

### Overview

Lock the signed edit examples: the starting pair, the saved weight 81, and the date moved to 2025-12-28.

### Changes Required:

#### 1. Edit-chain cases

**File**: `src/lib/measurement-deltas.test.ts`

**Intent**: A reader can see that an edited weight and an edited date change which remaining row is previous, using the arrows the signed edit plan already published.

**Contract**: Add cases that call `withDeltas` on post-edit rows built with `entry()`. Row A is `id: "a"`, `measured_on: "2026-01-01"`, `created_at: "2026-01-01T08:00:00.000Z"`, `weight_kg: 80`. Row B is `id: "b"`, `measured_on: "2026-01-08"`, `created_at: "2026-01-08T08:00:00.000Z"`, `weight_kg: 82`. Pass them with B before A.

- Starting pair, newest first `b`, `a`. B weight is `{ direction: "up", difference: 2 }` and `formatDelta` is `↑ 2.0`. A has `deltas: null`.
- Value edit: A `weight_kg` is 81, both dates unchanged. Newest first stays `b`, `a`. B weight is `{ direction: "up", difference: 1 }` and `formatDelta` is `↑ 1.0`. A has `deltas: null`. A's `measured_on` is still `2026-01-01`.
- Date move: B `measured_on` is `2025-12-28`, weights stay 80 and 82. Newest first is `a`, `b`. A weight is `{ direction: "down", difference: 2 }` and `formatDelta` is `↓ 2.0`. B has `deltas: null`.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- The edit cases expect `↑ 2.0` on the starting pair, `↑ 1.0` after A is 81, and `↓ 2.0` on A with null deltas on the 2025-12-28 row

#### Manual Verification:

- Those expected arrows match the signed edit plan, and they were not taken from a trial run of `withDeltas`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Signed delete chain

### Overview

Lock the signed three-date list, then the list after the middle row, the latest row, or the oldest row is removed.

### Changes Required:

#### 1. Delete-chain cases

**File**: `src/lib/measurement-deltas.test.ts`

**Intent**: Each remaining row compares with the previous row that is still in the array. Removing a row is the whole change.

**Contract**: Add cases on rows from the signed delete plan, passed in an order that is not newest first. A is `id: "a"`, `measured_on: "2026-01-01"`, `weight_kg: 80`. B is `id: "b"`, `measured_on: "2026-01-08"`, `weight_kg: 82`. C is `id: "c"`, `measured_on: "2026-01-15"`, `weight_kg: 81`. Give each a `created_at` on its own date so the date, not the timestamp, picks the order.

- Before a delete, newest first `c`, `b`, `a`. C weight is `{ direction: "down", difference: 1 }` and `formatDelta` is `↓ 1.0`. B weight is `{ direction: "up", difference: 2 }` and `formatDelta` is `↑ 2.0`. A has `deltas: null`.
- Without B: newest first `c`, `a`. C weight is `{ direction: "up", difference: 1 }` and `formatDelta` is `↑ 1.0`. A has `deltas: null`.
- Without C: newest first `b`, `a`. B weight is `{ direction: "up", difference: 2 }` and `formatDelta` is `↑ 2.0`. A has `deltas: null`.
- Without A: newest first `c`, `b`. C weight is `{ direction: "down", difference: 1 }` and `formatDelta` is `↓ 1.0`. B has `deltas: null`.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- The delete cases expect the before-delete arrows, `↑ 1.0` on C with A null after the middle row is removed, `↑ 2.0` on B with A null after the latest row is removed, and `↓ 1.0` on C with B null after the oldest row is removed

#### Manual Verification:

- Those expected arrows match the signed delete plan, and they were not taken from a trial run of `withDeltas`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Note-only same-date reorder

### Overview

Lock the signed rule that a save which leaves the numbers alone still rewrites the timestamp, so a shared date can change which row is previous. A later date stays above that pair.

### Changes Required:

#### 1. Note-only case

**File**: `src/lib/measurement-deltas.test.ts`

**Intent**: A note-only save is visible as a later `created_at` and the same weights. The arrows follow that order. The note text is stored on the row and is not what the arrow uses.

**Contract**: Add one before-and-after case. Pass the rows in an order that is not newest first.

- P: `id: "p"`, `measured_on: "2026-01-01"`, `created_at: "2026-01-01T08:00:00.000Z"`, `weight_kg: 80`, `note: null`
- R: `id: "r"`, `measured_on: "2026-01-01"`, `created_at: "2026-01-01T12:00:00.000Z"`, `weight_kg: 81`, `note: null`
- Q: `id: "q"`, `measured_on: "2026-01-08"`, `created_at: "2026-01-08T08:00:00.000Z"`, `weight_kg: 82`, `note: null`

Before the save, newest first is `q`, `r`, `p`. Q weight is `{ direction: "up", difference: 1 }` and `formatDelta` is `↑ 1.0`. R weight is `{ direction: "up", difference: 1 }` and `formatDelta` is `↑ 1.0`. P has `deltas: null`.

After the save, P keeps `weight_kg: 80` and `measured_on: "2026-01-01"`, and has `created_at: "2026-01-01T18:00:00.000Z"` and `note: "checked"`. R and Q are unchanged. Newest first is `q`, `p`, `r`. Q weight is `{ direction: "up", difference: 2 }` and `formatDelta` is `↑ 2.0`. P weight is `{ direction: "down", difference: 1 }` and `formatDelta` is `↓ 1.0`. R has `deltas: null`. The result weights are still 82, 80, and 81 on Q, P, and R. Q is still first.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- The note-only case expects Q `↑ 2.0` versus P, P `↓ 1.0` versus R, null deltas on R, Q still first, and the weights 82, 80, and 81 unchanged after the later timestamp

#### Manual Verification:

- The before-and-after arrows follow the signed timestamp rule and the tenths gaps of 80, 81, and 82, and the note text is not the source of the arrow

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Cookbook

### Overview

Record the pattern that phases 1–3 shipped, including the trainer rule and the decision to skip an AI-native check.

### Changes Required:

#### 1. Delta cookbook

**File**: `context/foundation/test-plan.md`

**Intent**: The next measurement-delta test starts from the signed-plan arrows and the post-write rows, and treats the trainer preview as that same result.

**Contract**: Replace the TBD pattern in §6.1. State that the test type is a unit case on `withDeltas` with post-edit and post-delete rows, run with `npm test`. The behavior is the wrong previous remaining row, a pre-edit value, a comparison on the oldest remaining row, a same-date note-only save that changes which row is previous, and a trainer preview that would disagree with that result. The pattern is: build the rows from the signed edit or delete plan, pass them in an order that is not newest first, expect that plan's `formatDelta` strings and null deltas on the oldest remaining row. A note-only shared date is a later `created_at` with the same numbers, and a later `measured_on` stays above that pair. The trainer preview is those assertions. Do not add a second subtraction, a screenshot, or a request test that only repeats this rule. A thin integration is not part of this pattern.

In §6.5, record that rollout phase 1 shipped these cases in `src/lib/measurement-deltas.test.ts`, that the existing `0.0`, backfilled-date, and id-tie cases were left in place, and that no AI-native check was added. Checked 2026-10-04.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0

#### Manual Verification:

- §6.1 names the unit pattern, the signed-plan arrows, the same-date timestamp case, and that the trainer preview uses those assertions
- §6.5 records that this rollout phase shipped those cases and that no AI-native check was added, checked 2026-10-04

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Edit chain: starting `↑ 2.0`, saved weight `↑ 1.0`, moved date `↓ 2.0` with null deltas on the oldest row.
- Delete chain: before-delete `↓ 1.0` and `↑ 2.0`, then middle, latest, and oldest removals.
- Note-only chain: later timestamp on the 80 kg same-date row, Q stays first, weights unchanged, note text ignored by the arrow.
- Each array is passed out of newest-first order.

### Integration Tests:

- None. A saved edit, a delete, and the trainer preview call the same comparison on the loaded rows.

### Manual Testing Steps:

1. Read the new expectations next to the signed edit plan sentences for 80.0, 81.0, and 2025-12-28.
2. Read the new expectations next to the signed delete plan sentences for removing B, C, and A.
3. Read the note-only expectations next to the signed rule that a save becomes the newest row of its date while a later date stays above it.
4. Read §6.1 and §6.5 and confirm they describe that unit pattern and the 2026-10-04 AI-native decision.

## Performance Considerations

The new cases are a handful of in-memory rows inside the existing Vitest run. No extra runner, fixture service, or request boundary.

## Migration Notes

No schema, migration, or data backfill. The production comparison function stays as it is.

## References

- Related research: `context/changes/testing-delta-after-edit-delete/research.md`
- Rollout guide: `context/foundation/test-plan.md` §2 risks #1 and #4, §3 phase 1, §6.1
- Signed edit oracle: `context/archive/2026-10-02-edit-measurement-entry/plan.md:19`
- Signed delete oracle: `context/archive/2026-10-02-delete-measurement-entry/plan.md:19`
- Existing cases: `src/lib/measurement-deltas.test.ts:22-192`
- Comparison rule: `src/lib/measurement-deltas.ts:3-68`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Signed edit chain

#### Automated

- [x] 1.1 `npm test` exits 0 — 250b05e
- [x] 1.2 The edit cases expect `↑ 2.0` on the starting pair, `↑ 1.0` after A is 81, and `↓ 2.0` on A with null deltas on the 2025-12-28 row — 250b05e

#### Manual

- [x] 1.3 Those expected arrows match the signed edit plan, and they were not taken from a trial run of `withDeltas`

### Phase 2: Signed delete chain

#### Automated

- [ ] 2.1 `npm test` exits 0
- [ ] 2.2 The delete cases expect the before-delete arrows, `↑ 1.0` on C with A null after the middle row is removed, `↑ 2.0` on B with A null after the latest row is removed, and `↓ 1.0` on C with B null after the oldest row is removed

#### Manual

- [ ] 2.3 Those expected arrows match the signed delete plan, and they were not taken from a trial run of `withDeltas`

### Phase 3: Note-only same-date reorder

#### Automated

- [ ] 3.1 `npm test` exits 0
- [ ] 3.2 The note-only case expects Q `↑ 2.0` versus P, P `↓ 1.0` versus R, null deltas on R, Q still first, and the weights 82, 80, and 81 unchanged after the later timestamp

#### Manual

- [ ] 3.3 The before-and-after arrows follow the signed timestamp rule and the tenths gaps of 80, 81, and 82, and the note text is not the source of the arrow

### Phase 4: Cookbook

#### Automated

- [ ] 4.1 `npm test` exits 0

#### Manual

- [ ] 4.2 §6.1 names the unit pattern, the signed-plan arrows, the same-date timestamp case, and that the trainer preview uses those assertions
- [ ] 4.3 §6.5 records that this rollout phase shipped those cases and that no AI-native check was added, checked 2026-10-04
