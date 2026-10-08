# Pagination and filter measurements Implementation Plan

## Overview

Trainees and trainers on `/measurements` see one calendar day of measurements at a time, paged 5, 10, or 15 to a page, newest `measured_on` first. The last chosen day and page size are restored from this browser. Differences versus the previous measurement stay those of the full journal.

## Current State Analysis

`/measurements` loads every row for one trainee and renders them all. There is no page size, no date filter, and no saved list preference.

- Trainees get `TraineeJournal`; trainers get `TrainerPanel` on the same route (`src/pages/measurements.astro:94-111`). Both render `MeasurementList.astro`. Trainers do not get edit or delete links (`src/components/trainer/TrainerPanel.astro:83`).
- `listMeasurements` selects every column for one `trainee_id` with no limit and no order (`src/lib/services/measurements.ts:23-34`). `withDeltas` sorts by `measured_on`, then `id`, and the page shows that order reversed (`src/lib/measurement-deltas.ts:3-16`, `src/lib/measurement-deltas.ts:43-51`). `created_at` is not a sort key.
- An empty loaded journal says `No measurements yet` (`src/components/journal/TraineeJournal.astro:51-52`, `src/components/trainer/TrainerPanel.astro:80-81`). A failed load says `Could not load your measurements` or `Could not load measurements`.
- The only UI state on this route is the query string: `error`, `trainee`, `edit`, and `delete` (`src/pages/measurements.astro:15-16`, `src/pages/measurements.astro:55-67`). There is no `localStorage` and no shadcn `Select`. `src/components/ui/` has `Button`, `Input`, `Label`, and `Textarea`.
- `measured_on` is a timestamp without time zone. The calendar day is the `YYYY-MM-DD` prefix. Validation's "today" is the UTC date (`src/lib/measurement-input.ts:83-86`). Smoke creates the visible pair at `2026-01-01T07:00` and `2026-01-01T19:00` and expects `↓ 1.5` in the HTML (`scripts/smoke.mjs:246-257`). The second trainee's visible pair is `2026-02-01` (`scripts/smoke.mjs:390-401`).
- Kitchen-sink samples use `measured_on: "2026-09-15T12:00:00"` (`src/pages/kitchen-sink/journal.astro:25-27`, `src/pages/kitchen-sink/trainer.astro`).
- Issue [#74](https://github.com/gmaszkiewicz/training-manager/issues/74) names the risk: paging or filtering can hide entries, show another trainee's measurements, or change a difference.

## Desired End State

A loaded journal, trainee or trainer, shows two dropdowns. **Date** lists each `YYYY-MM-DD` that already has a row, plus UTC today, newest first, once each. **Per page** lists 5, 10, and 15. The list under them is only the selected day, already ordered by `withDeltas`, sliced into pages. Page 1 is the newest slice. **Previous** and **Next** appear only when that day has more rows than the page size, with the text `Page X of Y`.

A browser with nothing saved opens on UTC today and 10 per page. Reloading `/measurements` restores the account's page size and the saved day for that trainee. A saved day that is no longer in the list becomes UTC today. Page number is not saved. Changing the day, or changing the page size when no edit or delete target is open, returns to page 1.

No rows at all: the date list is UTC today only, and the copy is `No measurements yet`. Rows exist, but not on the selected day: `No measurements on this day`. Arrows still compare each row with the chronologically previous row in the full journal, even when that row is on another day or another page.

Edit and delete keep working. When `edit` or `delete` identifies a row, that visit shows that row's day and the page that contains it. The saved day is not overwritten until the user changes the date control. Trainers still have no edit or delete controls. Switching trainees keeps one page size and a separate day per trainee.

Verify with `npm test` for the day and page rules, `npm run lint`, `npx astro check`, and `npm run smoke` against entries stored on UTC today. Confirm the saved choices and both empty sentences in the browser.

### Key Discoveries:

- Deltas are correct only if `withDeltas` runs on the full list before the day filter (`src/lib/measurement-deltas.ts:43-51`).
- Astro cannot pass `editHref` functions into a client island. The island has to build `/measurements?edit=` and `/measurements?delete=` from ids.
- Smoke reads the raw HTML body. Island props still contain every row, so a hidden day's note can appear in the payload even when the visible list omits it. Absence of an off-day note is a unit-test and browser check, not a `forbid` on `scripts/smoke.mjs`.
- The Worker date is UTC. Just after local midnight in Poland, UTC today and the trainee's local date differ. The same limit already applies to measurement validation (`context/archive/2026-10-06-measured-on-with-time/plan.md`).

## What We're NOT Doing

- Putting page size or the selected day in the query string or in a cookie.
- Remembering the page index.
- Recomputing deltas on the filtered day or the visible page.
- Sorting by `created_at`.
- An "all dates" choice, or showing that day plus older days.
- Numbered page links.
- A new table, column, or SQL `limit` / `range`. The service still returns the trainee's full list.
- A shadcn `Select`. The dropdowns are native `<select>` elements using the existing input border, height, and radius.
- Dropping other days from the island props. The client needs those rows to switch days without another request.
- Changing who may read, edit, or delete a measurement.

## Implementation Approach

Keep the server fetch and `withDeltas` as they are. Add a pure helper that turns that finished list into date options, one day, and one page. A React island on both journals owns the dropdowns, the pager, the empty copy, and the rows that `MeasurementList.astro` renders today. The first server render, and the first client render, use UTC today and page size 10, or the focused row's day when `edit` or `delete` is set. An effect then reads `localStorage`. Keys include the signed-in account id so two accounts on one browser do not share choices. The day key also includes the trainee whose journal is on screen.

Smoke cannot see `localStorage`. It keeps asserting the default server view, so every entry that an HTML assertion must see moves from the fixed January and February dates onto UTC today, at `07:00` and `19:00`.

## Critical Implementation Details

- **State sequencing:** Do not read `localStorage` during render. The server HTML and the hydration render must both use the default view (UTC today, page size 10, or the focused row). Read storage in an effect. While `edit` or `delete` points at a row, that effect may apply the stored page size and then move to the page that contains the row, and it must not write the focused day back to storage.
- **Smoke and the island payload:** Filtering is visible text plus unit tests. Do not add a smoke `forbid` for a note that is still passed into the island. Do move the entries smoke expects to see onto UTC today, using the same calendar day as `utcDatePlusDays(0)` in `scripts/smoke.mjs`.

## Phase 1: Day and page model

### Overview

Add a pure helper, with unit tests, for the day list, the one-day filter, the page slice, the saved-value fallbacks, and the focused edit or delete row. No page markup changes in this phase.

### Changes Required:

#### 1. Page rules

**File**: `src/lib/measurement-page.ts`

**Intent**: Put every rule that decides which rows are visible in one module so the journal island and the tests share it. The helper must not sort again and must not recompute deltas.

**Contract**: Export the page sizes `5`, `10`, and `15`, with default `10`. A measurement day is the first ten characters of `measured_on` after a leading space is replaced with `T`, so both `2026-01-01T07:00:00` and `2026-01-01 07:00:00` are `2026-01-01`. `utcToday(now)` is that UTC calendar day. Date options are the unique measurement days plus `today`, sorted newest first. A saved day is used only when it is in that list; otherwise the day is `today`. `localStorage` stores the page size as the string `"5"`, `"10"`, or `"15"`. The parser accepts only those three strings and falls back to `10` for anything else, including a number, `"10.0"`, or `" 10"`. Filtering keeps the incoming order. Page numbers are 1-based, and page 1 is the start of that newest-first array. When `focusedEntryId` matches a row, the day is that row's day and the page is the page that contains it, even if a different day was saved. Callers pass `savedDay: null` for the server render.

```ts
export function viewOf(input: {
  entries: { id: string; measured_on: string }[];
  today: string;
  pageSize: PageSize;
  focusedEntryId: string | null;
  savedDay: string | null;
}): { dates: string[]; day: string; page: number };
```

`pageSlice` returns the rows for that page. Storage key strings are `tm.measurements.pageSize.<accountUserId>` and `tm.measurements.day.<accountUserId>.<subjectTraineeId>`.

#### 2. Unit tests

**File**: `src/lib/measurement-page.test.ts`

**Intent**: Lock the decisions before any UI uses them.

**Contract**: Cover the success criteria below. Use a fixed `today`. Include one fixture where two rows share a day and an older row on another day still carries a delta, and assert the filtered row's delta object is the same object the caller passed in. Assert the page-size parser against the stored strings `"5"`, `"10"`, and `"15"`, and against a non-matching string.

### Success Criteria:

#### Automated Verification:

- `npm test` shows each measurement day once, plus UTC today, newest first.
- `npm test` falls back to UTC today when the saved day is absent, and to page size 10 unless the saved size is 5, 10, or 15.
- `npm test` filters one calendar day without reordering or recomputing deltas, and page 1 is the first slice of that newest-first list.
- `npm test` shows a focused entry on its own day and page even when a different day is saved.
- `npm test` accepts the stored page sizes "5", "10", and "15", and falls back to 10 for any other string.

---

## Phase 2: Trainee journal browser

### Overview

The trainee journal gets the date dropdown, the page-size dropdown, the pager, both empty sentences, and browser memory. Edit and delete still open the row they target. Smoke's visible trainee entries move to UTC today.

### Changes Required:

#### 1. Journal island

**File**: `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Replace the trainee's direct `MeasurementList` render with one client island that can change day and page size without a navigation. Row markup, delta text, notes, and the delete confirmation form move here from `MeasurementList.astro`.

**Contract**: Props are `entries` (already passed through `withDeltas`), `readOnly`, `editingId`, `confirmingId`, `accountUserId`, `subjectTraineeId`, `idPrefix`, and optional `today`. When `today` is omitted, use `utcToday(new Date())`. `readOnly` is false for the trainee. The focused id is `confirmingId` when set, otherwise `editingId`. Edit and delete hrefs stay `/measurements?edit=<id>` and `/measurements?delete=<id>`, keeping `edit` on the delete href when an edit is open. The cancel href stays `/measurements` or `/measurements?edit=<id>`. Native selects use the input border, height, and radius. Labels are `Date` and `Per page`. Option values are the date strings and `5`, `10`, `15`. The pager text is `Previous`, `Next`, and `Page X of Y`, rendered only when the filtered day has more rows than the page size. Empty copy is `No measurements yet` when `entries` is empty, and `No measurements on this day` when the day slice is empty. Both selects stay visible in those states. Changing the date writes the day key and sets page 1. Changing the page size writes the page-size key; with a focused row still on that day, the page follows that row, otherwise it becomes page 1. No account id means do not read or write storage (kitchen sink). `client:load`.

#### 2. Trainee wiring

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Show the island whenever measurements loaded, including the empty journal, and keep the server error path unchanged.

**Contract**: Pass the new props. `idPrefix` is applied to the select ids so the kitchen sink can mount more than one journal. Do not render `MeasurementList` from this file. The form and the load-error sentence stay as they are.

**File**: `src/pages/measurements.astro`

**Intent**: Give the trainee island the ids the storage keys need.

**Contract**: Pass `accountUserId` and `subjectTraineeId` as the signed-in user's id for the trainee branch. Do not change the trainer branch in this phase.

#### 3. Journal kitchen sink

**File**: `src/pages/kitchen-sink/journal.astro`

**Intent**: Keep the existing sample visible, and add the new empty-day sentence to the review surface.

**Contract**: The loaded sample state passes `today="2026-09-15"` so the sample row stays on screen. Add a state whose entries are that sample and whose `today` is a different day, expecting `No measurements on this day` and both dates in the list. The zero-entry state still expects `No measurements yet`. Leave `accountUserId` unset so the sink does not use storage.

#### 4. Trainee smoke dates

**File**: `scripts/smoke.mjs`

**Intent**: The default server view is UTC today, so the HTML assertions only pass if the rows they look for were stored on that day.

**Contract**: The first trainee's visible pair and the second trainee's visible pair use `utcDatePlusDays(0)` at `07:00` and `19:00`, with the same weights and notes as now. Rejected future dates, rejected weights, and rejected foreign writes may keep their current timestamps. Do not forbid an off-day note via the raw body.

#### 5. Token check file list

**File**: `scripts/check-home-tokens.mjs`

**Intent**: CI reads a hard-coded path list with `readFileSync` and throws when a path is missing. The new island has to be on that list as soon as it exists, or literal colours in it skip the check.

**Contract**: Add `src/components/measurements/MeasurementBrowser.tsx` to `FILES`. Leave `MeasurementList.astro` on the list until Phase 3 deletes that file.

### Success Criteria:

#### Automated Verification:

- `npm run lint` and `npx astro check` pass.
- `npm run smoke` shows "No measurements yet" for an empty trainee journal and the weight delta for two entries stored on UTC today.
- `npm test` passes.
- `npm run check:home-tokens` passes.

#### Manual Verification:

- Trainee Date and Per page controls offer the measurement days plus UTC today, and 5, 10, and 15; a fresh browser starts on UTC today and 10.
- A selected day with no rows shows "No measurements on this day" while other days remain in the date list.
- With no edit or delete target, Previous and Next appear only when the day has more rows than the page size; changing the day or the page size returns to page 1, and reload restores the saved day and page size.
- Edit and delete for a row on another day open that row's day and page, and do not replace the saved day until the date control changes.
- Kitchen sink journal still shows the 2026-09-15 sample when today is pinned to that day, and shows "No measurements on this day" when today is a different day.

**Implementation Note**: After the automated checks pass, pause for the manual checks before Phase 3.

---

## Phase 3: Trainer browser

### Overview

The trainer uses the same island. Page size is shared for the account. The selected day is stored per trainee. Trainer smoke still sees today's note and delta for the selected trainee only.

### Changes Required:

#### 1. Trainer wiring

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Page and filter the selected trainee's journal the same way, without edit or delete.

**Contract**: When a trainee is selected and measurements loaded, render `MeasurementBrowser` with `readOnly`, `accountUserId` of the signed-in trainer, and `subjectTraineeId` of `selectedLink.traineeId`. Include the empty journal, so a trainee with no rows still gets the dropdowns and `No measurements yet`. Do not render the island when no trainee is selected or the load failed. Stop using `MeasurementList.astro`.

**File**: `src/pages/measurements.astro`

**Intent**: Pass the trainer and trainee ids into `TrainerPanel`.

**Contract**: The trainer account id is the signed-in user id. The subject id stays the selected link's trainee id, already chosen by `selectTrainerPreview`.

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Remove the Astro list once both journals render the island.

**Contract**: Delete the file only after nothing imports it. In the same change, remove `src/components/measurements/MeasurementList.astro` from `FILES` in `scripts/check-home-tokens.mjs`. Leave `MeasurementBrowser.tsx` on that list. The script has no existence check, so a stale path fails CI.

#### 2. Trainer kitchen sink

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Keep the sample measurement visible under the pinned day, and show the empty-day sentence for a selected trainee.

**Contract**: States that render `sampleEntry` pass `today="2026-09-15"`. Add a selected-trainee state with that sample and a different `today`, expecting `No measurements on this day` and no Edit or Delete link. The existing zero-entry selected trainee still expects `No measurements yet`.

#### 3. Trainer smoke

**File**: `scripts/smoke.mjs`

**Intent**: Confirm the trainer HTML still shows only the selected trainee's visible rows after the shared island is on.

**Contract**: No new date literals if Phase 2 already stored the second trainee's pair on UTC today. The default trainer view still contains `laterNote` and `↓`, and does not contain `earlierNote`. Do not add a body `forbid` for a hidden day of the selected trainee.

### Success Criteria:

#### Automated Verification:

- `npm run lint` and `npx astro check` pass.
- `npm run smoke` shows the trainer's selected trainee note and delta from UTC today, and not the other trainee's note.
- `npm run check:home-tokens` passes.

#### Manual Verification:

- Switching trainees keeps one page size for the account and a separate date per trainee.
- The trainer list has no Edit or Delete links, and a selected trainee with no rows today shows "No measurements on this day".
- Kitchen sink trainer sample still renders when today is pinned to the sample day.

**Implementation Note**: After the automated checks pass, pause for the manual checks before treating the change as done.

---

## Testing Strategy

### Unit Tests:

- Date options: duplicate days collapse, UTC today is always present, order is newest first.
- Saved day and page size: the stored strings `"5"`, `"10"`, and `"15"` stick; missing, unknown, and any other string fall back to UTC today and 10.
- Filter and page: incoming order and delta objects stay intact; page 1 is the newest slice; the last page holds the remainder.
- Focused id: that row's day and page win over the saved day; an unknown id does not.

### Integration Tests:

- `npm run smoke` covers the default server view only: empty copy, today's weight delta, and the trainer's selected-trainee note. It does not execute the dropdowns or `localStorage`.

### Manual Testing Steps:

1. Sign in as a trainee with rows on two days, more than 10 on one day. Confirm UTC today, then the other day, then Next and Previous.
2. Choose 5 per page and another day, reload `/measurements`, and confirm both restored. Clear the site data and confirm today and 10 return.
3. Open edit and delete from a row on a non-saved day. Confirm that day is shown and the stored day is unchanged until the date dropdown moves.
4. Sign in as a trainer linked to two trainees. Set 15 per page and a day on the first, switch to the second, and confirm the page size stays 15 while the day is that trainee's own saved day or UTC today.
5. Compare `/kitchen-sink/journal` and `/kitchen-sink/trainer` for the sample row and `No measurements on this day`.

## Performance Considerations

The page already loads one trainee's full journal. The island receives that same list so a day change does not refetch. Slicing happens in memory. No query pagination is added, because deltas need the full set and the dropdown needs every day.

## Migration Notes

No database migration. A browser with no saved keys opens on UTC today and 10 per page. Existing rows stay in place; only the visible slice changes.

## References

- Issue: https://github.com/gmaszkiewicz/training-manager/issues/74
- Delta order: `src/lib/measurement-deltas.ts`
- Page data load: `src/pages/measurements.astro`
- Smoke fixtures: `scripts/smoke.mjs`
- UTC today constraint: `context/archive/2026-10-06-measured-on-with-time/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Day and page model

#### Automated

- [ ] 1.1 `npm test` shows each measurement day once, plus UTC today, newest first.
- [ ] 1.2 `npm test` falls back to UTC today when the saved day is absent, and to page size 10 unless the saved size is 5, 10, or 15.
- [ ] 1.3 `npm test` filters one calendar day without reordering or recomputing deltas, and page 1 is the first slice of that newest-first list.
- [ ] 1.4 `npm test` shows a focused entry on its own day and page even when a different day is saved.
- [ ] 1.5 `npm test` accepts the stored page sizes "5", "10", and "15", and falls back to 10 for any other string.

### Phase 2: Trainee journal browser

#### Automated

- [ ] 2.1 `npm run lint` and `npx astro check` pass.
- [ ] 2.2 `npm run smoke` shows "No measurements yet" for an empty trainee journal and the weight delta for two entries stored on UTC today.
- [ ] 2.3 `npm test` passes.
- [ ] 2.9 `npm run check:home-tokens` passes.

#### Manual

- [ ] 2.4 Trainee Date and Per page controls offer the measurement days plus UTC today, and 5, 10, and 15; a fresh browser starts on UTC today and 10.
- [ ] 2.5 A selected day with no rows shows "No measurements on this day" while other days remain in the date list.
- [ ] 2.6 With no edit or delete target, Previous and Next appear only when the day has more rows than the page size; changing the day or the page size returns to page 1, and reload restores the saved day and page size.
- [ ] 2.7 Edit and delete for a row on another day open that row's day and page, and do not replace the saved day until the date control changes.
- [ ] 2.8 Kitchen sink journal still shows the 2026-09-15 sample when today is pinned to that day, and shows "No measurements on this day" when today is a different day.

### Phase 3: Trainer browser

#### Automated

- [ ] 3.1 `npm run lint` and `npx astro check` pass.
- [ ] 3.2 `npm run smoke` shows the trainer's selected trainee note and delta from UTC today, and not the other trainee's note.
- [ ] 3.6 `npm run check:home-tokens` passes.

#### Manual

- [ ] 3.3 Switching trainees keeps one page size for the account and a separate date per trainee.
- [ ] 3.4 The trainer list has no Edit or Delete links, and a selected trainee with no rows today shows "No measurements on this day".
- [ ] 3.5 Kitchen sink trainer sample still renders when today is pinned to the sample day.
