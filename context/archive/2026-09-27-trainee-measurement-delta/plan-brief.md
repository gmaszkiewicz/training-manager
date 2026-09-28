# Trainee measurement delta — Plan Brief

> Full plan: `context/changes/trainee-measurement-delta/plan.md`

## What & Why

A trainee adds a body-measurement entry (date, weight, seven circumferences, optional note) on `/dashboard`, and the list shows, for each number, an up/down arrow and the difference versus the previous entry. This is roadmap slice S-02 (US-01, FR-003, FR-006) and the north star: the PRD says the comparison is the product, not another list of numbers.

## Starting Point

S-01 made `/dashboard` an empty journal: it ensures a `trainee` row in `public.profiles` and shows `No measurements yet`. There is no measurement table, form, route, delta logic, zod, or unit-test runner. The Supabase client is untyped, and the profile helper uses a hand-written type shim that follow-up F5 asked this slice to replace.

## Desired End State

A signed-in trainee sees an add-entry form and their entries newest first. Every entry except the oldest shows per field `↑ 1.5`, `↓ 0.2`, or `0.0` (no arrow when unchanged); the oldest shows no comparison. Invalid input is refused with a readable message. Only the owning trainee can read or add entries. `npm test` locks the rule and `npm run smoke` proves add → delta end to end.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Meaning of "previous" | By `measured_on`, then `created_at`, then `id` | Backfilled dates slot into the timeline, so deltas describe real body change. |
| Same-date entries | Allowed; the later-added one counts as later | A second weigh-in or re-entry is never rejected. |
| Required fields | All 8 numbers required; note optional | Every delta is always versus the directly previous entry, as the PRD states. |
| Zero change | `0.0` with no arrow | An arrow never claims a direction, and it stays distinct from "first entry". |
| Units and limits | kg 20–400, cm 10–300, 1 decimal, `numeric(5,1)`; no future dates; note ≤ 1000 chars | Catches typos such as 800 for 80.0; clean ±0.1 steps. |
| Future-date rule | Date picker capped at local today; server rejects after UTC today + 1 day | The Worker runs on UTC; a strict UTC check would reject a Polish trainee's today just after midnight. |
| Form | On `/dashboard` above the list; native POST to `/api/measurements`, then redirect (`?error=` on failure) | Same pattern as the auth forms; the server renders the list, so there is no client state. |
| Delta location | Pure TS `withDeltas`, integer tenths | Testable, reusable by S-04/S-05/S-06, and avoids float artifacts. |
| Validation | One zod schema shared by the island and the route | Client and server cannot disagree on limits. |
| Testing | Vitest for rules plus extended smoke; `npm test` in CI | The product's core rule gets exact, fast tests. |
| Types | Generated `src/db/database.types.ts`; typed `createClient`; shim removed | Closes F5 and types every new query. |
| Trainer guard | Insert policy requires a `trainee` profile | S-03 trainers cannot write entries before S-04 defines their read access. |

## Scope

**In scope:** the `public.measurements` migration (range CHECKs, select/insert RLS, explicit grants); generated types; zod input schema; delta rule; Vitest and CI step; `POST /api/measurements`; form island; newest-first list with deltas and notes; smoke steps; README note.

**Out of scope:** edit/delete (S-05/S-06); trainer link and preview (S-04); date filter (FR-009); delta coloring or charts; lb/inch; partial entries; pagination; keeping form values after a server error; a JSON API; a DB-level future-date check.

## Architecture / Approach

Form island → native `POST /api/measurements` → zod schema → `addMeasurement` (Supabase insert, RLS-checked) → redirect `/dashboard`. The dashboard render ensures the profile, then `listMeasurements` selects the trainee's rows and `withDeltas` sorts them, compares each to its predecessor, and returns newest first → `MeasurementList.astro`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Measurement storage | Table + RLS + grants; generated types; typed client; shim removed | Typing `createServerClient<Database>` ripples into existing callers |
| 2. Delta rule and tests | zod schema, `withDeltas`/`formatDelta`, Vitest, CI step | Tenths rounding and the date cap must match the decided rules exactly |
| 3. Add and list on the journal | Route, form, list, smoke steps | Smoke's `startsWith` check would accept an error redirect as success; it needs an exact check |

**Prerequisites:** S-01 done (it is); local Supabase via Docker for migration, `db:types`, and smoke.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Values are assumed to be the trainee's own kg/cm readings; nothing converts units.
- The list is unpaginated; fine at small scale, revisit if a trainee logs years of daily entries.
- A server-side validation error loses the typed values (full-page redirect); client validation catches most cases first.

## Success Criteria (Summary)

- A trainee adds two entries and sees `↑`/`↓` with the difference (or `0.0`) on the newer one and no comparison on the oldest.
- Backfilled and same-date entries compare in the decided order, and invalid input is refused with a clear message.
- Another trainee never sees those entries, and CI runs both `npm test` and the extended smoke.
