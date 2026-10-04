# Reject Illegal Measurements Implementation Plan

## Overview

Prove a create dated two UTC calendar days ahead, with otherwise legal numbers, is refused and does not appear on the empty journal. The existing rejection-rule unit already locks the signed limits. This plan adds the one storage proof in the live smoke script, then records that pattern in the cookbook.

## Current State Analysis

`createMeasurementInputSchema` rejects `measured_on` when the calendar string is greater than UTC today plus one day (`src/lib/measurement-input.ts:112-113`). The unit file already accepts that plus-one day and rejects plus two, including the field message (`src/lib/measurement-input.test.ts:166-176`). Create and edit both parse that schema before they write (`src/pages/api/measurements/index.ts:38-41`, `src/pages/api/measurements/[id].ts:48-53`).

The measurements table checks weight, circumferences, and note length. `measured_on` is `date not null` with no upper bound (`supabase/migrations/20260928043200_trainee_measurements.sql:4`). A future date is the body the table would still store if the route skipped the schema. Weight `800` is also outside `measurements_weight_kg_check`, so an empty list after that post would not show the route stopped before insert.

Smoke signs up a fresh trainee and already expects `No measurements yet` before any save (`scripts/smoke.mjs:213-217`). The next step posts weight `800` and expects only the error redirect (`scripts/smoke.mjs:218-222`). No step then reads the journal. Vitest includes `src/**/*.test.ts` and does not boot the preview.

## Desired End State

While that fresh journal is still empty, smoke posts a create whose only illegal field is a UTC date two calendar days ahead. The route answers with the existing error redirect. The following `GET /measurements` is 200, contains `No measurements yet`, and does not contain that date. The weight-800 step is still the next step. §6.3 tells the next illegal-entry check to extend this script. §4 and §5 no longer send the storage proof to Vitest.

### Key Discoveries:

- The first rejected calendar day is UTC today plus two. Plus one is legal (`src/lib/measurement-input.ts:82-85`, `src/lib/measurement-input.ts:112-113`).
- A failed create redirects to `/measurements?error=` (`src/pages/api/measurements/index.ts:9-10`). A saved create redirects to exact `/measurements` (`src/pages/api/measurements/index.ts:48`).
- An empty journal renders `No measurements yet` and does not render the list (`src/components/journal/TraineeJournal.astro:51-52`). A stored row renders `measured_on` as text (`src/components/measurements/MeasurementList.astro:39-40`).
- `measurementForm` already sends in-range circumferences of `50.0` (`scripts/smoke.mjs:35-47`). The smoke runner treats `location` as a prefix unless `exactLocation` is set, `body` as a substring, and `forbid` as a substring that must be absent (`scripts/smoke.mjs:467-479`).

## What We're NOT Doing

- A new unit case, or a repeat of the field messages in `src/lib/measurement-input.test.ts`.
- Using weight `800`, or any other table-rejected number, as the proof the route stopped before insert.
- Asserting the field message `Date must not be later than one day from today` in smoke.
- A second request on `POST /api/measurements/[id]` with a future date. One create covers the shared rule and the create store. The edit handler's schema-failure return stays unread.
- A Vitest request, a mocked `addMeasurement`, or a browser or screenshot check.
- Rewriting §1, §2, or §3 of `context/foundation/test-plan.md`.
- Checking whether `numeric(5,1)` rounds an extra decimal.

## Implementation Approach

Extend `scripts/smoke.mjs` with two steps on the fresh trainee, immediately after the empty-journal render and before the out-of-range weight post. The post is the refusal. The following GET is the proof nothing was stored. Leave the existing unit file untouched. The cookbook phase then fills §6.3 and §6.5 and corrects the stack and gate lines that still place this request on Vitest.

## Critical Implementation Details

