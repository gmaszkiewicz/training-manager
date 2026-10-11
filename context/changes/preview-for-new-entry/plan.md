# Preview the delta versus the previous entry from the new entry date — Implementation Plan

## Overview

While a trainee fills in a new measurement, show the same up/down difference the saved list would show against the row strictly before the typed minute.

## Current State Analysis

`MeasurementForm` posts a minute, eight numbers, and an optional note. It does not look up an earlier row, show a difference, or copy values (`src/components/measurements/MeasurementForm.tsx:112-228`). The saved list already compares each row with the immediately earlier one by `measured_on`, then `id`, and renders `↓ 1.5`, `↑ 0.2`, or `0.0` under the field (`src/lib/measurement-deltas.ts:19-62`, `src/components/measurements/MeasurementBrowser.tsx:533-543`).

The form does not receive the month page (`src/components/journal/TraineeJournal.astro:56-57`). That page is one calendar month plus at most one older row for the oldest visible saved entry (`src/lib/services/measurements.ts:141-153`, `src/lib/measurement-page.ts:182-188`). The earlier row for a typed minute can sit outside that page. `selectOlderRow` also needs a saved `id`, which a new entry does not have.

`measured_on` is a `timestamp without time zone`. The form stores the typed clock minute as `YYYY-MM-DDTHH:mm:00` (`src/lib/measurement-input.ts:112-137`). The unique index `(trainee_id, measured_on)` means one saved minute per trainee (`supabase/migrations/20261006220000_measured_on_timestamp.sql:45-46`).

## Desired End State

On a new entry, each number that would pass submit shows the list's difference against the latest saved row whose `measured_on` is strictly before the typed minute.

Worked case. Saved rows are 80 kg at `2026-10-06T10:00:00` and 78.5 kg at `2026-10-06T11:00:00`.

- Typing `2026-10-06T11:00` still uses the 10:00 row. Weight `78.5` reads `↓ 1.5`.
- Typing `2026-10-06T11:30` uses the 11:00 row. Weight `78.5` reads `0.0`.
- Typing a minute before both rows shows no difference.

Verify by filling a new entry at `/measurements` and by the unit tests in each phase.

### Key Discoveries:

- `deltaBetween` and `formatDelta` already implement the tenths difference the preview must match (`src/lib/measurement-deltas.ts:19-27`, `src/lib/measurement-deltas.ts:54-62`).
- `GET /api/measurements` returns one month page and accepts a trainer `trainee` id (`src/pages/api/measurements/index.ts:37-96`). This preview needs a different read, for the signed-in trainee only.
- `src/pages/api/measurements/[id].ts` handles `POST` for a measurement id. The previous-row route has to be a static path so `previous` is not taken as that id.
- The list's null difference is a non-breaking space with the line hidden from the accessibility tree (`src/components/measurements/MeasurementBrowser.tsx:533-542`). An empty preview uses that same treatment.
- Notes are outside the comparison (`context/foundation/prd.md:92-96`). Good/bad coloring is a non-goal (`context/foundation/prd.md:116`).

## What We're NOT Doing

- Preview while editing a saved entry.
- Copying a previous row's numbers into the new entry. That idea is deferred until the interaction is clear.
- Good/bad coloring of the difference.
- Sending the month page or the whole journal to the form.
- Letting a trainer use this lookup.
- Changing how a saved row computes or displays its difference.
- A database migration.

## Implementation Approach

Add one trainee-only read: the latest row with `measured_on` less than the typed minute. The form requests that row when the minute changes and would pass the existing date check. It calculates each field locally with the list's tenths math, and only for a number that would pass submit.

The pure selection rule is what the tests lock. The query is the production implementation of that rule. It does not load the journal and then filter it in memory.

## Critical Implementation Details

- **Timing & lifecycle:** The new-entry minute is empty during server render and becomes the browser-local minute after hydration (`src/components/measurements/MeasurementForm.tsx:112-120`). Request the minute actually shown. Drop a response whose minute is no longer the one on screen.
- **State sequencing:** A numeric edit recalculates from the previous row already stored. It does not start another request. Only a new accepted minute does.
- **User experience spec:** The stored value is the naive clock minute, not a UTC conversion. Compare that same `YYYY-MM-DDTHH:mm:00` string.

## Phase 1: Previous-entry lookup

### Overview

A signed-in trainee can read the single saved row strictly before a minute. The selection rule is unit-tested, and the route queries that same predicate.

### Changes Required:

#### 1. Shared minute parser

**File**: `src/lib/measurement-input.ts`

**Intent**: Keep one definition of an acceptable minute so the route and, later, the form reject the same empty, malformed, and too-late values the create schema already rejects.

**Contract**: Keep the zod `measured_on` field as the source of the current rejection messages: "Date and time are required.", "Date and time must be a valid YYYY-MM-DDTHH:mm value.", and "Date must not be later than one day from today". Export `parseMeasuredOn(value: unknown, now: Date): string | null` as a wrapper around that same field. It returns the normalized `YYYY-MM-DDTHH:mm:00`, or `null` when the field rejects the value. Do not replace the field with a null check that collapses those messages. Existing message, ceiling, and normalization tests stay in force.

