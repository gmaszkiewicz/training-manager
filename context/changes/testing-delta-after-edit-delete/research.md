---
date: 2026-10-04T06:45:24+02:00
researcher: Grok 4.7
git_commit: 0ce889d000f94483dad335d3dd5165a5bfeb27ba
branch: cursor/phased-test-plan
repository: training-manager
topic: "What previous entry, zero difference, and trainer preview does the delta chain use after edit and delete?"
tags: [research, codebase, measurement-deltas, edit, delete, trainer-preview]
status: complete
last_updated: 2026-10-04
last_updated_by: Grok 4.7
---

# Research: What previous entry, zero difference, and trainer preview does the delta chain use after edit and delete?

**Date**: 2026-10-04T06:45:24+02:00
**Researcher**: Grok 4.7
**Git Commit**: 0ce889d000f94483dad335d3dd5165a5bfeb27ba
**Branch**: cursor/phased-test-plan
**Repository**: training-manager

## Research Question

Phase 1 of `context/foundation/test-plan.md` ("Delta after edit and delete") asks what "previous" is keyed on, how a saved edit or delete changes that chain, what a zero difference shows, and whether a linked trainer's preview uses the same comparison as the trainee list. The same phase asks whether a saved edit, delete, or preview can diverge from that rule, which is the gate for a thin integration test.

## Summary

On commit `0ce889d000f94483dad335d3dd5165a5bfeb27ba`, the comparison is computed when the list is read. `withDeltas` sorts by `measured_on`, then `created_at`, then `id`, all ascending, compares each later entry with the one immediately before it, and gives the first entry in that order `deltas: null` (`src/lib/measurement-deltas.ts:3-58`). The page then shows that list newest first. A difference that rounds to zero tenths is `{ direction: "none", difference: 0 }`, and `formatDelta` renders that as `0.0` (`src/lib/measurement-deltas.ts:25-33`, `src/lib/measurement-deltas.ts:60-68`).

`updateMeasurement` writes the date, the eight numbers, the note, and a new `created_at` on that one row (`src/lib/services/measurements.ts:77-94`). `deleteMeasurement` removes that one row (`src/lib/services/measurements.ts:112-117`). Neither write stores a delta or a previous-entry pointer. The next `listMeasurements` call passes the selected rows to `withDeltas` (`src/lib/services/measurements.ts:28-34`).

The trainee journal and the linked-trainer preview on `/measurements` both call that function. They do not share one computed array. When no pair compares equal on `measured_on`, `created_at`, and `id`, both calls sort to the same order and attach the same predecessor. A unit test of `withDeltas` on the post-write rows locks this function's output for those rows. It does not lock the update statement or the page call. On these paths, the save and the preview do not keep a second comparison, so a thin integration is not required to prove the chain matches the rule. The `created_at` rewrite can still change which same-date row is previous; that is this rule applied to the new timestamp, and the edit plan brief that says `created_at` is left alone is contradicted by the signed plan and by this update.

## Detailed Findings

### Previous entry

`compareEntries` returns a negative number when the left entry's `measured_on` is less than the right entry's, then applies the same comparison to `created_at`, then to `id` (`src/lib/measurement-deltas.ts:3-22`). `withDeltas` copies the input, sorts with that function, and for index 0 sets `deltas: null`. For each later index it calls `deltasAgainst` with that entry and `chronological[index - 1]`, then reverses the array (`src/lib/measurement-deltas.ts:49-57`).

