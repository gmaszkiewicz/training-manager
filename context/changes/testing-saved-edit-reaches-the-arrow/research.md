---
date: 2026-10-06T17:32:43+02:00
researcher: gmaszkiewicz
git_commit: b349ed54f3f942df3c878f47446c1911f59589ac
branch: cursor/testing-saved-edit-reaches-the-arrow
repository: training-manager
topic: "Saved edit reaches the arrow"
tags: [research, codebase, measurements, smoke, deltas]
status: complete
last_updated: 2026-10-06
last_updated_by: gmaszkiewicz
---

# Research: Saved edit reaches the arrow

**Date**: 2026-10-06T17:32:43+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: b349ed54f3f942df3c878f47446c1911f59589ac
**Branch**: cursor/testing-saved-edit-reaches-the-arrow
**Repository**: training-manager

## Research Question

For rollout Phase 5 (`testing-saved-edit-reaches-the-arrow`), where does a persisted weight edit reach the listed difference, what does the existing comparison-rule unit already lock, and what must one smoke edit observe so the listed difference comes from the saved weight?

## Summary

On the trainee edit path inspected here, a successful `POST /api/measurements/[id]` writes `weight_kg` and a new `created_at` through `updateMeasurement`. The next `GET /measurements` selects those rows and passes them to `withDeltas`, which compares each row with the previous row after ordering by `measured_on`, then `created_at`, then `id`. `MeasurementList.astro` renders `formatDelta` as one text node: `↑ N.N`, `↓ N.N`, or `0.0`.

The Phase 1 unit already locks that rule on hand-built rows, including a saved weight of 81. In `scripts/smoke.mjs`, the string `↓ 1.5` appears once, after two creates (`2026-01-01` / `80.0`, then `2026-01-02` / `78.5`). No step in that file follows a successful edit with a new difference string. Phase 5 is that missing step, in the same file, while the first trainee is still signed in.

A weight of `81.0` on the `2026-01-02` row, with the date and note left as they are, is one planning choice that satisfies the constraints below. Against the untouched `80.0` row, `deltaBetween` yields 10 tenths up, and `formatDelta` yields `↑ 1.0`. The pre-edit string on that pair is `↓ 1.5`. If the write does not persist, the list still contains `↓ 1.5`.

## Detailed Findings

### The edit writes the weight, then the list computes the arrow

The edit form posts to `/api/measurements/${entry.id}` (`src/components/measurements/MeasurementForm.tsx:141-145`). The route parses the form with `createMeasurementInputSchema` and, on success, calls `updateMeasurement` and redirects to `/measurements` (`src/pages/api/measurements/[id].ts:34-58`). A schema failure or a failed update redirects to `/measurements?edit=<id>&error=...` (`src/pages/api/measurements/[id].ts:11-15`, `48-56`).

`updateMeasurement` updates `weight_kg`, `measured_on`, the seven circumference columns, `note`, and `created_at: new Date().toISOString()`, filtered by `id` and `trainee_id` (`src/lib/services/measurements.ts:77-94`). This application update sets `created_at`. Database triggers on that column were not inspected. `addMeasurement` does not set `created_at` in its insert object (`src/lib/services/measurements.ts:46-58`).

The trainee branch of `src/pages/measurements.astro` calls `listMeasurements` (`src/pages/measurements.astro:49-53`). That select has no `ORDER BY`. The column list includes `weight_kg` and `created_at` and does not include a stored delta. The returned rows go through `withDeltas` (`src/lib/services/measurements.ts:20-34`). Deltas on this path are computed at list time.

`compareEntries` orders by `measured_on`, then `created_at`, then `id`, and returns as soon as one of those fields differs (`src/lib/measurement-deltas.ts:3-22`). `withDeltas` compares each row with the previous row in that order. The first chronological row gets `deltas: null`. The returned list is newest first (`src/lib/measurement-deltas.ts:49-57`). `deltaBetween` subtracts tenths: `Math.round(current * 10) - Math.round(previous * 10)`. Zero tenths is `{ direction: "none", difference: 0 }`. Otherwise the direction is `up` or `down` and `difference` is `Math.abs(tenths) / 10` (`src/lib/measurement-deltas.ts:25-33`).

`formatDelta` returns `` `↑ ${difference.toFixed(1)}` ``, `` `↓ ${difference.toFixed(1)}` ``, or `"0.0"` (`src/lib/measurement-deltas.ts:60-68`). `MeasurementList.astro` puts that string in one `set:text` node when `entry.deltas` is present (`src/components/measurements/MeasurementList.astro:71-76`). The accessible name uses the words `up`, `down`, or `unchanged`, not the arrow characters (`src/components/measurements/MeasurementList.astro:27-29`). The note is inside the same `<li>` as the edit link (`src/components/measurements/MeasurementList.astro:42-49`, `95-98`). The trainee edit link is `/measurements?edit=<id>` (`src/components/journal/TraineeJournal.astro:25-27`).