#### 2. Selection rule

**File**: `src/lib/measurement-previous.ts`

**Intent**: Lock which saved row is "the previous entry" for an unsaved minute, including a minute that collides with a saved row.

**Contract**: Export `previousMeasurement(entries: readonly MeasurementEntry[], measuredOn: string): MeasurementEntry | null`. Among rows whose `measured_on` is strictly less than `measuredOn`, return the row that sorts last by the same `measured_on`, then `id`, order `compareEntries` uses. Return `null` when none are earlier. A row with an equal `measured_on` is not selected. Tests live in `src/lib/measurement-previous.test.ts`.

#### 3. One-row read

**File**: `src/lib/services/measurements.ts`

**Intent**: Load that previous row for one trainee without reading the journal.

**Contract**: Export `readPreviousMeasurement(supabase, traineeId, measuredOn)` returning `{ ok: true, entry }` or `{ ok: false }`. `entry` is the row or `null`. Filter `trainee_id` to that trainee and `measured_on` less than the normalized minute, order `measured_on` descending then `id` descending, and limit 1. Select `id`, `measured_on`, and the eight numeric columns. Do not select `note`. Do not call `previousMeasurement` on a fetched list.

#### 4. Trainee route

**File**: `src/pages/api/measurements/previous.ts`

**Intent**: Give the new-entry form one JSON read that cannot be used as a trainer preview or as a measurement id.

**Contract**: `export const prerender = false` and `GET`. Static file `previous.ts`, sibling of `[id].ts`. Query `measured_on`. JSON `Cache-Control: no-store`, same response helper style as `src/pages/api/measurements/index.ts`.

- No user: `401`.
- Supabase client missing, or `readPreviousMeasurement` not ok: `500`.
- Profile role other than `trainee`, including a trainer: `403`. Ignore any `trainee` query param. The trainee id is the signed-in user.
- `parseMeasuredOn` returns `null`: `400`, and do not query.
- No earlier row: `200` with `{ "entry": null }`.
- Otherwise `200` with `{ "entry": { "id", "measured_on", "weight_kg", "chest_cm", "waist_cm", "arms_cm", "thigh_cm", "calf_cm", "hips_cm", "navel_cm" } }`.

### Success Criteria:

#### Automated Verification:

- `npm test` selects the latest saved row whose time is strictly before a minute sitting between two rows, including an earlier minute on the same calendar day.
- `npm test` selects the row before a saved minute when the typed minute equals that saved minute, and selects nothing when every saved row is later.
- `npm run lint` passes.

#### Manual Verification:

- As a signed-in trainee, with rows at 2026-10-06T09:00:00, 2026-10-06T10:00:00, and 2026-10-06T11:00:00, requesting 2026-10-06T11:00 returns the 10:00 row, not the 09:00 row; a trainer or signed-out request is refused.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Live preview

### Overview

The new-entry form shows each acceptable number's difference against the row from Phase 1. Edit mode does not.

### Changes Required:

#### 1. Field parser and preview math

**File**: `src/lib/measurement-input.ts`

**Intent**: A preview number is acceptable only when that same field would pass submit.

**Contract**: Keep each zod numeric field as the source of its current messages: required, at most one decimal place, and the range sentence (weight 20–400, circumferences 10–300). Export `parseMeasurementField(field: MeasurementField, value: unknown): number | null` as a wrapper around that same field. It returns the number, or `null` when the field rejects the value. Do not collapse those messages into one null branch.

**File**: `src/lib/measurement-deltas.ts`

**Intent**: Reuse the tenths difference for one unsaved field at a time.

**Contract**: Export `previewAgainst(previous: Pick<MeasurementEntry, MeasurementField>, current: Partial<Record<MeasurementField, number>>): Record<MeasurementField, FieldDelta | null>`. A field present in `current` uses the existing tenths math against `previous`. A field absent from `current` is `null`. Do not read `note`. Tests in `src/lib/measurement-deltas.test.ts` cover `78.5` against `80` (`down`, `1.5`, `formatDelta` text `↓ 1.5`), `80.3` against `80.1` (`up`, `0.2`, `↑ 0.2`), and equal numbers (`none`, `0`, `0.0`).

#### 2. New-entry preview

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Show the difference under each number while a new entry is being filled, and keep Add measurement available when the lookup cannot be shown.

**Contract**: When `entry` is set, do not request a previous row and do not render a difference. When `entry` is null, parse the minute on screen with `parseMeasuredOn`. `null` clears any stored previous row. An accepted minute `GET`s `/api/measurements/previous?measured_on=` with `cache: "no-store"`. Apply the body only when that minute is still the one on screen. A non-OK response or a thrown fetch stores no previous row.

