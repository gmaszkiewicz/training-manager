---
date: 2026-10-11T14:08:31+02:00
researcher: gmaszkiewicz
git_commit: 4a8939d2888e49841bf870df8e7bd8cd2da29b86
branch: cursor/preview-for-new-entry
repository: training-manager
topic: "Preview the delta versus the previous entry from the new entry date"
tags: [research, codebase, measurements, deltas, measurement-form]
status: complete
last_updated: 2026-10-11
last_updated_by: gmaszkiewicz
---

# Research: Preview the delta versus the previous entry from the new entry date

**Date**: 2026-10-11T14:08:31+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: 4a8939d2888e49841bf870df8e7bd8cd2da29b86
**Branch**: cursor/preview-for-new-entry
**Repository**: training-manager

## Research Question

While a trainee fills in a new measurement entry, what already exists for showing the difference versus the previous entry chosen from the date typed on that entry, and for copying one specific value or all values from that previous entry?

Source of the question: `context/changes/preview-for-new-entry/change.md` (S-26, MS-18).

## Summary

On the inspected new-entry path, the form collects a date and time plus eight numeric fields and an optional note, then posts them. It does not look up a previous entry, does not show a delta, and does not copy values.

The saved list already has the comparison the preview should match. For two saved rows, the previous entry is the nearest earlier one by `measured_on`, then `id`. In the unit test where the later row is 78.5 kg on `2026-09-11` and the earlier row is 80 kg on `2026-09-10`, that comparison is `{ direction: "down", difference: 1.5 }` and the displayed string is `↓ 1.5` (`src/lib/measurement-deltas.test.ts:38-47`, formula at `src/lib/measurement-deltas.ts:19-27`). The chronologically first row in the compared set gets `deltas: null` (`src/lib/measurement-deltas.ts:45-47`).

MS-18 chooses that previous entry from the date typed on the new entry (`context/foundation/roadmap.md:46`). The control on the form is `datetime-local`, so the typed value is a minute, not a calendar date alone (`src/components/measurements/MeasurementForm.tsx:164-168`). For a typed minute that is strictly between two saved timestamps, the same order used by `compareEntries` selects the latest saved row whose `measured_on` is less than that minute. The S-26 risk is picking some earlier row other than that immediate predecessor (`context/foundation/roadmap.md:430`). A search of `src` for `measured_on.lt` and `.lt("measured_on"` found `strictlyBeforeFilter`, which also requires a saved `id`, and the month-window upper bound in `selectPage` and `countNewerInMonth` (`src/lib/services/measurements.ts:41`, `104`, `129`). That search did not find a query for the latest row before an unsaved minute.

`MeasurementForm` receives no entries, so the month page under the form is not available to it (`src/components/journal/TraineeJournal.astro:56-57`). The list's `entries` are one calendar month page. `selectOlderRow` loads one extra earlier row for the oldest row on that page, and `deltasForVisiblePage` removes that extra row from the returned list (`src/lib/services/measurements.ts:141-153`, `236-244`; `src/lib/measurement-page.ts:182-188`).

## Detailed Findings

### Written outcome

S-26's outcome is a preview, while filling in the new entry, of the difference versus the previous entry chosen from the date typed for that entry, plus copying one specific value or all values from that previous entry (`context/foundation/roadmap.md:421-430`). Prerequisites recorded there are S-02, S-13, and S-22. MS-18 uses the same sentence (`context/foundation/roadmap.md:46`). `context/foundation/prd.md` has no MS-18 section; the comparison rule that already ships is in Business Logic (`context/foundation/prd.md:92-96`).

That business rule compares each entry to the immediately previous remaining entry for that trainee. Notes are outside the comparison. The oldest remaining entry has no delta. Good/bad coloring is a non-goal (`context/foundation/prd.md:116`).

The heading and the change notes name a new entry (`context/changes/preview-for-new-entry/change.md:12`). The same `MeasurementForm` also edits when `entry` is set (`src/components/journal/TraineeJournal.astro:51-56`). Edit-mode preview is not in the MS-18 sentence.

### New-entry form as it stands

`/measurements` mounts `MeasurementForm` from `TraineeJournal` when the journal load succeeds (`src/components/journal/TraineeJournal.astro:54-56`). A search of `src` for `MeasurementForm` found that render, the component file, and a comment in `src/pages/kitchen-sink/journal.astro`. A trainer panel render of this form was not in that search result.

