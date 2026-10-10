# Query optimization Implementation Plan

## Overview

The calendar-month measurement page stays the page it is today: the same rows, newest-first order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, for the trainee and a linked trainer. The month dropdown stops being built by loading every `measured_on` for that trainee. One query returns the distinct months that have rows.

## Current State Analysis

`readMeasurementPage` builds two different things. The visible page is already one trainee, one half-open calendar month, an exact count of that month, and one `.range` (`src/lib/services/measurements.ts`). When the page is non-empty, `selectOlderRow` loads one earlier row with no month bound, and `deltasForVisiblePage` uses that row so the oldest visible entry can still show a difference.

The month names come from `selectMeasuredOn`. That helper selects `measured_on` for the trainee, ordered ascending, in ranges of 1000, and continues while a response is 1000 rows long. `measurementMonths` then keeps the `YYYY-MM` prefix, inserts the UTC current month when it is missing, and sorts newest first. The trainee page, the linked-trainer page, and `GET /api/measurements` all go through `readMeasurementPage`.

`measured_on` is `timestamp without time zone` and not null. The unique index is `(trainee_id, measured_on)`. Local PostgREST `max_rows` is 1000. The repo has one custom function, `link_trainee_by_email`, and it is security definer because it reads `auth.users`. There is no view, generated column, or distinct-month query. Select policies already allow the owner and a linked trainer.

In-memory tests cover month dedupe, paging, and off-page deltas. Nothing runs `selectMeasuredOn` against PostgREST. `scripts/smoke.mjs` signs in a trainee and a trainer against local Supabase and checks HTML. Its comparisons are substring checks. The trainer HTML page chooses a linked trainee through `selectTrainerPreview`, so a query for a trainee who is not linked still renders a linked journal.

## Desired End State

A trainee with several rows in one month and rows in other months opens `/measurements` and sees each of those months once, plus the UTC current month when it has no rows, newest first. The pager still reads “Page N of M” from the exact count of the selected month. A row whose previous entry is outside that month still shows the same up/down difference. A linked trainer sees that same month list and that same difference. An unlinked trainer’s `GET /api/measurements` for that trainee returns only the UTC current month and no entries.

The server asks for months once. It does not request every timestamp in ranges of 1000.

### Key Discoveries:

- `selectMeasuredOn` is the journal walk (`src/lib/services/measurements.ts`, the 1000-row loop). `selectPage`’s exact count is the selected month only.
- `measurementMonth` keeps the first seven characters of the stored timestamp after replacing a space with `T` (`src/lib/measurement-page.ts`). That matches `to_char(measured_on, 'YYYY-MM')` on `timestamp without time zone`.
- `measurements_select_own` and `measurements_select_linked_trainer` are the visibility rules (`supabase/migrations/20260928043200_trainee_measurements.sql`, `supabase/migrations/20260928170000_trainer_links.sql`).
- `GET /api/measurements` passes a trainer’s `trainee` query param straight into `readMeasurementPage` (`src/pages/api/measurements/index.ts`). The HTML trainer page does not.
- Smoke already creates an unlinked trainee, stores that id from the session cookie, and only later checks the trainer HTML fallback (`scripts/smoke.mjs`).

## What We're NOT Doing

- A stored month list, trigger, or generated column.
- A new index. The distinct query may walk the existing `(trainee_id, measured_on)` index.
- A change to `selectPage`, the exact month count, `selectOlderRow`, page sizes 5/10/15, or delta math.
- A loop that fetches more than one catalog response. More than 1000 distinct months is outside this change; local `max_rows` would truncate that response.
- The kitchen-sink in-memory month list.
- An `EXPLAIN` capture or a change to hosted `max_rows`.
- A change to `selectTrainerPreview` or the trainer HTML fallback.

## Implementation Approach

Add one security-invoker SQL function, `public.measurement_months(p_trainee_id uuid)`, that returns distinct `YYYY-MM` values for rows the caller is allowed to see. Point the catalog helper at that RPC. Leave `measurementMonths` as the place that inserts the UTC current month and sorts newest first. Leave the page query and the older-row query as they are.

Prove the result through `GET /api/measurements` in smoke, with the trainee’s session and the trainer’s session. A superuser SQL session would bypass row-level security, and the trainer HTML page would substitute a linked trainee.

## Critical Implementation Details

### Timestamp months

`measured_on` is `timestamp without time zone`. Format it with `to_char(measured_on, 'YYYY-MM')`. An `AT TIME ZONE` conversion shifts the month relative to the string prefix the dropdown uses today.

### Invoker, not definer

`link_trainee_by_email` is security definer so it can read `auth.users`. This function must be security invoker with `search_path = ''`. The inner select then runs under `measurements_select_own` and `measurements_select_linked_trainer`. A view created without `security_invoker` runs as its owner and bypasses those policies.

### Proof role

