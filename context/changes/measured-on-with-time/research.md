---
date: 2026-10-06T21:18:37+02:00
researcher: Composer
git_commit: 884483464a8b4bb8dc132d2bf976f74db61c0235
branch: cursor/measured-on-with-time
repository: training-manager
topic: "Add time of day to measured_on; keep created_at immutable; forbid duplicate date+time"
tags: [research, codebase, measured_on, created_at, measurements, uniqueness, deltas]
status: complete
last_updated: 2026-10-06
last_updated_by: Composer
---

# Research: Add time of day to measured_on; keep created_at immutable; forbid duplicate date+time

**Date**: 2026-10-06T21:18:37+02:00
**Researcher**: Composer
**Git Commit**: 884483464a8b4bb8dc132d2bf976f74db61c0235
**Branch**: cursor/measured-on-with-time
**Repository**: training-manager

## Research Question

How does `measured_on` / `created_at` work today, and what must change so a trainee can record date **and** time of a measurement, `created_at` stays the immutable creation timestamp, and two measurements cannot share the same date and time? (Change notes + [issue #71](https://github.com/gmaszkiewicz/training-manager/issues/71).)

## Summary

On this inspected commit, `measured_on` is a calendar **date** end-to-end: Postgres `date not null`, Zod `YYYY-MM-DD`, and an HTML `type="date"` control. `created_at` is `timestamptz` with DB default `now()` on insert, and **`updateMeasurement` overwrites it on every save**. Same-calendar-date rows for one trainee are **allowed** at DB and app layers; delta ordering uses `measured_on`, then `created_at`, then `id`. The change goals therefore conflict with three shipped behaviors: date-only storage/UI, mutable `created_at` on edit, and explicit S-02 allowance of multiple same-date entries. Surfaces that must move together are migration + uniqueness, validation, create/update services, form and list UI, delta tests that assume same-date/`created_at` reorder, and smoke fixtures that post `YYYY-MM-DD`.

## Detailed Findings

### Database schema

- On the create migration path only, `measured_on` is `date not null` with no default and no column CHECK; `created_at` is `timestamptz not null default now()` (`supabase/migrations/20260928043200_trainee_measurements.sql:4`, `:14`).
- The inspected migration set defines a **non-unique** index `(trainee_id, measured_on, created_at)` and no `UNIQUE` on `(trainee_id, measured_on)` (`20260928043200_trainee_measurements.sql:26-27`). A trainee can insert two rows that share `measured_on` if the app allows it.
- Later measurement migrations inspected for this question add trainer select, update, and delete policies/grants only; they do not alter these columns. No `CREATE TRIGGER` under `supabase/migrations/` was found for `created_at`.
- RLS on insert/update checks ownership and trainee role; it does not constrain date/time values (`20260928043200_trainee_measurements.sql:37-41`; update policy in `20261002120000_measurements_update_own.sql`).

### Validation and API

- `measuredOn` in `createMeasurementInputSchema` accepts only a valid `YYYY-MM-DD` string and rejects values after UTC calendar today + one day (`src/lib/measurement-input.ts:8`, `:82-86`, `:103-116`, `:141-143`). There is no time component and no uniqueness refine against existing rows.
- Create and update API routes both parse that schema from `form.get("measured_on")` and pass the parsed string through (`src/pages/api/measurements/index.ts:24-46`; `src/pages/api/measurements/[id].ts:34-56`).
- `addMeasurement` inserts `measured_on` and omits `created_at`, so insert uses the DB default (`src/lib/services/measurements.ts:46-58`).
- `updateMeasurement` sets `measured_on` and **`created_at: new Date().toISOString()`** on every successful update (`src/lib/services/measurements.ts:77-94`). That path is the direct conflict with “immutable `created_at`” in issue #71.

### UI collect and display

- The trainee form labels the field “Date”, uses `name="measured_on"` and `type="date"`, and caps create-mode `max` at the browser’s local today (`src/components/measurements/MeasurementForm.tsx:152-167`, `:106-113`). A repo search for `datetime-local` under `src` returned no matches on this pass.
- `MeasurementList.astro` renders `entry.measured_on` as text inside `<time datetime={entry.measured_on}>` with label “Date”; `created_at` is not shown (`src/components/measurements/MeasurementList.astro:38-40`). Edit/delete aria-labels interpolate the same string (`:45`, `:54`).
- Trainer UI is read-only through the same list; it does not collect `measured_on`.

### Delta ordering

- `compareEntries` orders by `measured_on`, then `created_at`, then `id`; `withDeltas` compares each chronological row to its predecessor and returns newest-first (`src/lib/measurement-deltas.ts:3-57`).
- When two rows share `measured_on`, `created_at` decides which is “previous.” Because updates rewrite `created_at`, a note-only or no-op save among same-date rows can change predecessors. That behavior is intentional in the signed edit plan (`context/archive/2026-10-02-edit-measurement-entry/plan.md:19`, `:55`) and covered by delta unit cases that share a date and differ on `created_at` (`src/lib/measurement-deltas.test.ts:147-190` area; note-only reorder around `:418-446`).

### Issue #71 vs shipped product decisions

- Issue #71 outcome (fetched via `gh`): trainee records date and time; `created_at` stays immutable creation time; two measurements cannot share the same date and time. Risk note names collision with existing same-day rows and with edits that rewrite `created_at`.
- S-02 plan-brief settled **same-date entries allowed**; “a second weigh-in or re-entry is never rejected” (`context/archive/2026-09-27-trainee-measurement-delta/plan-brief.md:22`). Forbidding identical **date+time** is a new rule; allowing different times on the same calendar day is compatible with that sentence if uniqueness is at full timestamp granularity.
- PRD FR text inspected here names a calendar date on the entry and “immediately previous remaining” after edits/deletes; it does not name `measured_on`, `created_at`, time-of-day, or uniqueness (`context/foundation/prd.md` sections cited in prior research around `:51`, `:69`, `:92-96`). Ordering detail lives in archived S-02/S-05 plans, not in the PRD alone.

## Code References

- `supabase/migrations/20260928043200_trainee_measurements.sql:4` — `measured_on date not null`
- `supabase/migrations/20260928043200_trainee_measurements.sql:14` — `created_at timestamptz not null default now()`
- `supabase/migrations/20260928043200_trainee_measurements.sql:26-27` — non-unique composite index
- `src/lib/measurement-input.ts:103-116` — date-only Zod transform + UTC +1 day cap
- `src/lib/services/measurements.ts:46-58` — insert without `created_at`
- `src/lib/services/measurements.ts:90` — update rewrites `created_at`
- `src/components/measurements/MeasurementForm.tsx:155-158` — `type="date"`
- `src/components/measurements/MeasurementList.astro:38-40` — date display
- `src/lib/measurement-deltas.ts:3-22` — sort keys

## Architecture Insights

- **One shared schema** (`createMeasurementInputSchema`) gates both the island and create/update routes. Extending `measured_on` to datetime must update that one function and every FormData/default/`max` path together, or client and server diverge.
- **Backward-compatible migrations** (repo rule): hosted DB updates before the Worker. Changing `date` → `timestamptz` (or similar) and adding a unique index must stay safe for the previous Worker that still posts `YYYY-MM-DD` and rewrites `created_at`, or the cutover needs an explicit two-step release plan.
- **Uniqueness vs sort**: if `(trainee_id, measured_on)` becomes unique at timestamp resolution, `compareEntries` ties on `measured_on` should not occur for a given trainee; `created_at` and `id` remain defensive tie-breaks but lose their product role as “same-day order.” Stopping the `created_at` rewrite removes the “save makes this row newest on that date” contract from S-05.
- **Timezone already split**: form `max` uses local calendar today; server ceiling uses UTC today + 1 day (`MeasurementForm.tsx:106-113`; `measurement-input.ts:82-86`; plan-brief `:26`). Adding a clock makes that split sharper; any plan needs an explicit timezone rule for storage, display, and the future bound.

## Historical Context (from prior changes)

- **Supported:** S-02 chose date-only `measured_on`, non-unique same-date rows, and sort `measured_on` → `created_at` → `id` (`context/archive/2026-09-27-trainee-measurement-delta/plan-brief.md:21-22`; `plan.md:25`, `:80`, `:149`).
- **Supported:** S-05 edit plan requires every save to set `created_at` to save time so the edited row becomes newest among shared `measured_on` (`context/archive/2026-10-02-edit-measurement-entry/plan.md:19`, `:45`, `:55`).
- **Supported:** Test-plan risk #1 and later testing changes lock that rewrite and same-date reorder (`context/foundation/test-plan.md:57`, `:132`; archive testing-delta / testing-saved-edit research).
- **Contradicted by this change’s goals:** immutable `created_at` and “same date+time impossible” overturn those S-02/S-05 choices; they are not already implemented.

## Related Research

- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md` — same-date/`created_at` effect on deltas after edit
- `context/archive/2026-10-06-testing-saved-edit-reaches-the-arrow/research.md` — update rewrites `created_at`; sort keys
- `context/archive/2026-10-04-testing-reject-illegal-measurements/research.md` — date-only upper bound; DB has no future-date CHECK

## Open Questions

These are product/planning choices; evidence above does not settle them:

1. **Column type and wire format** — `timestamptz` vs `timestamp`, ISO-8601 vs `datetime-local` local string, minute vs second precision for uniqueness.
2. **Timezone** — store UTC vs trainee-local; how the “not later than …” rule applies once a time exists.
3. **Existing same-day rows** — backfill time (e.g. midnight, `created_at` clock, fixed sentinel) and how to resolve pre-existing collisions before a unique index.
4. **Edit collision UX** — when an edit’s new `measured_on` matches another of the trainee’s rows: DB unique error vs app pre-check vs message copy.
5. **Delta contract after the change** — keep `created_at` in the sort for defense only, or document that chronological order is solely `measured_on` (+ `id`); which existing unit/smoke cases must be rewritten or retired.
6. **UI shape** — single `datetime-local` vs date + time fields; list formatting and labels (“Date” vs date+time).