### What the unit already locks, and what it does not

`src/lib/measurement-deltas.test.ts` calls `withDeltas` with `entry()` objects. The case "shows an increase of 1 kg after the earlier weight is saved as 81" builds rows of weight 81 and 82 in memory and expects `↑ 1.0` (`src/lib/measurement-deltas.test.ts:218-242`). It does not call the edit route. The case "shows Q up 2 kg and P down 1 kg after a note-only save" builds a later `created_at` on a shared `measured_on` and expects the previous row to change (`src/lib/measurement-deltas.test.ts:418-446`). Roadmap S-21 says a unit that builds the edited row in memory does not count for this slice (`context/foundation/roadmap.md:361`).

On the two smoke creates below, the dates differ, so `compareEntries` returns on `measured_on` before it reads `created_at`. The `created_at` rewrite on update does not change which row is previous for that pair, as long as the edit leaves `2026-01-01` and `2026-01-02` on different dates.

### What smoke already observes

`npm run smoke` runs `node scripts/smoke.mjs` (`package.json:16`). The CI `smoke` job builds, serves `npm run preview` on port 4321, and runs `BASE_URL=http://localhost:4321 npm run smoke` (`.github/workflows/ci.yml:57-61`). This inspected job does not start Playwright. An `e2e` job begins at `.github/workflows/ci.yml:65`; its steps were not read.

In `scripts/smoke.mjs`, a search for the string `↓ 1.5` matched one line. That step follows two creates and expects the body to contain `↓ 1.5` (`scripts/smoke.mjs:243-257`):

- `measurementForm("2026-01-01", "80.0")` (`scripts/smoke.mjs:245`)
- `measurementForm("2026-01-02", "78.5", earlierNote)` (`scripts/smoke.mjs:250`)
- `earlierNote` is `"smoke-earlier-trainee-note"` (`scripts/smoke.mjs:10`)

`measurementForm` sets all seven circumference fields to `"50.0"` (`scripts/smoke.mjs:35-47`). On this pair, `deltaBetween(78.5, 80.0)` is `Math.round(78.5 * 10) - Math.round(80.0 * 10) = -15` tenths, direction `down`, difference `1.5`, and `formatDelta` returns `↓ 1.5`. The same GET stores `measurementId` by finding `?edit=<uuid>` in the `<li>` that contains `earlierNote` (`scripts/smoke.mjs:144-162`, `253-256`). The next step signs that trainee out (`scripts/smoke.mjs:258`).

The four requests to `/api/measurements/${measurementId}` and `/delete` expect `error=` in the redirect (`scripts/smoke.mjs:374-381`, `383-390`, `442-459`). They are the second trainee and the trainer, and each sends weight `"78.5"`. They do not GET the journal afterward. The last primary-trainee GET expects `"Add measurement"` and `earlierNote`, and forbids `foreignWriteNote` (`scripts/smoke.mjs:475-479`). It does not expect `↓ 1.5`.

Body checks are global `includes` / `forbid` (`scripts/smoke.mjs:491-498`). A weight delta of `"0.0"` is a poor signal on this page: the newer row's seven circumference deltas are zero tenths when both rows are `50.0`, and `formatDelta` renders each of those as `0.0`.

`"81.0"` matches `ONE_DECIMAL_TEXT` (`/^\d+(?:[.,]\d)?$/`, `src/lib/measurement-input.ts:6`) and sits inside the weight bounds 20 and 400 (`src/lib/measurement-input.ts:69`, `144`). `"2026-01-02"` is earlier than UTC 2026-10-07, which is the latest date `measuredOn` accepts when `now` is 2026-10-06 (`src/lib/measurement-input.ts:82-85`, `112-114`).

### The smoke edit that shows the saved weight

Insert the step after the `↓ 1.5` GET and before sign-out (`scripts/smoke.mjs:253-258`), so `measurementId` is set and the first trainee's cookie is still in the jar. POST `/api/measurements/${measurementId}` with `measurementForm("2026-01-02", <saved weight>, earlierNote)`, expect status 302 and location exactly `/measurements`, then GET `/measurements`.