`supabase db query --local` connects as a superuser. The proof has to be `GET /api/measurements` while signed in as the trainee, and again as the trainer. Assert the unlinked trainer against that JSON response. The HTML route at `/measurements?trainee=` uses `selectTrainerPreview` and will show a linked journal instead of the empty catalog.

## Phase 1: Distinct month read

### Overview

Replace the 1000-row timestamp loop with one call that returns distinct months. The visible page, the pager, and the off-page difference keep their current queries.

### Changes Required:

#### 1. Month function

**File**: `supabase/migrations/<timestamp>_measurement_months.sql`

**Intent**: Add the distinct-month read in the database before the worker calls it. The previous worker never calls the function, and the table, indexes, and policies stay in place.

**Contract**: New function `public.measurement_months(p_trainee_id uuid)` returns `table (measured_month text)`. Language SQL, `stable`, `security invoker`, `set search_path = ''`. The body selects `distinct pg_catalog.to_char(m.measured_on, 'YYYY-MM')` from `public.measurements` where `trainee_id = p_trainee_id`. No `AT TIME ZONE`. No month predicate. Revoke execute from `public` and `anon`; grant execute to `authenticated`, matching `link_trainee_by_email`. An empty visible set returns zero rows, which is success.

```sql
create function public.measurement_months(p_trainee_id uuid)
returns table (measured_month text)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct pg_catalog.to_char(m.measured_on, 'YYYY-MM')
  from public.measurements as m
  where m.trainee_id = p_trainee_id
$$;
```

#### 2. Generated function type

**File**: `src/db/database.types.ts`

**Intent**: Let the service call the RPC with a typed client.

**Contract**: In `public.Functions`, next to `link_trainee_by_email`, `measurement_months` takes `Args: { p_trainee_id: string }` and returns `{ measured_month: string }[]`. Prefer `npm run db:types` after the migration is on local Supabase, then keep that shape.

#### 3. Catalog call

**File**: `src/lib/services/measurements.ts`

**Intent**: Stop loading every timestamp. Keep the rest of `readMeasurementPage` on the same month list, page, and older row.

**Contract**: `readMeasurementPage` gets month strings from one `supabase.rpc("measurement_months", { p_trainee_id: traineeId })`. A PostgREST error or a thrown client error still returns `{ ok: false }`. The returned `measured_month` values are the input to the existing `measurementMonths(..., today)` call, which still inserts the UTC current month and sorts newest first. There is no `.range` loop and no second catalog request. `selectPage` still requests `count: "exact"` inside the month window. `selectOlderRow` is still one row strictly before the oldest visible row. The `focusId` branch may still append that row’s `measured_on` when its month is absent from `dates`.

### Success Criteria:

#### Automated Verification:

- Migration applies and an existing measurement row survives: `npm run migration-check`
- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`

#### Manual Verification:

- A journal with more than one entry in a month still lists each month once, includes the UTC current month, and the pager still reads “Page N of M”

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Catalog proof

### Overview

Extend smoke so a real journal with repeated months proves the dropdown, the off-page difference, the linked trainer, and the unlinked trainer.

### Changes Required:

#### 1. JSON catalog checks

**File**: `scripts/smoke.mjs`

**Intent**: The current step runner only searches response text. The catalog proof needs the parsed `dates` array, the page count, and one weight difference. Existing HTML steps stay in place.

**Contract**: Use the trainee smoke already treats as unlinked (the account stored in `unlinkedTraineeId`, which already saves `2026-03-01T08:00` at `70.0` with `unlinkedNote`). After that save, and before that trainee signs out, add four rows through the existing `measurementForm` helper, with empty notes:

- `2024-01-02T08:00` at `80.0`
- `2024-01-15T08:00` at `81.0`
- `2024-01-28T08:00` at `82.0`
- `2024-06-01T08:00` at `90.0`

While that trainee is signed in, `GET /api/measurements?month=2024-01&size=5&page=1` returns 200. `dates` equals the distinct months `2024-01`, `2024-06`, and `2026-03`, plus the UTC current month when it is not already one of those, sorted newest first. `dates.length` is less than 5. For that January request, `entries.length` is 3 and `pageCount` is 1. `GET /api/measurements?month=2024-06&size=5&page=1` returns one entry whose `deltas.weight_kg` is `{ direction: "up", difference: 8 }`.

After the existing step “trainer never-linked query shows a linked note”, and before that trainer signs out: `GET /api/measurements?month=2024-06&size=5&page=1&trainee=<unlinkedTraineeId>` returns 200, `dates` equals `[utc current month]`, `entries` is empty, and `pageCount` is 1. Then link that trainee with the existing trainer-link post. A second pair of GETs, January and June, returns the same `dates`, January `entries.length` / `pageCount`, and June `deltas.weight_kg` as the trainee. Leave the HTML never-linked step before this link so it still forbids `unlinkedNote`.

Compute the UTC current month in the smoke process with the same UTC calendar month the API uses (`now` at request time). The new checks parse JSON. Do not treat a substring hit on `2024-01` as success.

`measurementMonths` collapses every returned timestamp to `YYYY-MM` before `GET /api/measurements` builds `dates`, so that array matches for a distinct-month catalog and for a catalog that still returns one string per row. Smoke also calls the function. Decode the session cookie the same way `sessionUserId` does, and read `access_token` from that JSON, beside `user`. `POST ${SUPABASE_URL}/rest/v1/rpc/measurement_months` with header `apikey` set to `SUPABASE_KEY`, header `Authorization: Bearer <access_token>`, and body `{ "p_trainee_id": "<unlinkedTraineeId>" }`. The response is a JSON array of `{ "measured_month": string }`. Order is not significant. For the trainee, and again for the trainer after the link, the set is exactly `2024-01`, `2024-06`, and `2026-03`. For the trainer before the link, the array is empty. `measurementMonths` adds the UTC current month later, so this array does not gain a month that has no row.

#### 2. Smoke environment

**File**: `.github/workflows/ci.yml`

**Intent**: Give the smoke process the PostgREST URL and anon key the job already writes to `supabase.env`.

**Contract**: The “Run smoke test against production preview” step exports `SUPABASE_URL` from `API_URL` and `SUPABASE_KEY` from `ANON_KEY` in `supabase.env`, and still sets `BASE_URL=http://localhost:4321`. `scripts/smoke.mjs` reads `process.env.SUPABASE_URL` and `process.env.SUPABASE_KEY`. A local run sets those two from `supabase status -o env` the same way.

