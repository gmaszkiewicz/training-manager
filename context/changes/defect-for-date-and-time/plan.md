# Current local minute is rejected as later than now — Implementation Plan

## Overview

Saving a measurement at the browser’s current minute shows “Date and time must not be later than now” when that clock is ahead of UTC. The shared validator will compare the typed wall-clock minute with `now` shifted by the browser offset, so that local minute is accepted and the next minute is still rejected.

## Current State Analysis

On `main`, `measuredOn()` in `src/lib/measurement-input.ts` builds its ceiling with `formatUtcMinute(now)` and compares that string to the submitted `YYYY-MM-DDTHH:mm`. The form already limits the picker to the browser’s local minute (`formatLocalMinute` / `allowedMinute` in `src/components/measurements/MeasurementForm.tsx`), then parses the same value with `createMeasurementInputSchema(new Date())` and posts it without an offset. For a clock at UTC+2, local `07:24` is UTC `05:24`, so the current minute fails the UTC ceiling.

`measured_on` is stored as `timestamp without time zone` in the shape `YYYY-MM-DDTHH:mm:00`. Display shows that typed clock. Create (`src/pages/api/measurements/index.ts`), update (`src/pages/api/measurements/[id].ts`), occupied (`src/pages/api/measurements/occupied.ts`), and previous (`src/pages/api/measurements/previous.ts`) all use this parser. `scripts/smoke.mjs` builds `measured_on` with UTC getters and omits any offset, so a missing offset must keep the UTC ceiling.

The working tree already contains an uncommitted draft of this contract. Keep those edits where they match the contracts below. Add the zone-behind-UTC case if it is not already asserted.

## Desired End State

A trainee whose browser is ahead of UTC can add a measurement at the current local minute, and can edit that entry without moving the minute. The following minute is rejected with “Date and time must not be later than now”. Occupied and previous accept that same current minute. The stored value remains the typed minute with seconds zeroed.

### Key Discoveries:

- The future check is one lexicographic compare inside `measuredOn()` (`src/lib/measurement-input.ts`). Create, update, the form submit parse, occupied, and previous all reach it through `createMeasurementInputSchema` or `parseMeasuredOn`.
- `Date.getTimezoneOffset()` uses the opposite sign from a zone label: UTC+2 returns `-120`. The ceiling is `formatUtcMinute(new Date(now.getTime() - utcOffsetMinutes * 60 * 1000))`.
- Real-zone bounds already implied by `getTimezoneOffset()` are `-840` (UTC+14) through `720` (UTC−12).
- Smoke stays valid only while a missing offset means UTC `0` (`scripts/smoke.mjs` `utcMinute`).

## What We're NOT Doing

- Changing `measured_on` to `timestamptz`, rewriting stored rows, or shifting the journal display.
- Replacing the form picker’s local ceiling. It already uses local calendar getters.
- Exempting an edited entry’s existing minute when that minute is after the ceiling. The schema keeps rejecting it.
- Adding a daylight-saving table. The offset is whatever `getTimezoneOffset()` returns at request time.
- New error copy, or requiring `scripts/smoke.mjs` to send `utc_offset_minutes`.
- Touching `measuredOnMax()`.

## Implementation Approach

Teach the shared minute ceiling about an optional offset, and prove it with injected `now` values. Then have the form send `Date.getTimezoneOffset()` as `utc_offset_minutes` on submit, occupied, and previous, and have those four server paths pass that integer into the same ceiling. Callers that omit the field stay on the UTC ceiling.

## Critical Implementation Details

### Offset sign

`utc_offset_minutes` has the same sign as `Date.getTimezoneOffset()`: minutes added to local time to get UTC. Subtracting that many minutes from `now`, then reading UTC fields, yields the browser’s wall-clock minute. Flipping the sign accepts a future local minute or keeps rejecting the current one.

```ts
function wallClockCeiling(now: Date, utcOffsetMinutes: number): string {
  return formatUtcMinute(new Date(now.getTime() - utcOffsetMinutes * 60 * 1000));
}
```

## Phase 1: Offset-aware minute ceiling

### Overview

The shared validator accepts the local current minute for a bounded offset and rejects the next minute, including across UTC midnight and for a zone behind UTC.

### Changes Required:

#### 1. Minute ceiling

**File**: `src/lib/measurement-input.ts`

**Intent**: Compare the typed minute with the wall-clock minute of `now` in the caller’s offset, so a zone ahead of UTC is not treated as the future.

**Contract**: `readUtcOffsetMinutes(value)` returns `0` for `undefined`, `null`, and `""`; returns the integer for a base-10 integer string from `-840` through `720` inclusive; returns `null` otherwise (non-integers, `"-841"`, `"721"`). `createMeasurementInputSchema(now, utcOffsetMinutes = 0)` and `parseMeasuredOn(value, now, utcOffsetMinutes = 0)` pass that offset into `measuredOn`. The ceiling is the formula in Offset sign. A minute string greater than that ceiling fails with “Date and time must not be later than now”. A passing value is still `YYYY-MM-DDTHH:mm:00` with seconds zeroed. With offset `0`, today’s UTC-minute behavior stays.

#### 2. Ceiling tests

**File**: `src/lib/measurement-input.test.ts`

**Intent**: Lock the local minute, the following minute, midnight, a zone behind UTC, and the offset bounds to injected instants.

**Contract**: Keep the existing UTC ceiling cases. Assert these inputs against `createMeasurementInputSchema` or `parseMeasuredOn`:

