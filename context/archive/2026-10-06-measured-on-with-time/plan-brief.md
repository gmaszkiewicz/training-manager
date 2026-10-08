# Add time of day to measured_on — Plan Brief

> Full plan: `context/changes/measured-on-with-time/plan.md`
> Research: `context/changes/measured-on-with-time/research.md`

## What & Why

A trainee records each measurement with a date and a minute. `created_at` stays the insert timestamp, and a second entry for that trainee at the same minute is refused. S-22 / MS-15.

## Starting Point

`measured_on` is a calendar date from Postgres through Zod and `type="date"`. Updates rewrite `created_at`, and same-day rows are ordered by that timestamp, so a note-only save can change which entry is previous.

## Desired End State

The journal and the trainer list show the clock the trainee entered (`YYYY-MM-DD HH:mm`). Two rows cannot share that minute. Editing a note leaves `created_at` and the arrow where they were. Different minutes on the same calendar day compare in clock order.

When `now` is `2026-10-06T22:00:00.000Z`, `2026-10-07T23:59` is stored as `2026-10-07T23:59:00` and `2026-10-08T00:00` is rejected.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Storage | `timestamp without time zone`, minute wall clock | Trainer and trainee both see the clock that was typed | Plan |
| Control | One `datetime-local`; seconds stored as `00` | Uniqueness is the minute the trainee picked | Plan |
| Future bound | Date portion versus UTC today plus one day | `2026-10-07T23:59:00` is allowed and `2026-10-08T00:00` is not | Plan |
| Backfill | UTC creation clock, then one minute later until unique | The calendar date stays, and a colliding later id moves off the taken minute | Plan |
| Duplicate | Unique `(trainee_id, measured_on)`; Postgres `23505` maps to a specific message | The index covers races, with no select-before-write | Plan |
| Order | `measured_on`, then `id` | A note edit no longer changes which entry is previous | Plan |
| Cutover | One migration; a date-only post from the previous worker stores midnight | Hosted Postgres updates first; a second same-day insert in that window fails | Plan |

## Scope

**In scope:** migration and backfill, shared input schema, immutable `created_at`, duplicate message, form, list, kitchen-sink samples and the journal error mock, delta order, unit tests, smoke fixtures.

**Out of scope:** `timestamptz` or viewer timezones, seconds, a pre-insert lookup, sorting by `created_at`, a second release, the date filter (FR-009), numeric delta math.

## Architecture / Approach

The form posts `YYYY-MM-DDTHH:mm`. Zod zeros the seconds and checks the date portion against the existing UTC ceiling. The column stores that wall clock. A unique index on `(trainee_id, measured_on)` is the only duplicate check. The list prints `YYYY-MM-DD HH:mm` without shifting the clock. Deltas sort by `measured_on`, then `id`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema and backfill | Timestamp column, nudged history, unique minute | Cascade nudge if the next minute is already taken |
| 2. Validation and save | Minute schema, immutable `created_at`, `23505` message | Date-only clients fail closed |
| 3. Form and list | `datetime-local`, the same clock on both lists, and the sink error mock | PostgREST may return a space instead of `T` |
| 4. Comparison and fixtures | Clock order, retired `created_at` reorder tests, smoke | Same-day smoke must still show the arrow |

**Prerequisites:** S-02 is done.
**Estimated effort:** about two sessions across four phases.

## Open Risks & Assumptions

- Until the new Worker is live, the previous app can insert one midnight row per calendar day. A second same-day insert hits the unique index and the old generic error.
- A dense same-day history can move a backfilled time by more than one minute.
- Display code must normalize `YYYY-MM-DD HH:mm:ss` and `YYYY-MM-DDTHH:mm:ss` without treating either as UTC.

## Success Criteria (Summary)

- A trainee saves a minute and both lists show that same clock.
- A second save at that minute shows "A measurement at that date and time already exists."
- A note edit leaves `created_at` and the arrow unchanged. Same-day minutes compare in clock order.