For saved weight `81.0`, previous weight `80.0`, and these two different dates: `deltaBetween(81.0, 80.0)` is `Math.round(81.0 * 10) - Math.round(80.0 * 10) = 10` tenths, direction `up`, difference `1.0`, and `formatDelta` returns `↑ 1.0`. That GET should contain `↑ 1.0` and exclude `↓ 1.5`. If the update leaves `78.5` stored, this same rule still produces `↓ 1.5`, so the new string is absent. Keeping `earlierNote` and `2026-01-02` leaves the later rejected-write URLs and the final journal check pointed at the same row.

The expected string is that tenths result for the two weights in the POST history. Calling `withDeltas` from the smoke script would repeat the pure rule the unit already locks (`context/foundation/test-plan.md:57`).

## Code References

- `src/pages/api/measurements/[id].ts:34-58` — edit POST parses the form, calls `updateMeasurement`, redirects to `/measurements`
- `src/lib/services/measurements.ts:77-94` — update writes `weight_kg` and `created_at`
- `src/lib/services/measurements.ts:23-34` — list select feeds `withDeltas`; no stored delta column
- `src/lib/measurement-deltas.ts:3-68` — order, tenths delta, `formatDelta` strings
- `src/components/measurements/MeasurementList.astro:71-76` — one text node for the arrow string
- `scripts/smoke.mjs:243-258` — two creates, `↓ 1.5`, then sign-out
- `src/lib/measurement-deltas.test.ts:218-242` — in-memory saved weight 81

## Architecture Insights

Edit and delete change the rows the next list passes into `withDeltas`. This path does not store a comparison chain. A same-date note-only save can change which row is previous because the update rewrites `created_at`; the Phase 1 unit already builds that case. A smoke edit that keeps the two existing dates apart checks the saved weight without that reorder.

The visible difference smoke can see is the `formatDelta` text node. The accessible name spells `up` or `down` instead of `↑` or `↓`.

## Historical Context (from prior changes)

- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md:78` — **Partial.** The behavior claim holds for the two steps it names: the create-delta step still expects `↓ 1.5` and does not edit, and the trainer step expects `↓` (`scripts/smoke.mjs:436`) rather than `↓ 1.5`. The cited lines `scripts/smoke.mjs:199-201` do not match this tree; the create-delta step is `scripts/smoke.mjs:253-257`. The file now also has rejected update and delete requests (`scripts/smoke.mjs:374-390`, `442-459`).
- `context/changes/test-plan-refresh/research.md:68` — **Supported** on the weights and the string: `2026-01-01` / `80.0`, then `2026-01-02` / `78.5`, then `↓ 1.5`. **Partial** on the span `scripts/smoke.mjs:244-256`; the current block is `scripts/smoke.mjs:243-257`.
- `context/changes/test-plan-refresh/research.md:68` — **Supported** for the four id-specific calls it names. Those lines are still rejected updates and deletes (`scripts/smoke.mjs:376`, `385`, `445`, `454`). The sentence does not say those are the only measurement requests; creates use `/api/measurements` without an id.
- `context/changes/test-plan-refresh/plan.md:11` — **Supported** that the saved-81 case builds the row in memory. The test still starts at `src/lib/measurement-deltas.test.ts:218`. Its assertions continue through line 242, so the cited end line 232 stops before the `formatDelta` expectation.
- `context/foundation/test-plan.md:57` — **Supported** as the current contract: keep the comparison-rule unit, add one smoke edit whose listed difference comes from the saved weight, and do not add a new in-memory unit, a request that only repeats `withDeltas`, or Playwright for this write.
- `context/foundation/test-plan.md:154` — **Supported** that section 6.4 still says the saved-edit pattern is TBD. Section 5 still marks the saved-edit step planned until Phase 5 lands (`context/foundation/test-plan.md:119`).
- `context/foundation/prd.md:92-96` — **Supported** as the product rule this path implements: compare with the immediately previous remaining entry; the oldest remaining entry has no delta. US-01 and FR-004 name edit as a must-have (`context/foundation/prd.md:48-58`, `71-72`).

## Related Research

- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md` — comparison rule and the in-memory post-edit rows
- `context/changes/test-plan-refresh/research.md` — why the persisted edit was split out of that unit
- `context/archive/2026-10-04-testing-reject-illegal-measurements/research.md` — the future-date smoke step already in this script; not the edit path

## Open Questions

- Which legal weight the new POST sends is a planning choice. It must stay within 20 and 400, use at most one decimal, keep `measured_on` of `2026-01-02` and `earlierNote`, and produce a `formatDelta` string other than `↓ 1.5` and other than `0.0`. Saved weight `81.0` yields `↑ 1.0` against the untouched `80.0` row, under the arithmetic in Detailed Findings. No earlier document locks that digit.
