# Pagination and filter measurements — Plan Brief

> Full plan: `context/changes/pagination-and-filter-measurements/plan.md`

## What & Why

Trainees and trainers see every measurement at once. This change shows one calendar month (`YYYY-MM`), paged 5, 10, or 15 rows, newest measurement time first, and restores the last chosen month and page size in this browser. Each row still shows its date and time.

## Starting Point

`/measurements` loads the full list for one trainee. `withDeltas` orders by `measured_on` then `id` and shows the newest first. Empty copy is `No measurements yet`. Nothing stores a page size or a date, and smoke expects rows dated `2026-01-01` and `2026-02-01` in the HTML.

## Desired End State

Date lists every month that has a row, plus the month of UTC today. Per page lists 5, 10, and 15. The rows underneath are that month only. Page 1 is the newest slice. A fresh browser opens on the current month and 10. Reload restores the account's page size and that trainee's month. No rows at all says `No measurements yet`. A month with none says `No measurements in this month`. The arrow versus the previous measurement does not change just because that row is off screen.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Filter | One calendar month (`YYYY-MM`), then paginate that month | The date list is the measurements' months plus the current month, and an empty month must not show older rows. |
| Order | Newest `measured_on`, larger `id` wins | That is the journal order already; a backdated insert stays in its own month. |
| Memory | `localStorage`, keys include the account id | A clean `/measurements` URL still restores the last choice, and two accounts on one browser do not share it. |
| Trainer memory | One page size per account, one month per trainee | Switching people keeps the density and does not reuse the previous trainee's month. |
| Deltas | Compute on the full list, then filter and page | The difference stays the one versus the previous measurement, on or off this page. |
| Default month | The month of UTC today; a missing saved month falls back to that month | The empty journal shows the current month and `No measurements yet`. |
| Empty month | `No measurements in this month` when other months have rows | `No measurements yet` stays only for a journal with no rows at all. |
| Default page size | 10 | The middle of 5, 10, and 15 until a choice is saved. |
| Pager | Previous and Next, not stored; month or size change returns to page 1 | The saved controls are the two dropdowns, not the page index. An open edit or delete stays on the page that contains that row. |
| Clock | UTC today, same as validation and smoke | The server HTML and the first client render have to agree. |

## Scope

**In scope:**

- Date and per-page dropdowns on the trainee journal and the trainer journal
- One-month filter, page slice, both empty sentences, Previous/Next
- `localStorage` for page size and per-trainee month
- Kitchen-sink states for the sample month and the empty month
- Smoke fixtures for visible rows moved to UTC today

**Out of scope:**

- Query params or cookies for these controls
- Remembering the page index
- Deltas recomputed on the visible rows only
- Sort by `created_at`, an "all dates" option, numbered pages
- Schema changes or SQL pagination
- shadcn Select

## Architecture / Approach

The server still loads the trainee's full list and runs `withDeltas`. A pure helper in `src/lib/measurement-page.ts` builds the month list and the page. `MeasurementBrowser` renders the dropdowns and the current rows. Hydration uses the month of UTC today and page size 10; an effect applies storage after mount. Edit and delete hrefs are built from ids inside the island.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Month and page model | Tested rules for months, pages, fallbacks, and the focused row | A second sort would change deltas or order. |
| 2. Trainee journal browser | Dropdowns, pager, empty copy, storage, smoke on UTC today | Smoke looks at raw HTML, which still contains island props for other months. |
| 3. Trainer browser | Same island, shared page size, month per trainee | A trainer key scoped wrong would show one trainee's month on another. |

**Prerequisites:** none
**Estimated effort:** ~2-3 sessions across 3 phases

## Open Risks & Assumptions

- For up to two hours after local midnight in Poland, UTC today is still the previous local date. The measurement form already uses that clock.
- The first paint uses the current month and 10, then stored values apply. A saved month that differs will flash once.
- Hidden rows remain in the island payload, so smoke must not treat their absence from the body as proof of the filter.

## Success Criteria (Summary)

- A loaded journal shows one month, newest measurements on page 1, with 5, 10, or 15 per page.
- Reload restores that account's page size and that trainee's month; a missing month returns to the month of UTC today.
- Empty journal and empty month use the two sentences above, and the arrows match the full journal.
