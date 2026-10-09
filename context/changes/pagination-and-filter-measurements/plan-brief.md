# Pagination and filter measurements — Plan Brief

> Full plan: `context/changes/pagination-and-filter-measurements/plan.md`

## What & Why

Trainees and trainers see every measurement at once. This change shows one calendar month (`YYYY-MM`), paged 5, 10, or 15 rows, newest measurement time first, and restores the last chosen month and page size in this browser. Each row still shows its date and time.

## Starting Point

`/measurements` loads the full list for one trainee. `withDeltas` orders by `measured_on` then `id` and shows the newest first. Empty copy is `No measurements yet`. Nothing stores a page size or a date, and smoke expects rows dated `2026-01-01` and `2026-02-01` in the HTML.

## Desired End State

Date lists every month that has a row, plus the month of UTC today. Per page lists 5, 10, and 15. The rows underneath are that month only. Page 1 is the newest slice. A fresh browser opens on the current month and 10. Reload restores the account's page size and that trainee's month. No rows at all says `No measurements yet`. A month with none says `No measurements in this month`. The arrow versus the previous measurement does not change just because that row is off screen. The browser receives that page, the month names, and the page count, not the full rows of other months.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Filter | One calendar month (`YYYY-MM`), then paginate that month | The date list is the measurements' months plus the current month, and an empty month must not show older rows. |
| Order | Newest `measured_on`, larger `id` wins | That is the journal order already; a backdated insert stays in its own month. |
| Memory | `localStorage`, keys include the account id | A clean `/measurements` URL still restores the last choice, and two accounts on one browser do not share it. |
| Trainer memory | One page size per account, one month per trainee | Switching people keeps the density and does not reuse the previous trainee's month. |
| Deltas | Visible page plus the next older row | The arrow matches the full journal without sending the other rows to the browser. |
| Default month | The month of UTC today; a missing saved month falls back to that month | The empty journal shows the current month and `No measurements yet`. |
| Empty month | `No measurements in this month` when other months have rows | `No measurements yet` stays only for a journal with no rows at all. |
| Default page size | 10 | The middle of 5, 10, and 15 until a choice is saved. |
| Pager | Previous and Next, not stored; month or size change returns to page 1 | The saved controls are the two dropdowns, not the page index. An open edit or delete stays on the page that contains that row. |
| Clock | UTC today, same as validation and smoke | The server HTML and the first client render have to agree. |
| Read | One page, the month names, the count, and one older row | Full rows outside the page stay on the server, and the oldest visible arrow still matches the full journal. |

## Scope

**In scope:**

- Date and per-page dropdowns on the trainee journal and the trainer journal
- One-month filter, page slice, both empty sentences, Previous/Next
- `localStorage` for page size and per-trainee month
- Kitchen-sink states for the sample month and the empty month
- Smoke fixtures for visible rows moved to UTC today

**Out of scope:**

- Month, page, or page size in a cookie or on the `/measurements` address
- Remembering the page index
- Deltas recomputed on the visible rows only
- Sort by `created_at`, an "all dates" option, numbered pages
- Schema changes
- Full measurement rows for a month or page that is not on screen
- shadcn Select

## Architecture / Approach

Phases 1–3 load the full list and slice it in the browser. Phase 4 asks the server for one page of the selected month. A narrow read supplies the `YYYY-MM` list. One older row supplies the arrow for the oldest row on the page. The first HTML is the current month at 10 per page. A saved choice that differs is a second read. The kitchen sink still slices the entries it is given.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Month and page model | Tested rules for months, pages, fallbacks, and the focused row | A second sort would change deltas or order. |
| 2. Trainee journal browser | Dropdowns, pager, empty copy, storage, smoke on UTC today | Smoke looks at raw HTML, which still contains island props for other months. |
| 3. Trainer browser | Same island, shared page size, month per trainee | A trainer key scoped wrong would show one trainee's month on another. |
| 4. Paged journal read | Server returns one page, the month names, and one older row | A missing older row would change the arrow on the oldest visible measurement. |

**Prerequisites:** none
**Estimated effort:** Phases 1–3 are done. Phase 4 is about one session.

## Open Risks & Assumptions

- For up to two hours after local midnight in Poland, UTC today is still the previous local date. The measurement form already uses that clock.
- A saved month that is not the current month flashes the current month, then the second read replaces it.
- The month list is `YYYY-MM` values from `measured_on`, not full measurement rows.

## Success Criteria (Summary)

- A loaded journal shows one month, newest measurements on page 1, with 5, 10, or 15 per page.
- Reload restores that account's page size and that trainee's month; a missing month returns to the month of UTC today.
- Empty journal and empty month use the two sentences above, and the arrows match the full journal.