For each field, call `parseMeasurementField` on the input string. When that returns a number and a previous row is stored, render that field's `previewAgainst` result as an arrow under the field icon and the one-decimal number under the typed value. Up is `↑`, down is `↓`, and an equal value has no arrow and shows `0.0`. The line is `text-card-foreground relative mt-1 min-h-lh text-sm font-semibold`. Otherwise render a non-breaking space, `aria-hidden`. When the delta is present, its accessible name matches the list: label, `unchanged` / `up` / `down`, one decimal, and the unit (`src/components/measurements/MeasurementBrowser.tsx:85-88`). When a previous row is stored and any number field is non-empty, show `Against` plus that row's minute under the date, in `text-card-foreground mt-1 min-h-lh text-sm font-semibold whitespace-nowrap`. Otherwise that caption is a non-breaking space, `aria-hidden`.

### Success Criteria:

#### Automated Verification:

- `npm test` formats 78.5 against a previous 80 as ↓ 1.5, 80.3 against 80.1 as ↑ 0.2, and equal numbers as 0.0.
- `npm test` leaves a field blank when it is empty, has more than one decimal, or is outside that field's range, while a valid sibling field still shows a difference.
- `npm run lint` passes.

#### Manual Verification:

- On a new entry, moving the minute switches the previous row, and a valid keystroke updates that field's difference without a new request.
- Edit measurement shows no preview, and an unacceptable minute or a failed lookup leaves Add measurement usable with no differences.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `previousMeasurement`: a minute between two rows, an earlier minute on the same calendar day, a minute equal to a saved row, a minute before every row, and a same-timestamp pair ordered by `id`.
- `previewAgainst` plus `parseMeasurementField`: the `↓ 1.5`, `↑ 0.2`, and `0.0` cases; empty, `78.55`, and out-of-range weight stay blank while a valid circumference still has a difference.

### Integration Tests:

- The route and the SQL predicate are checked manually in Phase 1. This repo's automated tests cover pure functions, not the Supabase client.

### Manual Testing Steps:

1. Sign in as a trainee with 80 kg at `2026-10-06T10:00:00` and 78.5 kg at `2026-10-06T11:00:00`. Open a new entry.
2. Set the minute to `2026-10-06T11:00`. Confirm the differences use 80 kg, including weight `78.5` showing `↓ 1.5`.
3. Set the minute to `2026-10-06T11:30`. Confirm the differences switch to the 78.5 kg row.
4. Clear the minute, or set it after the one-day ceiling. Confirm the differences disappear and Add measurement still submits a valid entry after the minute is corrected.
5. Open Edit on a saved row. Confirm there is no preview.

## Performance Considerations

The preview reads one indexed row: `trainee_id` plus `measured_on` less than the minute, limit 1, on the existing unique `(trainee_id, measured_on)` index. Numeric edits do not query again.

## Migration Notes

No schema change. Existing rows stay as they are. The lookup uses the unique `(trainee_id, measured_on)` index already in production.

## References

- Related research: `context/changes/preview-for-new-entry/research.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/85
- Roadmap slice: `context/foundation/roadmap.md` S-26, MS-18
- Delta math: `src/lib/measurement-deltas.ts:19-62`
- Older-row query to mirror, without a saved id: `src/lib/services/measurements.ts:141-159`
- New-entry form: `src/components/measurements/MeasurementForm.tsx:150-228`
- List difference line: `src/components/measurements/MeasurementBrowser.tsx:85-88`, `src/components/measurements/MeasurementBrowser.tsx:533-543`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Previous-entry lookup

#### Automated

- [x] 1.1 `npm test` selects the latest saved row whose time is strictly before a minute sitting between two rows, including an earlier minute on the same calendar day. — 0e5dde3
- [x] 1.2 `npm test` selects the row before a saved minute when the typed minute equals that saved minute, and selects nothing when every saved row is later. — 0e5dde3
- [x] 1.3 `npm run lint` passes. — 0e5dde3

#### Manual

- [x] 1.4 As a signed-in trainee, with rows at 2026-10-06T09:00:00, 2026-10-06T10:00:00, and 2026-10-06T11:00:00, requesting 2026-10-06T11:00 returns the 10:00 row, not the 09:00 row; a trainer or signed-out request is refused. — 0e5dde3

### Phase 2: Live preview

#### Automated

- [x] 2.1 `npm test` formats 78.5 against a previous 80 as ↓ 1.5, 80.3 against 80.1 as ↑ 0.2, and equal numbers as 0.0. — 2e1077b
- [x] 2.2 `npm test` leaves a field blank when it is empty, has more than one decimal, or is outside that field's range, while a valid sibling field still shows a difference. — 2e1077b
- [x] 2.3 `npm run lint` passes. — 2e1077b

#### Manual

- [x] 2.4 On a new entry, moving the minute switches the previous row, and a valid keystroke updates that field's difference without a new request. — 2e1077b
- [x] 2.5 Edit measurement shows no preview, and an unacceptable minute or a failed lookup leaves Add measurement usable with no differences. — 2e1077b
