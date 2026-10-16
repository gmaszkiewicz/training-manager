# Current local minute is rejected as later than now — Plan Brief

> Full plan: `context/changes/defect-for-date-and-time/plan.md`

## What & Why

Adding a measurement at the current local minute shows “Date and time must not be later than now” when the browser is ahead of UTC. The form stores that wall-clock minute, and validation compares it with the UTC minute of now. Create and update will take `Date.getTimezoneOffset()`, bounded to a real zone, and accept that local minute. The next minute stays rejected.

## Starting Point

`measuredOn()` ceilings on the UTC minute. The picker already stops at the browser’s local minute, then the submit parse and the API use the UTC ceiling. `measured_on` remains a naive `timestamp without time zone`. Smoke sends a UTC minute and no offset.

## Desired End State

A trainee ahead of UTC saves the current local minute and can edit that entry without moving it. The next minute is rejected with the same sentence. Duplicate check and previous-entry lookup accept that minute too. The journal still shows the typed clock.

At `2026-10-16T05:24:00.000Z` with offset `-120`, `2026-10-16T07:24` is stored as `2026-10-16T07:24:00` and `2026-10-16T07:25` is rejected.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Comparison | Shift `now` by the browser offset, then compare naive minute strings | The column stores a wall clock with no zone, so the ceiling has to be that same clock |
| Offset on the wire | `utc_offset_minutes` from `Date.getTimezoneOffset()` | Create, update, occupied, and previous then share the picker clock |
| Missing offset | Treat as `0` | Smoke and other callers that omit the field keep the UTC ceiling |
| Invalid offset | Existing date-time error; bounds `-840` through `720` | No new copy; those bounds are the extremes `getTimezoneOffset()` can return |
| Next minute | Still rejected | The defect is the current local minute |
| Storage | Unchanged naive timestamp | The journal keeps showing the typed minute |

## Scope

**In scope:**

- Shared ceiling in `src/lib/measurement-input.ts`, with unit tests for UTC+2, the minute after UTC midnight, and UTC−5
- Form submit, occupied, and previous send the offset
- Create, update, occupied, and previous apply it

**Out of scope:**

- `timestamptz`, display conversion, and rewriting stored rows
- An edit exemption for a minute that is already after the ceiling
- Daylight-saving tables, new error copy, and changes to smoke’s payload

## Architecture / Approach

The form reads `getTimezoneOffset()` once per submit or lookup and sends it as `utc_offset_minutes`. The server shifts `now` by that many minutes (same sign as the browser) and formats the UTC fields of the result. That string is the latest allowed `YYYY-MM-DDTHH:mm`. A missing field skips the shift.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Offset-aware minute ceiling | Validator accepts the local current minute and rejects the next one | A flipped sign still rejects the current minute, or accepts a future one |
| 2. Send and apply the browser offset | Form and four routes use that ceiling | Occupied or previous left on UTC treats the current minute as invalid |

**Prerequisites:** none
**Estimated effort:** one session across 2 phases

## Open Risks & Assumptions

- A stored minute that is still ahead of the viewer’s local clock fails a later edit. That can exist for a zone behind UTC, where the old ceiling was the UTC minute.
- The offset is the one in effect at request time, including daylight saving.
- A client that omits `utc_offset_minutes` and sends a local minute still hits the UTC ceiling. The measurement form always sends the field.
- The working tree may already match this contract. Keep those edits, and add the UTC−5 assertions if they are missing.

## Success Criteria (Summary)

- At UTC+2, the current local minute saves and the next minute returns “Date and time must not be later than now”.
- The minute after UTC midnight follows the same rule (`01:30` accepted, `01:31` rejected when UTC is `23:30` and the offset is `-120`).
- At UTC−5, local `10:00` is accepted when UTC is `15:00`, and local `15:00` is rejected.
- Duplicate check and previous-entry preview still work for that current minute.
