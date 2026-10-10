# Query optimization — Plan Brief

> Full plan: `context/changes/query-optimization/plan.md`
> Research: `context/changes/query-optimization/research.md`

## What & Why

The calendar-month page should stay the page it is today, and the server should stop loading every measurement timestamp to build the month dropdown. S-24 (MS-16) asks for the same rows, order, page size, and difference versus the previous entry — including when that previous entry sits outside the page — for the trainee and a linked trainer, while the list is built without walking the whole journal.

## Starting Point

The visible page is already one month, one exact count, and one range. The older-row read is already a single previous entry. The walk is `selectMeasuredOn`: every `measured_on` for that trainee, 1000 rows at a time, collapsed to `YYYY-MM` in the app. That app step also inserts the UTC current month and sorts newest first.

## Desired End State

The dropdown still shows each month that has rows, once, plus the UTC current month when it is empty, newest first. “Page N of M” still comes from the selected month. A June row whose previous entry is in January still shows that difference. A linked trainer sees the same list and the same difference. An unlinked trainer’s measurement API response for that trainee is only the current UTC month and no entries. The server requests the month names once.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Walk bar | One query returns distinct `YYYY-MM` values; Postgres may still walk that trainee’s `measured_on` index | The dropdown stays aligned with the rows, so deleting the last entry in a month removes that month on the next read | Plan |
| Month count | Keep `count: "exact"` on the selected month | “Page 1 of 3” stays exact, and that count covers the open month | Plan |
| Proof | Smoke calls `measurement_months` and `GET /api/measurements` for the trainee, then the trainer before and after the link | `dates` is already deduped by `measurementMonths`, so only the RPC payload shows one row per month | Plan |
| Mechanism | Security-invoker SQL function `measurement_months(p_trainee_id)` | The existing select policies already define owner and linked-trainer visibility; a definer function or a default view would bypass them | Plan |
| Page contract | Same rows, newest-first order, page size 5/10/15, and the off-page difference | That is the S-24 outcome, and S-23 already implemented it | Research |
| Current month | `measurementMonths` still inserts the UTC current month and sorts newest first | The dropdown contract is already fixed in `measurement-page.ts` | Research |

## Scope

**In scope:**

- Additive migration for `public.measurement_months`, granted to `authenticated`
- Typed RPC, and `readMeasurementPage` calling it once
- Smoke coverage for the RPC month set, the June-versus-January weight difference, a linked trainer, and an empty RPC result before the link

**Out of scope:**

- Stored month list, new index, or a change to the page query and the older-row query
- Kitchen-sink in-memory list, trainer HTML fallback, `EXPLAIN`, hosted `max_rows`
- Catalog paging past 1000 distinct months

## Architecture / Approach

`measurement_months` selects `distinct to_char(measured_on, 'YYYY-MM')` for one trainee id. Because the function is security invoker, row-level security still hides other trainees from an unlinked trainer. The app passes those strings through `measurementMonths`, then runs the unchanged month-window page query and the one-row predecessor query.

The proof lives in `scripts/smoke.mjs` because that process already has a trainee session and a trainer session on local Supabase. It calls `POST /rest/v1/rpc/measurement_months` with the session access token and asserts the returned month set, then parses `GET /api/measurements` for the dropdown and the June difference. The CI smoke step passes `SUPABASE_URL` and `SUPABASE_KEY` from `supabase.env`. The trainer HTML page is the wrong oracle: it substitutes a linked trainee when the requested id is not linked.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Distinct month read | The function, the type, and the service call that replaces the 1000-row loop | A definer function, or `AT TIME ZONE` on a timestamp without time zone, would show the wrong months or another trainee’s months |
| 2. Catalog proof | Smoke asserts the RPC month set, the June `up` 8 weight difference, the linked trainer, and an empty RPC result before the link | A check of `dates` alone still passes when the function returns one string per row |

**Prerequisites:** S-23 is done. Phase 1’s migration check and phase 2’s smoke need local Supabase (Docker), the same way CI does.
**Estimated effort:** About two sessions, one per phase.

## Open Risks & Assumptions

- Local `max_rows` is 1000. One catalog response is enough for any realistic month list. A journal with more than 1000 distinct months would be truncated, and this plan does not loop.
- Index use is not proved. The accepted cost is an index walk of `(trainee_id, measured_on)` for that trainee.
- Smoke and the API share one machine clock. The expected current month is that UTC month. A run that crosses a UTC month boundary can disagree with a hardcoded month, so the check computes the month rather than assuming `2026-10`.
- Before the link, the unlinked trainer’s `GET /api/measurements` dates are exactly `[utc current month]`, and the `measurement_months` array is empty. The trainee’s RPC set is the three fixture months. Their `dates` list also includes the UTC current month when that month has no rows.

## Success Criteria (Summary)

- The month control lists each month with rows once, plus the UTC current month when that month has no rows, and the pager still shows an exact “Page N of M”.
- A June entry whose previous row is in January still shows weight `up` 8 in the fixture (90.0 versus 82.0).
- A linked trainer gets that same month list and difference. Before the link, the same API call returns only the current UTC month and no entries.
