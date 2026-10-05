# Delta After Edit and Delete — Plan Brief

> Full plan: `context/changes/testing-delta-after-edit-delete/plan.md`
> Research: `context/changes/testing-delta-after-edit-delete/research.md`

## What & Why

After an edit or a delete, each remaining entry must compare with the immediately previous remaining entry, and the oldest remaining entry must have no comparison. A note-only save can change which same-date row is previous. The linked trainer must see those same arrows. The current unit file never uses the signed edit or delete examples, so an add-only case can stay green while those chains break.

## Starting Point

`withDeltas` already sorts by date, then timestamp, then id, and the Vitest file covers a two-entry add, `0.0`, a backfilled date, same-date order, and an id tie. Edit and delete change the rows that function receives. They do not store a separate chain. The trainee list and the trainer preview each run that function on the rows loaded for that request.

## Desired End State

`npm test` fails when a saved weight, a moved date, or a removed row leaves the wrong arrow, or when a same-date note-only save keeps the old previous row. The cookbook tells the next author to build those rows from the signed plans and to treat the trainer preview as that same result.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Layer | Unit cases on `withDeltas` with the post-write rows | The next list applies that rule to the saved rows | Research |
| Thin integration | Left out of this phase | A request test would repeat the same pure rule | Research |
| Edit oracle | `↑ 2.0`, then `↑ 1.0`, then `↓ 2.0` with no comparison on 2025-12-28 | Those strings are already in the signed edit plan | Plan |
| Delete oracle | Middle, latest, and oldest removals from the 80 / 82 / 81 chain | Those remaining arrows are already in the signed delete plan | Plan |
| Note-only save | Later timestamp, same weights, later date stays first | The signed edit plan says a save becomes the newest row of its date | Research |
| Trainer preview | The same assertions, once | Both screens run one comparison and do not share a result object | Research |
| Existing `0.0` case | Left as the zero-tenths oracle | Repeating it would not catch an edit or delete regression | Plan |
| AI-native check | None, checked 2026-10-04 | The formatted arrow is already a deterministic signal | Plan |

## Scope

**In scope:**

- Edit cases for 80.0 on 2026-01-01, 82.0 on 2026-01-08, the saved 81.0, and the date moved to 2025-12-28
- Delete cases for 80.0, 82.0, and 81.0 on 2026-01-01, 2026-01-08, and 2026-01-15, including removal of the middle, latest, and oldest row
- One note-only case: the 80 kg row on 2026-01-01 gets a later timestamp and a note, and the 82 kg row on 2026-01-08 stays first
- §6.1 and §6.5 in `context/foundation/test-plan.md`

**Out of scope:**

- Request, route, database, smoke, screenshot, and kitchen-sink tests
- A test that the update statement writes `created_at`
- A second subtraction or a trainer-panel assertion
- Restating the current add, `0.0`, backfill, and id-tie cases
- Ownership, linking, and illegal values

## Architecture / Approach

All new cases live in `src/lib/measurement-deltas.test.ts` and use the existing `entry()` helper. Each array is passed out of newest-first order. The assertion is the signed plan's weight arrow, the formatted string, the id order, and null deltas on the oldest remaining row. Phase 4 writes that pattern into the cookbook and states that the trainer preview is those assertions.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Signed edit chain | Starting `↑ 2.0`, saved 81 as `↑ 1.0`, moved date as `↓ 2.0` with null on the oldest | An expectation copied from a trial run of `withDeltas` |
| 2. Signed delete chain | Remaining arrows after the middle, latest, or oldest row is removed | A survivor still comparing with a deleted row |
| 3. Note-only same-date reorder | Later timestamp, same weights, later date still first | Treating a note-only save as order-preserving on a shared date |
| 4. Cookbook | §6.1 pattern and §6.5 note, including the 2026-10-04 AI-native decision | A later author adding a screenshot or a second subtraction |

**Prerequisites:** Vitest is already configured. Research for this change is complete. The signed edit and delete plans are in `context/archive/`.
**Estimated effort:** One session across four short phases. One test file, then two cookbook sections.

## Open Risks & Assumptions

- The note-only arrows (`↑ 2.0` on the later date, `↓ 1.0` on the rewritten same-date row) apply the signed timestamp rule to weights 80, 81, and 82. The edit plan states that rule and does not print this three-row example itself.
- These tests stay green if a later trainer panel formats arrows on its own. §6.1 records that limit.
- Hosted Supabase's maximum rows per response was not read. These cases use two or three rows, so that cap does not change them.

## Success Criteria (Summary)

- `npm test` fails when the signed edit or delete chain gets the wrong previous row, a pre-edit weight, or a comparison on the oldest remaining row.
- `npm test` fails when a same-date note-only save leaves the old previous row in place, moves the later date below that pair, or changes the stored weights.
- §6.1 tells the next author to add that unit case, and to treat the trainer preview as the same arrows.