- **State sequencing** — The future-date pair has to run while the journal is still empty. Insert it after `measurements renders for signed-in user` and before `measurement rejects out-of-range weight`. A stored weight-800 row, or the later legal save, would remove `No measurements yet` even when the future date was refused.
- **Timing & lifecycle** — Compute the date in the smoke script with UTC calendar fields. `getDate()` follows the machine timezone and can land on the legal plus-one day. Format a zero-padded `YYYY-MM-DD`, because the schema compares the strings in that order. Do not import `latestMeasuredOn` or `createMeasurementInputSchema`. Smoke stays dependency-free.

## Phase 1: Future-date create leaves the journal empty

### Overview

Add the storage proof to smoke.

- **Behavior asserted:** a create whose `measured_on` is two UTC calendar days after today, with otherwise legal numbers, takes the error redirect, and the journal still shows `No measurements yet` without that date.
- **Regression caught:** the create route stores a future date the table would accept, and that date appears on the list.
- **Research source:** `context/changes/testing-reject-illegal-measurements/research.md` sections "What the table would still store" and "What this phase should prove".
- **Edge / error / boundary:** plus two is the first illegal calendar day. Plus one is legal and is not the body. The journal is still empty only before the weight-800 post and the first legal save.
- **Anti-pattern avoided:** a new unit that repeats field messages; weight `800` as this proof; an error redirect or field message with no list read; a mocked insert; a Vitest request; an edit-path request.

### Changes Required:

#### 1. Smoke script

**File**: `scripts/smoke.mjs`

**Intent**: Post one future-dated create while the fresh trainee's journal is empty, then read the journal. The list read is what shows the row was not stored. The error redirect shows the route refused the body. The weight-800 step stays where it is and is not this proof.

**Contract**: Add a UTC helper in this file that returns the `YYYY-MM-DD` two calendar days after today's UTC date. Call `measurementForm` with that string and weight `"80.0"`. Insert two steps after the existing empty-journal GET and before `measurement rejects out-of-range weight`:

1. POST `/api/measurements`. Expect status 302 and location prefix `/measurements?error=`. Do not set `exactLocation`. Do not require the field message in the location.
2. GET `/measurements`. Expect status 200, body `No measurements yet`, and `forbid` set to the same date string that was posted.

```javascript
function utcDatePlusDays(days) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}
```

The posted date is `utcDatePlusDays(2)`. Do not edit `src/lib/measurement-input.test.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` exits 0
- The future-date POST uses weight `80.0` and expects 302 with location prefix `/measurements?error=`
- The following GET expects 200, body `No measurements yet`, and forbids the posted date

#### Manual Verification:

- Those two steps sit after `measurements renders for signed-in user` and before `measurement rejects out-of-range weight`
- The date is computed in UTC as today plus two calendar days inside `scripts/smoke.mjs`, and the field message is not an expectation
- `src/lib/measurement-input.test.ts` is unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Cookbook

### Overview

Record the smoke pattern, and point the stack and gate lines at that script.

### Changes Required:

#### 1. Test plan cookbook, stack note, and gate row

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the §6.3 placeholder so the next illegal-entry check extends this smoke script. Note in §6.5 that this phase shipped. Correct the §4 sentence and the §5 Vitest gate that still describe the storage proof as a Vitest case.

**Contract**: §6.3 names `scripts/smoke.mjs` and `npm run smoke`. The pattern is a create of UTC today plus two calendar days with weight `80.0`, a 302 whose location starts with `/measurements?error=`, then `GET /measurements` expecting `No measurements yet` and forbidding that date. The steps sit after the empty-journal render and before the out-of-range weight post. The existing rejection-rule unit stays. A new unit, weight `800` as this proof, the field message as the expectation, a mocked insert, and an edit-path request are not part of this pattern. §6.5 records that rollout phase 3 shipped those two steps, that the existing unit was left in place, that no new Vitest request was added, and that no AI-native check was added, with `Checked` set to the UTC date of the cookbook commit. In §4, phase 3 keeps the existing rejection-rule unit on Vitest and adds the storage proof to `scripts/smoke.mjs`. In §5, Vitest no longer claims the stored-illegal-entry catch, and the smoke gate includes the future-date create that must stay off the empty journal. Do not edit §1, §2, or §3.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- `scripts/smoke.mjs` still places the future-date POST before the out-of-range weight step, and the following GET expects `No measurements yet`