| `now` | offset | accept | reject |
| --- | --- | --- | --- |
| `2026-10-16T05:24:00.000Z` | `-120` | `2026-10-16T07:24` → `2026-10-16T07:24:00` | `2026-10-16T07:25` |
| `2026-10-16T23:30:00.000Z` | `-120` | `2026-10-17T01:30` → `2026-10-17T01:30:00` | `2026-10-17T01:31` |
| `2026-10-16T15:00:00.000Z` | `300` | `2026-10-16T10:00` → `2026-10-16T10:00:00` | `2026-10-16T10:01` and `2026-10-16T15:00` |
| `2026-10-16T05:24:00.000Z` | omitted (`0`) | `2026-10-16T05:24` | `2026-10-16T07:24` |

Every rejection above uses “Date and time must not be later than now”, including the minute after UTC midnight. `readUtcOffsetMinutes` accepts `"-840"` and `"720"` and returns `null` for `"-841"` and `"721"`.

### Success Criteria:

#### Automated Verification:

- Offset ceiling tests pass: `npx vitest run src/lib/measurement-input.test.ts`
- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Send and apply the browser offset

### Overview

The form sends the browser offset, and create, update, occupied, and previous apply it to the Phase 1 ceiling. The current local minute can be saved, checked for duplicates, and used as the previous-entry anchor.

### Changes Required:

#### 1. Form

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Give every validation and read of the typed minute the same offset the picker already assumes.

**Contract**: `browserUtcOffsetMinutes()` returns `new Date().getTimezoneOffset()`. The submit parse calls `createMeasurementInputSchema(new Date(), utcOffsetMinutes)`. The save `FormData` sets `utc_offset_minutes` to that integer. `fetchMinuteTaken` and `previousMeasurementUrl` set the same query parameter. A new entry’s preview calls `parseMeasuredOn(dateValue, new Date(), utcOffsetMinutes)`. The picker ceiling stays on local getters.

#### 2. Create and update

**File**: `src/pages/api/measurements/index.ts`

**File**: `src/pages/api/measurements/[id].ts`

**Intent**: The server ceiling matches the minute the form submitted.

**Contract**: Read `utc_offset_minutes` from the form with `readUtcOffsetMinutes`. `null` responds `400` with “Date and time must be a valid YYYY-MM-DDTHH:mm value.” Otherwise call `createMeasurementInputSchema(new Date(), utcOffsetMinutes)`.

#### 3. Occupied and previous

**File**: `src/pages/api/measurements/occupied.ts`

**File**: `src/pages/api/measurements/previous.ts`

**Intent**: The current local minute remains a valid duplicate check and previous-entry lookup.

**Contract**: Read `utc_offset_minutes` from the query. When it is `null`, skip `parseMeasuredOn` and return the existing `400` body `{ error: "Invalid date and time" }`. Otherwise pass the offset into `parseMeasuredOn(..., new Date(), utcOffsetMinutes)`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`

#### Manual Verification:

- A signed-in trainee ahead of UTC can save a new measurement at the current local minute
- Editing that entry and saving without moving the minute still succeeds
- The current local minute still reports taken and still loads the previous entry

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Ahead of UTC: current local minute accepted, next minute rejected (`-120` at `2026-10-16T05:24:00.000Z`).
- Minute after UTC midnight: `2026-10-17T01:30` accepted and `01:31` rejected for offset `-120`.
- Behind UTC: local `10:00` accepted; local `10:01` and the UTC minute `15:00` rejected for offset `300`.
- Omitted offset still uses the UTC minute.
- Bounds `-840` and `720` accepted; `-841` and `721` rejected.

### Integration Tests:

- No new HTTP suite. Create, update, occupied, and previous stay thin wrappers over `readUtcOffsetMinutes` plus the schema. `scripts/smoke.mjs` keeps omitting the field and sending a UTC minute.

### Manual Testing Steps:

1. Use a browser in a zone ahead of UTC. Sign in as a trainee and open `/measurements`.
2. Leave the add form on the current local minute, fill a valid measurement, and save. The journal lists that minute and does not show “Date and time must not be later than now”.
3. Edit that entry, keep its minute, change one measurement, and save. The save succeeds.
4. With a second entry, return the form to a minute that already exists. The duplicate warning still appears, and the previous-entry preview still loads for the current minute.

## Performance Considerations

The offset is one integer on requests the form already makes. The ceiling is one date shift and a string compare.

## Migration Notes

No migration. Existing rows stay the wall-clock minute that was stored. A row whose minute is later than the viewer’s new local ceiling fails a later edit, which is the same schema rule as any other future minute.

## References

- Change notes: `context/changes/defect-for-date-and-time/change.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/101
- Validator: `src/lib/measurement-input.ts`
- Form: `src/components/measurements/MeasurementForm.tsx`
- Prior storage rule: `context/archive/2026-10-06-measured-on-with-time/plan.md`
- Minute cap that compared against the UTC minute: `context/archive/2026-10-15-some-display-changes/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Offset-aware minute ceiling

#### Automated

- [x] 1.1 Offset ceiling tests pass: `npx vitest run src/lib/measurement-input.test.ts`
- [x] 1.2 Unit tests pass: `npm test`
- [x] 1.3 Lint passes: `npm run lint`
- [x] 1.4 Type check passes: `npx astro check`

### Phase 2: Send and apply the browser offset

#### Automated

- [ ] 2.1 Unit tests pass: `npm test`
- [ ] 2.2 Lint passes: `npm run lint`
- [ ] 2.3 Type check passes: `npx astro check`

#### Manual

- [ ] 2.4 A signed-in trainee ahead of UTC can save a new measurement at the current local minute
- [ ] 2.5 Editing that entry and saving without moving the minute still succeeds
- [ ] 2.6 The current local minute still reports taken and still loads the previous entry
