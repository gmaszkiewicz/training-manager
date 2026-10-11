# Preview the delta versus the previous entry from the new entry date — Plan Brief

> Full plan: `context/changes/preview-for-new-entry/plan.md`
> Research: `context/changes/preview-for-new-entry/research.md`

## What & Why

While a trainee fills in a new measurement, show the difference versus the previous entry chosen from the minute typed on that entry. Next to that preview, the trainee can copy one number or all eight from that previous entry instead of typing them.

The saved list already shows this difference after save. The new-entry form does not look up a previous row, so the trainee cannot see or reuse it until the entry exists.

## Starting Point

The form collects a minute, eight numbers, and an optional note, then posts them. The list compares each saved row with the immediately earlier one by `measured_on`, then `id`, and renders `↓ 1.5`, `↑ 0.2`, or `0.0`. The form is not given that list, and the loaded page is only one month, so the earlier row has to be read on its own.

## Desired End State

On a new entry, each number that would pass submit shows the list's difference against the latest saved row strictly before the typed minute. Copying one number, or all eight, replaces what is typed. The note and the minute stay.

Saved rows of 80 kg at 10:00 and 78.5 kg at 11:00 on `2026-10-06`: typing 11:00 still compares with 80 kg, so weight `78.5` reads `↓ 1.5`. Copying weight over a typed `77.0` sets `80.0`. Typing 11:30 compares with 78.5 kg instead.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Previous row for a typed minute | Latest saved row with `measured_on` strictly earlier | That is the row the list compares, including when the earlier row is off the current month page | Research |
| Minute equal to a saved row | The row before that saved minute | Save still refuses the duplicate, and the preview keeps the same earlier-row rule | Plan |
| Empty, multi-decimal, or out-of-range number | No difference on that field | The preview uses the numbers submit would accept, and a valid sibling field still shows | Plan |
| Note | Not copied | The difference compares the eight numbers, and a note already typed stays | Plan |
| Number already typed | Replace that number, or all eight | Copy writes the previous value, and the trainee can type again | Plan |
| Edit form | Unchanged | MS-18 is the new entry while it is being filled | Research |
| Difference text | Existing tenths math and `formatDelta` | The preview should match the arrow the list will show after save | Research |

## Scope

**In scope:**

- One trainee-only read of the row strictly before the typed minute
- A difference under each acceptable number on the new-entry form
- Copy one number, and copy all eight, replacing what is typed

**Out of scope:**

- Edit-mode preview or copy
- Copying the note or the date and time
- A confirm step, good/bad coloring, or a change to saved-row differences
- Trainer access to this lookup, and any migration

## Architecture / Approach

The form requests `/api/measurements/previous?measured_on=` when the shown minute would pass the existing date check. The route returns that one row, or `entry: null`. The browser calculates each field with the list's tenths math and does not ask again while the minute stays the same. Copy writes the previous one-decimal strings into the number inputs.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Previous-entry lookup | The signed-in trainee can read the row strictly before a minute | The query picks an earlier row other than the immediate one, or `previous` is handled as a measurement id |
| 2. Live preview | Each acceptable number shows that row's difference | A slow minute change applies a stale row |
| 3. Copy | One number, or all eight, replace what is typed | Copy also changes the note or the minute |

**Prerequisites:** S-02, S-13, and S-22 are done. No migration.
**Estimated effort:** about 2 sessions across 3 phases.

## Open Risks & Assumptions

- Unit tests lock the pure selection rule. The Phase 1 manual check confirms the SQL query against the middle of three saved minutes.
- The comparison uses the naive clock minute the form already stores. A UTC conversion would pick a different row.
- The static route `src/pages/api/measurements/previous.ts` must answer `GET`. `[id].ts` is the measurement `POST`.

## Success Criteria (Summary)

- Typing a minute between saved rows shows the same arrow and one-decimal difference the list would show against the immediately earlier row.
- A number that submit would reject stays blank, and the other valid numbers still show their differences.
- Copy weight replaces a typed `77.0` with the previous weight, and copy all replaces the eight numbers while the note and the minute stay.