For `entry === null` the form posts to `/api/measurements`, starts numeric fields empty, and defaults the minute to the browser-local clock (`src/components/measurements/MeasurementForm.tsx:112-122`, `150-153`). The fields in `measurementFields` are `weight_kg`, `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, and `navel_cm` (`src/lib/measurement-input.ts:27-36`). The note is a separate textarea, max length 1000 (`src/components/measurements/MeasurementForm.tsx:201-209`).

Changing the date runs `setMeasuredOn` and clears the date error (`src/components/measurements/MeasurementForm.tsx:171-174`). The full `MeasurementForm.tsx` file contains no `formatDelta` call, no measurement fetch, and no copy control.

Client submit checks `createMeasurementInputSchema` and, when that parse succeeds, lets the browser POST (`src/components/measurements/MeasurementForm.tsx:130-147`). The POST handler parses the same schema and calls `addMeasurement` (`src/pages/api/measurements/index.ts:99-137`). This inspected POST handler does not call `readProfileRole`. The insert policy allows the insert when `auth.uid()` is the trainee and the profile role is `trainee` (`supabase/migrations/20260928043200_trainee_measurements.sql:37-41`).

### How a saved row gets its delta

`compareEntries` orders ascending by `measured_on`, then by `id` (`src/lib/measurement-deltas.ts:3-16`). `created_at` is absent from that function. `withDeltas` compares each row after the first to `chronological[index - 1]`, then reverses so the newest row is first (`src/lib/measurement-deltas.ts:43-51`).

`deltaBetween` subtracts tenths: `Math.round(current * 10) - Math.round(previous * 10)`. A zero tenths result is `{ direction: "none", difference: 0 }`. A positive tenths result is `up`; a negative one is `down`. `difference` is the absolute tenths divided by 10 (`src/lib/measurement-deltas.ts:19-27`). `deltasAgainst` applies that to the eight `MeasurementField` keys and does not read `note` (`src/lib/measurement-deltas.ts:30-40`).

`formatDelta` returns `` `↑ ${difference.toFixed(1)}` ``, `` `↓ ${difference.toFixed(1)}` ``, or `0.0` (`src/lib/measurement-deltas.ts:54-62`). `MeasurementBrowser` is the inspected UI caller: a null `deltas` renders a non-breaking space; a present delta renders `formatDelta` (`src/components/measurements/MeasurementBrowser.tsx:85-87`, `542`). The accessible name uses `unchanged`, `up`, or `down` plus one decimal and the unit.

Worked case from the unit test, inputs `weight_kg` 78.5 at `2026-09-11` against 80 at `2026-09-10`: tenths are 785 − 800 = −15, so direction `down` and difference 1.5, formatted `↓ 1.5` (`src/lib/measurement-deltas.test.ts:38-47`).

A page of an already-saved month keeps that predecessor when it sits outside the page. `deltasForVisiblePage` runs `withDeltas` on the visible rows plus `older` when `older` is non-null, then drops `older` from the returned list (`src/lib/measurement-page.ts:182-188`). `readMeasurementPage` sets `older` from `selectOlderRow` for the oldest row of the selected page (`src/lib/services/measurements.ts:236-244`). `selectOlderRow` filters with `strictlyBeforeFilter(measured_on, id)`, orders newest first, and limits to 1 (`src/lib/services/measurements.ts:38-41`, `141-153`). A grep of `src` for `selectOlderRow` found that definition and that one call.

### What a typed minute would select

`strictlyBeforeFilter` needs both a saved `measured_on` and a saved `id`. A new entry has no `id` until insert. Under the unique index `(trainee_id, measured_on)` (`supabase/migrations/20261006220000_measured_on_timestamp.sql:45-46`), two saved rows for one trainee do not share a `measured_on`, so the `id` tie-break does not apply to saved production pairs.

For a typed minute `T` that matches no saved `measured_on`, the `compareEntries` order implies one predecessor: the saved row with the greatest `measured_on` that is still less than `T`. If the trainee types a later minute on the same calendar day, that predecessor can be an earlier minute that same day. The S-22 contract states that previous entry means the previous remaining measurement time, and gives the order `2026-10-06T07:00:00`, then `2026-10-06T19:00:00`, then `2026-10-07T08:00:00` (`context/archive/2026-10-06-measured-on-with-time/plan.md:201-205`). If no saved row is earlier than `T`, the first-row rule in `withDeltas` yields `deltas: null`.

That lookup is not implemented in the services inspected above. `selectOlderRow` takes an existing row, and `GET /api/measurements` returns one month page (`src/pages/api/measurements/index.ts:37-96`). The pagination decision that still matches this loader says the browser receives that page, the month names, and the page count, and does not receive the full rows of other months (`context/archive/2026-10-08-pagination-and-filter-measurements/plan-brief.md:15`, `32`).

The typed value is normalized on save to `YYYY-MM-DDTHH:mm:00` (`src/lib/measurement-input.ts:112-137`). The calendar date must be less than or equal to UTC today plus one day, or the schema rejects it with "Date must not be later than one day from today" (`src/lib/measurement-input.ts:83-87`, `132-134`). A duplicate saved minute comes back as "A measurement at that date and time already exists." (`src/pages/api/measurements/index.ts:131-132`).

### Copy

No copy-from-previous control exists on the inspected form. MS-18 says the trainee can copy one specific value or all values from that previous entry (`context/foundation/roadmap.md:46`). It does not name the note, the control, or what happens when a numeric input is still empty. The eight numeric fields are the set `deltasAgainst` compares. Whether the note is one of the copyable values is not stated in MS-18 or in `change.md`.

## Code References

- `src/components/measurements/MeasurementForm.tsx:112-228` — new-entry state, datetime control, eight fields, note, POST
- `src/components/journal/TraineeJournal.astro:51-72` — form without entries; list receives the page
- `src/lib/measurement-input.ts:27-36` — field set and units
- `src/lib/measurement-input.ts:83-137` — minute normalization and UTC+1-day ceiling
- `src/lib/measurement-deltas.ts:3-62` — order, tenths delta, `formatDelta`
- `src/lib/measurement-page.ts:182-188` — page deltas plus one older row
- `src/lib/services/measurements.ts:38-41` — strictly-before filter
- `src/lib/services/measurements.ts:141-159` — one earlier saved row for a known id
- `src/pages/api/measurements/index.ts:37-137` — month-page GET and create POST
- `src/types.ts:8-20` — `MeasurementField`, `FieldDelta`, `MeasurementWithDeltas`
- `supabase/migrations/20261006220000_measured_on_timestamp.sql:45-46` — unique `(trainee_id, measured_on)`

## Architecture Insights

Listed deltas are computed on the server and formatted in `MeasurementBrowser`. The form is a React island with local input state and a document POST. A preview that follows the typed minute cannot be derived from the entries prop, because that prop is not passed to the form, and the loaded page is one month plus at most the single older row used for the oldest visible saved row.

The predecessor predicate and the tenths math already live in `measurement-deltas.ts` and `selectOlderRow`. A date-keyed read is a new query shape: latest row for this trainee with `measured_on` less than the typed minute, with no saved `id` to pass into `strictlyBeforeFilter`.

## Historical Context (from prior changes)

- `context/archive/2026-10-06-measured-on-with-time/plan.md:201-205` — supported by current `compareEntries`: previous entry is the previous remaining measurement time; order is `measured_on`, then `id`. The same paragraph says `created_at` is not an order key. Current `compareEntries` matches that sentence.
- `context/archive/2026-09-27-trainee-measurement-delta/plan-brief.md` — the earlier brief's `created_at` order key is contradicted by the S-22 contract above and by `src/lib/measurement-deltas.ts:3-16`. The rest of that slice (eight required numbers, optional note, `0.0` with no arrow, no delta on the oldest entry) is the rule still implemented in `withDeltas` and `formatDelta`.
- `context/archive/2026-10-08-pagination-and-filter-measurements/plan-brief.md:15` — supported in spirit by `deltasForVisiblePage` plus `selectOlderRow`: the arrow versus the previous measurement does not change because that row is off the current page. The brief's "full rows of other months stay off the browser" matches the month-bounded `selectPage`.
- `context/archive/2026-10-10-query-optimization/` — kept that off-page predecessor while shortening the list read. It does not add a lookup from a typed, unsaved minute.
- `context/foundation/prd.md:44` — trainer access is preview. The inspected form mount is the trainee journal.

`context/foundation/lessons.md` is absent.

## Related Research

- `context/archive/2026-10-06-measured-on-with-time/research.md` — date-and-time measurement value
- `context/archive/2026-10-10-query-optimization/research.md` — list read and the off-page predecessor
- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md` — delta after edit and delete

## Open Questions

These are product choices the roadmap does not settle. They are not missing code facts.

1. When the typed minute equals a saved `measured_on`, save is refused as a duplicate. MS-18 does not say whether the preview and the copy source are that colliding row or the row before it.
2. MS-18 does not say what the preview shows while a numeric field is empty or fails the one-decimal check. Submit already rejects an empty number (`src/lib/measurement-input.ts:46-48`).
3. MS-18 does not say whether the note is copied with "one specific value" or "all values".
4. MS-18 does not specify the copy control, its accessible name, or whether the preview sits under each field the way the saved list does.
5. The written outcome names the new entry. It does not say whether the shared edit form shows the same preview.
6. MS-18 does not say whether the preview refreshes on each numeric keystroke or when the date and time changes.