### Success Criteria:

#### Automated Verification:

- Smoke proves the month catalog, the June difference, the linked trainer, and the unlinked trainer: `npm run smoke`

#### Manual Verification:

- A linked trainer’s month dropdown on `/measurements` lists the same months as that trainee’s journal

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Existing `src/lib/measurement-page.test.ts` cases stay the proof of dedupe, UTC current month, newest-first order, page windows, and in-memory off-page deltas.
- No new PostgREST mock. The catalog shape is proved in smoke, where row-level security is actually on.

### Integration Tests:

- `npm run migration-check` applies the new function and still sees a preserved measurement row.
- `npm run smoke` covers five rows across `2024-01`, `2024-06`, and `2026-03`. The `measurement_months` RPC returns exactly those three months for the trainee and the linked trainer, and an empty array before the link. `GET /api/measurements` still checks one `dates` entry per distinct month plus the UTC current month when it has no rows, January `pageCount` 1 for three rows at size 5, and June weight difference `up` 8 against the 28 January row.

### Manual Testing Steps:

1. Sign in as a trainee who has two entries in one month and an entry in another month. Confirm the month control lists each month once and includes the current UTC month.
2. Open a later month whose previous entry is in an earlier month. Confirm the difference still points at that earlier entry.
3. Sign in as a trainer linked to that trainee. Confirm the month control matches.

## Performance Considerations

The catalog becomes one round trip of month names. Postgres may still scan that trainee’s `(trainee_id, measured_on)` index to compute the distinct months. A month with many rows still pays for `count: "exact"` inside that month, because the pager’s “Page N of M” stays exact.

## Migration Notes

The migration only adds a function and grants. Existing rows are unchanged. The previous worker keeps reading `measurements` directly, so it still works after the function exists. The new worker calls the function, and the current Workers build applies migrations before the new worker is deployed. Dropping the function waits for a later release, after no running worker calls it.

## References

- Related research: `context/changes/query-optimization/research.md`
- S-24 outcome and risk: `context/foundation/roadmap.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/77
- Catalog loop: `src/lib/services/measurements.ts`
- Month prefix and UTC today: `src/lib/measurement-page.ts`
- Grant pattern: `supabase/migrations/20260928170000_trainer_links.sql`
- Timestamp type: `supabase/migrations/20261006220000_measured_on_timestamp.sql`
- Smoke harness: `scripts/smoke.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Distinct month read

#### Automated

- [x] 1.1 Migration applies and an existing measurement row survives: `npm run migration-check` — 77afff5
- [x] 1.2 Unit tests pass: `npm test` — 77afff5
- [x] 1.3 Lint passes: `npm run lint` — 77afff5
- [x] 1.4 Type check passes: `npx astro check` — 77afff5

#### Manual

- [x] 1.5 A journal with more than one entry in a month still lists each month once, includes the UTC current month, and the pager still reads “Page N of M” — 77afff5

### Phase 2: Catalog proof

#### Automated

- [x] 2.1 Smoke proves the month catalog, the June difference, the linked trainer, and the unlinked trainer: `npm run smoke` — e82e76e

#### Manual

- [x] 2.2 A linked trainer’s month dropdown on `/measurements` lists the same months as that trainee’s journal — e82e76e