#### Manual Verification:

- §6.3 names the smoke pattern: UTC today plus two days, weight `80.0`, the error redirect, then an empty journal that forbids that date
- §6.5 records the shipped steps, the existing unit left in place, no new Vitest request, and no AI-native check
- §4 and §5 place the storage proof on `scripts/smoke.mjs`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new Vitest case. `npm test` stays green because this change does not edit the rejection rule. The existing plus-two case remains the limit lock.

### Integration Tests:

- `npm run smoke` is the storage proof. It needs the same running app and local Supabase the CI smoke job uses. `BASE_URL` defaults to `http://localhost:4321`.

### Manual Testing Steps:

1. Read the new smoke expectations against this plan: weight `80.0`, location prefix `/measurements?error=`, body `No measurements yet`, and `forbid` equal to the posted UTC-plus-two date.
2. Confirm those steps sit before `measurement rejects out-of-range weight`.
3. Confirm §6.3, §6.5, §4, and §5 match phase 2, and that `src/lib/measurement-input.test.ts` is unchanged.

## Performance Considerations

The script gains two requests on the existing fresh trainee. That stays inside the sequential smoke run. No application change and no new latency budget.

## Migration Notes

No schema, migration, or data backfill. The date cap stays in the schema. The table stays without a date check.

## References

- Rollout guide: `context/foundation/test-plan.md` §2 risk #5, §3 phase 3, §4, §5, §6.3
- Research: `context/changes/testing-reject-illegal-measurements/research.md`
- Signed limits: `context/archive/2026-09-27-trainee-measurement-delta/plan.md`
- Date rule: `src/lib/measurement-input.ts:82-85`, `src/lib/measurement-input.ts:112-113`
- Existing plus-two unit: `src/lib/measurement-input.test.ts:166-176`
- Create redirect: `src/pages/api/measurements/index.ts:9-10`, `src/pages/api/measurements/index.ts:38-48`
- Empty journal and list date: `src/components/journal/TraineeJournal.astro:51-52`, `src/components/measurements/MeasurementList.astro:39-40`
- Uncapped column: `supabase/migrations/20260928043200_trainee_measurements.sql:4`
- Smoke insertion point: `scripts/smoke.mjs:213-227`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Future-date create leaves the journal empty

#### Automated

- [x] 1.1 `npm run smoke` exits 0
- [x] 1.2 The future-date POST uses weight `80.0` and expects 302 with location prefix `/measurements?error=`
- [x] 1.3 The following GET expects 200, body `No measurements yet`, and forbids the posted date

#### Manual

- [x] 1.4 Those two steps sit after `measurements renders for signed-in user` and before `measurement rejects out-of-range weight`
- [x] 1.5 The date is computed in UTC as today plus two calendar days inside `scripts/smoke.mjs`, and the field message is not an expectation
- [x] 1.6 `src/lib/measurement-input.test.ts` is unchanged

### Phase 2: Cookbook

#### Automated

- [ ] 2.1 `npm test` exits 0
- [ ] 2.2 `scripts/smoke.mjs` still places the future-date POST before the out-of-range weight step, and the following GET expects `No measurements yet`

#### Manual

- [ ] 2.3 §6.3 names the smoke pattern: UTC today plus two days, weight `80.0`, the error redirect, then an empty journal that forbids that date
- [ ] 2.4 §6.5 records the shipped steps, the existing unit left in place, no new Vitest request, and no AI-native check
- [ ] 2.5 §4 and §5 place the storage proof on `scripts/smoke.mjs`