`deltasAgainst` builds one object whose keys are `weight_kg`, `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, and `navel_cm` (`src/lib/measurement-deltas.ts:36-46`). It does not read `note`.

`listMeasurements` selects `id, measured_on, created_at, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm, note` for one `trainee_id` and does not add an `order` (`src/lib/services/measurements.ts:20-34`). A search of `src` for `withDeltas` at this commit matches the definition, that service call, and `src/lib/measurement-deltas.test.ts`.

The generated `measurements` row has those columns and no delta column (`src/db/database.types.ts:32-46`). `created_at` is `timestamptz not null default now()` (`supabase/migrations/20260928043200_trainee_measurements.sql:14`).

### Edit and delete

Value edits, note edits, and date edits share one update payload. `updateMeasurement` sets `measured_on`, the eight numbers, `note`, and `created_at: new Date().toISOString()` on the row whose `id` and `trainee_id` match, then selects `id` (`src/lib/services/measurements.ts:77-94`). `POST /api/measurements/[id]` parses the full form with `createMeasurementInputSchema` and calls that function (`src/pages/api/measurements/[id].ts:34-53`).

Because the sort uses `created_at` after `measured_on`, a save that leaves `measured_on` and the numbers unchanged still moves that row later among rows that share `measured_on`. The next read matches `withDeltas` on the rows stored after that rewrite. It does not match a recompute that still used the previous `created_at`.

`deleteMeasurement` deletes the row matching `id` and `trainee_id` and selects `id` (`src/lib/services/measurements.ts:112-117`). `POST /api/measurements/[id]/delete` calls that function (`src/pages/api/measurements/[id]/delete.ts:44`). This function does not update another row's `created_at`.

The local API config says the maximum number of rows returned from a table is 1000 (`supabase/config.toml:16-18`). `listMeasurements` does not set a range. This research did not read the hosted project's API settings. For the two-entry and three-entry chains in the edit and delete plans, that cap is not the comparison input.

### Zero difference

`deltaBetween` sets `tenths` to `Math.round(current * 10) - Math.round(previous * 10)`. When `tenths === 0`, it returns `{ direction: "none", difference: 0 }` (`src/lib/measurement-deltas.ts:25-28`). `formatDelta` returns the string `0.0` for `direction: "none"` (`src/lib/measurement-deltas.ts:66-67`).

`MeasurementList` renders that string when `entry.deltas` is present (`src/components/measurements/MeasurementList.astro:71-76`). When `deltas` is null, that paragraph is absent. The accessible name uses the word `unchanged` when `direction` is `none` (`src/components/measurements/MeasurementList.astro:27-29`).

The equal-weight unit test expects `{ direction: "none", difference: 0 }` and the string `0.0` (`src/lib/measurement-deltas.test.ts:75-85`). The 1.5 kg decrease test expects the other seven fields in that object to be `{ direction: "none", difference: 0 }` (`src/lib/measurement-deltas.test.ts:49-58`).

### Trainer preview

On `/measurements`, a trainee calls `listMeasurements(supabase, user.id)` (`src/pages/measurements.astro:49-53`). A trainer calls `listMeasurements(supabase, selectedLink.traineeId)` after `selectTrainerPreview` picks a link (`src/pages/measurements.astro:70-80`). Both assign `listed.entries` to the same `entries` variable. `TraineeJournal` passes those entries to `MeasurementList` with edit and delete hrefs (`src/components/journal/TraineeJournal.astro:54-60`). `TrainerPanel` passes `entries` and does not pass those hrefs (`src/components/trainer/TrainerPanel.astro:83`).

The trainee select policy is `auth.uid() = trainee_id` (`supabase/migrations/20260928043200_trainee_measurements.sql:31-35`). The linked-trainer select policy admits rows whose `trainee_id` is linked to `auth.uid()` (`supabase/migrations/20260928170000_trainer_links.sql:77-81`). Neither policy in those statements filters by date.

The two screens therefore run `withDeltas` on separate requests. They do not share one result object. Kitchen-sink pages are outside this phase: `context/foundation/test-plan.md` §7 excludes them.

### Tests already present

`npm test` is `vitest run` (`package.json:17`). Vitest includes `src/**/*.test.ts` (`vitest.config.ts:11`).

`src/lib/measurement-deltas.test.ts` calls `withDeltas` directly. The cases in that file are: empty list; one entry with `deltas: null`; a 1.5 kg decrease; a 0.2 increase from 80.1 to 80.3; equal weight as `0.0`; newest-first order; a date slotted between two neighbors; same-date order by `created_at`; a same-date and same-`created_at` tie broken by `id`. The helper in that file sets `note: null` (`src/lib/measurement-deltas.test.ts:15`), and a search of that file finds no other `note:` assignment. The same-date test uses weights 80 and 81 on one `measured_on` and expects `↑ 1.0` (`src/lib/measurement-deltas.test.ts:147-168`). The id-tie test uses weights 80 and 82 on one date and expects `up` with difference `2` (`src/lib/measurement-deltas.test.ts:172-190`).

`scripts/smoke.mjs` is outside that Vitest include. After two creates, one step expects the body to contain `↓ 1.5` (`scripts/smoke.mjs:199-201`). A later trainer step expects the body to contain `↓` (`scripts/smoke.mjs:338`). Those steps do not edit or delete a measurement, and the trainer step does not expect the trainee string `↓ 1.5`.

Those two cases are not the edit plan's pair of different dates (80.0 kg on 2026-01-01 and 82.0 kg on 2026-01-08, then 81.0 kg) or the delete plan's three dates (80.0, 82.0, and 81.0). Because `withDeltas` takes the row array as its input, those chains are further inputs to this function. They are not a second comparison implementation.

### What that means for the phase-1 layer

A saved edit or delete on these paths does not store a chain that the next read could ignore. The next successful list is `withDeltas` of the rows that select returned. The trainer preview uses that same call. A unit test that passes the post-edit or post-delete rows to `withDeltas` is the check that matches this code.

A test of `withDeltas` does not fail if `updateMeasurement` stops writing `created_at`, and it does not fail if `TrainerPanel` later formats arrows itself. The same-date consequence of the timestamp rewrite can still be locked by passing two rows that share `measured_on` and giving the edited row the later `created_at`. Proving the update statement writes that timestamp is a check of `updateMeasurement`, not a second delta rule.

## Code References

- `src/lib/measurement-deltas.ts:3-58` — sort, predecessor, null delta on the first sorted entry, newest-first return
- `src/lib/measurement-deltas.ts:25-33` — zero tenths becomes `direction: "none"`
- `src/lib/measurement-deltas.ts:60-68` — `none` formats as `0.0`
- `src/lib/services/measurements.ts:23-34` — list selects rows and calls `withDeltas`
- `src/lib/services/measurements.ts:77-94` — update writes fields and a new `created_at`
- `src/lib/services/measurements.ts:112-117` — delete removes one owned row
- `src/pages/measurements.astro:49-53` — trainee list
- `src/pages/measurements.astro:76-80` — linked trainer list
- `src/components/measurements/MeasurementList.astro:71-76` — renders a delta when `entry.deltas` is present
- `src/lib/measurement-deltas.test.ts:22-192` — current `withDeltas` cases

## Architecture Insights

The chain is a pure function of the rows handed to it. Edit and delete change that input: an edit replaces one row's stored fields and timestamp, and a delete removes one row. Display formatting is `formatDelta` on the object `withDeltas` already attached. The trainer panel does not sort or subtract on its own on this page.

## Historical Context (from prior changes)

Each claim below is scored against the code and the PRD read for this research.

- **Supported.** The PRD says each listed measurement shows the difference versus the immediately previous entry, a first entry has no fake comparison, and delete uses the remaining previous entry (`context/foundation/prd.md:55-56`, `context/foundation/prd.md:74`). Business Logic says the comparison target is the immediately previous remaining entry, notes are not compared, and the oldest remaining entry has no delta (`context/foundation/prd.md:92-96`). A linked trainer sees the same list, including arrows and differences (`context/foundation/prd.md:84`, `context/foundation/prd.md:98`).
- **Supported in the S-02 plan; absent from the PRD sections read here.** Those sections do not name `measured_on`, `created_at`, or `id`. The S-02 plan does: ascending `measured_on`, then `created_at`, then `id`, with `0.0` and no arrow when tenths are zero (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:23-25`, `context/archive/2026-09-27-trainee-measurement-delta/plan.md:61`, `context/archive/2026-09-27-trainee-measurement-delta/plan.md:157`). The current `withDeltas` and `formatDelta` match that contract.
- **Supported.** The signed edit plan says a save sets `created_at` even when no other field changes, so a same-date row becomes the newest of that date (`context/archive/2026-10-02-edit-measurement-entry/plan.md:19`, `context/archive/2026-10-02-edit-measurement-entry/plan.md:55`). `updateMeasurement` writes that timestamp (`src/lib/services/measurements.ts:90`). The implementation review records that the journal checks were confirmed after that save behavior was in place (`context/archive/2026-10-02-edit-measurement-entry/reviews/impl-review.md:26`).
- **Contradicted.** The edit plan brief says `created_at` is not written, so editing numbers or the note does not reshuffle rows that share a date (`context/archive/2026-10-02-edit-measurement-entry/plan-brief.md:26`, `context/archive/2026-10-02-edit-measurement-entry/plan-brief.md:49`). The update payload and the signed plan contradict that sentence. The brief's numeric examples (81.0 kg, and a date moved to 2025-12-28) are the same examples as the signed plan and are not contradicted by the sort rule.
- **Supported.** The delete plan's remaining chain is `withDeltas` again after one row is removed, and delete does not write `created_at` on a remaining row (`context/archive/2026-10-02-delete-measurement-entry/plan.md:19`, `context/archive/2026-10-02-delete-measurement-entry/plan.md:41`, `context/archive/2026-10-02-delete-measurement-entry/plan.md:49`). `deleteMeasurement` matches the "one row, no neighbor update" part of that plan.
- **Partial.** Roadmap S-02, S-04, S-05, and S-06 are `done` (`context/foundation/roadmap.md:50-54`). Their outcomes match the PRD sentences above. S-04's outcome does not add the words "after a later edit or delete"; the edit and delete plans do say the linked trainer sees the updated arrows.

## Related Research

`context/archive/2026-09-29-trainee-journal-ui/research.md`, `context/archive/2026-09-29-product-home/research.md`, and `context/archive/2026-09-29-auth-signin-form/research.md` are the research files found under `context/`. The journal one, read for its header and summary, answers a design-token question. None of the three is this delta-chain question.

## Open Questions

Hosted Supabase's maximum rows per table response was not read. The local file sets that maximum to 1000, and `listMeasurements` does not page. That gap does not change the two-entry and three-entry chains in the signed edit and delete plans.
