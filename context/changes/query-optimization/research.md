---
date: 2026-10-10T06:43:19+02:00
researcher: Grok 4.7
git_commit: 6b5710ed752f2f5f62baf4a36e824c13dc01cd12
branch: cursor/query-optimization
repository: training-manager
topic: "What still walks the journal when the calendar-month measurement page is built"
tags: [research, codebase, measurements, pagination, deltas, query-optimization]
status: complete
last_updated: 2026-10-10
last_updated_by: Grok 4.7
---

# Research: What still walks the journal when the calendar-month measurement page is built

**Date**: 2026-10-10T06:43:19+02:00
**Researcher**: Grok 4.7
**Git Commit**: 6b5710ed752f2f5f62baf4a36e824c13dc01cd12
**Branch**: cursor/query-optimization
**Repository**: training-manager

## Research Question

For S-24 / MS-16 ([issue #77](https://github.com/gmaszkiewicz/training-manager/issues/77)): how is the calendar-month measurement page built today, and which read still walks the whole journal, so a later plan can keep the same rows, order, page size, and difference versus the previous entry — including when that previous entry sits outside the page — for both the trainee and a linked trainer?

## Summary

On the inspected `readMeasurementPage` path, the list body is one `.range` inside one calendar month. `selectPage` filters one `trainee_id` and a half-open `measured_on` window, orders `measured_on` descending then `id` descending, and applies `.range` for the requested page size (`src/lib/services/measurements.ts:147-165`). When that page is non-empty, `selectOlderRow` loads one earlier row with `.limit(1)` and no month filter (`src/lib/services/measurements.ts:174-186`). `deltasForVisiblePage` runs `withDeltas` on the visible rows plus that older row, then drops the older row (`src/lib/measurement-page.ts:182-188`).

The read on that path whose filter is only `trainee_id` is `selectMeasuredOn`. It selects `measured_on`, ordered ascending, in ranges of 1000, and requests the next range when a response length equals 1000 (`src/lib/services/measurements.ts:91-121`). `readMeasurementPage` calls it before the page query and turns the timestamps into `YYYY-MM` names (`src/lib/services/measurements.ts:218-225`, `src/lib/measurement-page.ts:166-170`). That catalog is what still walks the journal. S-23 already specified this month-name read; MS-16 asks for the same page without walking the whole journal (`context/foundation/roadmap.md:44`).

The trainee document render and the linked-trainer document render both call `readMeasurementPage`. The trainer passes `selectedLink.traineeId` and `focusId: null` (`src/pages/measurements.astro:84-90`, `src/pages/measurements.astro:123-128`). `GET /api/measurements` calls the same function (`src/pages/api/measurements/index.ts:75-81`).

No query plan was captured. Whether Postgres uses `measurements_trainee_id_measured_on_key` is not observed.

## Detailed Findings

### Shared page read

A repo search for `readMeasurementPage` in `*.{ts,astro,toml,mjs}` found three call sites:

- Trainee HTML at `src/pages/measurements.astro:84-90`: `user.id`, `page: 1`, `focusId: deleteId ?? editId`.
- Linked trainer HTML at `src/pages/measurements.astro:123-128`: `selectedLink.traineeId`, `page: 1`, `focusId: null`, after `selectTrainerPreview`.
- `GET /api/measurements` at `src/pages/api/measurements/index.ts:64-81`. A trainer must pass a UUID `trainee` query param (`index.ts:65-70`). This handler does not query `trainer_links` before the read.

The same search found no `listMeasurements` symbol in those extensions. Archived S-23 plan text still names `listMeasurements` as the read Phase 4 replaced (`context/archive/2026-10-08-pagination-and-filter-measurements/plan.md:268-270`).

`MeasurementBrowser` treats the payload as a server page when `dates`, `page`, and `pageCount` are all present (`src/components/measurements/MeasurementBrowser.tsx:254`). `TraineeJournal` forwards those props (`src/components/journal/TraineeJournal.astro:65-70`). The kitchen-sink journal omits them (`src/pages/kitchen-sink/journal.astro:55`), so that fixture takes the in-memory branch: `filterByMonth` and `pageSlice` (`MeasurementBrowser.tsx:361-375`). That branch does not call Supabase.

### Visible page is one month and one page

`monthWindow("2026-01")` returns `2026-01-01T00:00:00` inclusive and `2026-02-01T00:00:00` exclusive. `monthWindow("2026-12")` ends at `2027-01-01T00:00:00` (`src/lib/measurement-page.ts:151-159`). `selectPage` applies that window with `.gte` / `.lt`, requests `count: "exact"`, and returns `.range((page - 1) * pageSize, page * pageSize - 1)` (`src/lib/services/measurements.ts:155-165`).

`readMeasurementPage` passes `selected.count` to `resolveMeasurementPage` as the row count used for `pageCount` (`src/lib/services/measurements.ts:260`, `src/lib/measurement-page.ts:173-179`). If the resolved page differs from the requested page, `selectPage` runs a second time for the resolved page (`measurements.ts:261-265`). Both calls keep the same month window and page size.

Page sizes accepted by `parsePageSize` are 5, 10, and 15; any other input returns the default 10 (`src/lib/measurement-page.ts:4-8`, `src/lib/measurement-page.ts:37-47`). `GET` rejects a size outside `"5" | "10" | "15"` with 400 (`src/pages/api/measurements/index.ts:50-52`).

When `focusId` is set and `getMeasurement` returns a row, the month becomes that row's `YYYY-MM` prefix and the page becomes `pageContaining(newer.count, pageSize)` (`measurements.ts:229-251`). `countNewerInMonth` counts with `head: true` inside the same month window plus `strictlyAfterFilter` (`measurements.ts:124-138`). `pageContaining` is `Math.floor(newerInMonth / pageSize) + 1` (`measurement-page.ts:162-163`). The trainer HTML call passes `focusId: null`, so this branch is not taken on that render.

### The journal walk is the month catalog

`selectMeasuredOn` has no month predicate. Each request is `.eq("trainee_id", traineeId).select("measured_on").order("measured_on", { ascending: true }).range(from, from + 999)` (`measurements.ts:101-106`). `MEASURED_ON_PAGE` is 1000 (`measurements.ts:91`). A response shorter than 1000 rows ends the loop; a response of 1000 rows advances `from` by 1000 (`measurements.ts:116-120`).

`measurementMonths` maps those strings through `measurementMonth`, which keeps the first seven characters after replacing a space with `T`, inserts the UTC-today month when it is absent, and sorts newest first (`measurement-page.ts:10-12`, `measurement-page.ts:99-112`, `measurement-page.ts:166-170`). `readMeasurementPage` uses that list both as `dates` and to decide whether `input.month` is kept (`measurements.ts:223-226`).

Local `supabase/config.toml:18` sets `max_rows = 1000`. The loop's stop condition is a response shorter than that same number. This research did not read a hosted `max_rows` and did not run the query against a journal of more than 1000 rows. The S-23 impl review described an earlier `selectMeasuredOn` with no order and no limit, capped silently at 1000, and recorded the decision FIXED by reading in order until a short page (`context/archive/2026-10-08-pagination-and-filter-measurements/reviews/impl-review.md:43-55`). The current loop matches that fix text. The review's "no order and no limit" sentence does not describe the current function.

### Difference when the previous entry is outside the page

`oldestRow` picks the least `measured_on`, then the least `id`, among the rows `selectPage` returned (`measurements.ts:50-61`). `selectOlderRow` loads one row for the same `trainee_id` matching `strictlyBeforeFilter`: `measured_on` less than that value, or equal `measured_on` and a smaller `id` (`measurements.ts:38-41`, `measurements.ts:179-186`). There is no month bound on that query.

`withDeltas` sorts by `measured_on` ascending, then `id` ascending, and sets `deltas: null` on index 0 (`src/lib/measurement-deltas.ts:3-50`). `deltasForVisiblePage` appends the older row when it is non-null, then filters the result to the visible ids (`measurement-page.ts:182-188`).

The unit test `deltasForVisiblePage` builds an in-memory journal and does not call Supabase. For January 2026, page 1, size 5, the older id is `a` and row `b` has weight delta `{ direction: "up", difference: 1 }`. For page 2, the visible id is `a` and the older id is `dec-b`, whose month is `2025-12`, with the same weight delta (`src/lib/measurement-page.test.ts:334-349`). A separate case with one row expects `older` null and `deltas: null` (`measurement-page.test.ts:352-357`).

### Indexes and select policies

`20261006220000_measured_on_timestamp.sql:43-46` drops `measurements_trainee_id_measured_on_created_at_idx` and creates unique index `measurements_trainee_id_measured_on_key` on `(trainee_id, measured_on)`. No `EXPLAIN` for `selectMeasuredOn`, `selectPage`, `selectOlderRow`, or `countNewerInMonth` is in the repo, so index use is not observed.

Select policies on `public.measurements` in the inspected migrations:

- `measurements_select_own`: `auth.uid() = trainee_id` (`supabase/migrations/20260928043200_trainee_measurements.sql:31-35`).
- `measurements_select_linked_trainer`: a `trainer_links` row whose `trainer_id` is `auth.uid()` and whose `trainee_id` is `measurements.trainee_id` (`supabase/migrations/20260928170000_trainer_links.sql:77-81`).

The service queries also pass `.eq("trainee_id", traineeId)`. This research did not execute an unlinked trainer request, so the empty-versus-error result of that case is not observed.

## Code References

- `src/lib/services/measurements.ts:91-122` — `selectMeasuredOn`, the unfiltered-by-month timestamp catalog
- `src/lib/services/measurements.ts:147-172` — `selectPage`, month window, exact count, one range
- `src/lib/services/measurements.ts:174-193` — `selectOlderRow`, one earlier row
- `src/lib/services/measurements.ts:195-286` — `readMeasurementPage` order of those reads
- `src/lib/measurement-page.ts:151-189` — `monthWindow`, `measurementMonths`, `deltasForVisiblePage`
- `src/lib/measurement-deltas.ts:3-51` — chronological predecessor; `deltas: null` at sorted index 0, then newest-first reverse
- `src/pages/measurements.astro:84-128` — trainee and trainer document reads
- `src/pages/api/measurements/index.ts:37-97` — same read for later month, page, and size changes
- `supabase/migrations/20261006220000_measured_on_timestamp.sql:43-46` — unique `(trainee_id, measured_on)`
- `supabase/config.toml:18` — local `max_rows = 1000`

## Architecture Insights

The page the user sees and the month dropdown are separate reads inside one function. Shortening the dropdown read can leave `selectPage` and `selectOlderRow` as they are. `selectPage`'s `count: "exact"` is the count for that month window, which `resolveMeasurementPage` turns into `pageCount`. It is not the unfiltered journal scan. `selectOlderRow` is one row, and the S-23 contract depends on that row existing when a predecessor sits outside the page.

`MeasurementBrowser`'s in-memory `viewOf` / `pageSlice` path runs when the paging props are absent. The `/measurements` render that loads data passes those props. A plan that only changes `readMeasurementPage` does not by itself change the kitchen-sink slice.

## Historical Context (from prior changes)

- Supported as the current contract: S-23 Phase 4 says the month-name read selects `measured_on` only, the page read is one trainee and one month window with the exact count, and the older-row read is one full row strictly before the oldest visible row (`context/archive/2026-10-08-pagination-and-filter-measurements/plan.md:260-270`). The three functions above match that wording.
- Supported as the user-facing bar for S-24: MS-16 and the S-24 outcome ask for that same page without walking the whole journal (`context/foundation/roadmap.md:44`, `context/foundation/roadmap.md:395`). Issue #77 repeats the outcome and names prerequisite S-23. `context/changes/query-optimization/change.md` has no plan and no research before this file.
- Historical, not current code: the S-23 impl review's F2 detail says `selectMeasuredOn` had no order and no limit (`impl-review.md:49`). The same finding's decision is FIXED (`impl-review.md:55`), and the current function orders and loops. The "no order and no limit" sentence is contradicted by `measurements.ts:101-120`.
- Historical, superseded for sort keys: the S-02 plan sorted by `measured_on`, then `created_at`, then `id` (`context/archive/2026-09-27-trainee-measurement-delta/plan.md`). The S-22 plan states chronological order is `measured_on`, then `id` (`context/archive/2026-10-06-measured-on-with-time/plan.md`). Current `compareEntries` uses `measured_on` then `id` and does not read `created_at` (`measurement-deltas.ts:3-16`).

## Related Research

S-23 has no `research.md`. The closest prior research is `context/archive/2026-10-06-measured-on-with-time/research.md` (timestamp uniqueness that the current unique index enforces) and `context/archive/2026-09-27-trainee-measurement-delta/` (original full-list `withDeltas` path, since replaced for the journal page).

## Open Questions

- The mechanism that replaces `selectMeasuredOn` is not chosen. `change.md` does not pick SQL, an index, or a stored month list.
- Whether the month-window `count: "exact"` is part of "walking the whole journal" is not defined in MS-16. In this code that count is scoped to the month window (`measurements.ts:157-162`).
- Hosted `max_rows` and the plans for these four queries were not measured. Local config is `max_rows = 1000` (`supabase/config.toml:18`).
- No test in the inspected set executes `selectPage`, `selectOlderRow`, or `selectMeasuredOn` against PostgREST. The off-page delta assertion is in memory (`measurement-page.test.ts:334-349`).
