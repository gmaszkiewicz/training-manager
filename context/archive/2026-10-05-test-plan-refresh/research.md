---
date: 2026-10-05T20:51:41+02:00
researcher: unknown
git_commit: 5f26eb395aa78fda03a796ad75c5fb83a95edc5a
branch: cursor/playwright-e2e-setup
repository: training-manager
topic: "Hosted migration row survival and the saved weight edit"
tags: [research, codebase, migrations, measurements, smoke, playwright]
status: complete
last_updated: 2026-10-05
last_updated_by: unknown
---

# Research: Hosted migration row survival and the saved weight edit

**Date**: 2026-10-05T20:51:41+02:00
**Researcher**: unknown
**Git Commit**: 5f26eb395aa78fda03a796ad75c5fb83a95edc5a
**Branch**: cursor/playwright-e2e-setup
**Repository**: training-manager

## Research Question

Ground the accepted refresh in `context/changes/test-plan-refresh/change.md`: risk #6 (a migration that applies cleanly and then changes, drops, or reassigns existing measurement rows) and the risk #1 adjustment (a saved weight edit is what the list compares). Check the Playwright claim in `context/foundation/test-plan.md`. Do not invent which past migration caused the hosted corruption described in the interview.

## Summary

On this branch, at commit `5f26eb395aa78fda03a796ad75c5fb83a95edc5a`, the seven files in `supabase/migrations/` contain no `UPDATE`, `DELETE FROM`, `TRUNCATE`, or `DROP TABLE`. Hosted Supabase receives `npx supabase db push` from `scripts/workers-build.mjs` when `WORKERS_CI_BRANCH` is `main`. That path checks the process exit code. It does not read measurement rows. `supabase start` in the CI `smoke` job applies those files on a database that has no measurement rows yet, so a green start does not prove existing rows survive.

A weight edit is written by `updateMeasurement`, which sets `weight_kg` and `created_at` on that update. The journal list passes the selected rows through `withDeltas`. The unit case named as a saved weight of 81 builds that row in memory. In `scripts/smoke.mjs`, a search for `/api/measurements/` found four call sites, and each step name is a rejected update or delete. The string `↓ 1.5` is asserted after two creates, `80.0` then `78.5`. One smoke edit of the signed-in trainee's own row is the check that can fail if that write keeps the old weight.

`context/foundation/test-plan.md` says the manifest has no Playwright. `package.json` depends on `@playwright/test` `^1.63.0`. The workflow jobs `ci` and `smoke` do not run Playwright. The signed-out seed stays with S-19.

## Detailed Findings

### Hosted apply versus local apply

`scripts/workers-build.mjs` runs `npx supabase db push --db-url <SUPABASE_DB_URL>` when `WORKERS_CI_BRANCH === "main"`, and exits 1 when that variable is `main` and `SUPABASE_DB_URL` is missing (`scripts/workers-build.mjs:13-19`). The same file then runs `npm run build` (`scripts/workers-build.mjs:22`). `CLAUDE.md` states that this push happens before the new Worker, that `npm run deploy` does not apply migrations, and that GitHub Actions does not deploy (`CLAUDE.md:63-64`). The same paragraph states the compatibility rule: add first, drop in a later release (`CLAUDE.md:64`).

The CI workflow on this branch has two jobs, `ci` and `smoke` (`.github/workflows/ci.yml:10`, `.github/workflows/ci.yml:29`). The `smoke` job runs `supabase start` and then `npm run smoke` (`.github/workflows/ci.yml:43`, `.github/workflows/ci.yml:55`). A search of that workflow file found no `db push`.

### The seven migration files do not rewrite measurement rows

A glob of `supabase/migrations/*.sql` returned these seven files: `20260927065512_trainee_profile.sql`, `20260927100031_profiles_explicit_grants.sql`, `20260928043200_trainee_measurements.sql`, `20260928100000_trainer_role.sql`, `20260928170000_trainer_links.sql`, `20261002120000_measurements_update_own.sql`, `20261002150000_measurements_delete_own.sql`.

A case-insensitive search of that directory for `update`, `delete`, `truncate`, and `drop table` hit grants, RLS policies, and `on delete cascade` foreign keys. It did not hit `UPDATE`, `DELETE FROM`, `TRUNCATE`, or `DROP TABLE`. `20261002120000_measurements_update_own.sql:1-5` grants `update` and creates an update policy. `20261002150000_measurements_delete_own.sql:1-5` grants `delete` and creates a delete policy. Neither statement assigns `weight_kg` or `trainee_id`.

`20260928043200_trainee_measurements.sql:3` declares `trainee_id` with `on delete cascade`. `20260928043200_trainee_measurements.sql:14` defaults `created_at` to `now()`. A migration that deleted `profiles` rows would delete measurement rows through that foreign key. None of the seven files deletes `profiles` rows. This session did not identify a historical file outside this set.

### An empty apply does not prove risk #6

Measurement rows cannot exist before `20260928043200_trainee_measurements.sql` creates the table. The brief's oracle is rows seeded before the migration under test. `supabase start` on an empty database, and `db push` exiting 0, both miss that oracle.

`listMeasurements` selects `id, measured_on, created_at, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm, note` (`src/lib/services/measurements.ts:20-21`). That column list has no `trainee_id`. A journal HTML check cannot prove which trainee owns the row.

`supabase/config.toml:70` sets the reset seed path to `./seed.sql`. A glob for `supabase/seed.sql` returned no file. This session did not run `supabase db reset`, so the effect of the missing seed file is unverified. The inspected scripts (`package.json` `db:types`, `scripts/workers-build.mjs`, `scripts/smoke.mjs`, `.github/workflows/ci.yml`) do not select measurement rows from Postgres.

Corrected proof for phase 4, when a migration file is the thing under test: apply through the previous file, insert one known row (numbers and `trainee_id`) with SQL whose expected values come from that insert, apply the file under test, then select the numeric columns, the row count, and `trainee_id`. Copying an `UPDATE` out of the migration into the expected row is the oracle failure the brief already forbids. A green run of `20261002120000` or `20261002150000` after that insert shows that those two grant-and-policy files left the inserted row in place. It does not show that a later `UPDATE` would fail the same harness unless the next migration is run through that same sequence.

### A saved weight edit is a write, then `withDeltas`

`updateMeasurement` updates `measured_on`, the eight numeric fields, `note`, and `created_at: new Date().toISOString()` for the matching `id` and `trainee_id` (`src/lib/services/measurements.ts:77-94`). The edit route parses the form and calls that function (`src/pages/api/measurements/[id].ts:48-53`). `addMeasurement` does not set `created_at` in that insert (`src/lib/services/measurements.ts:46-58`). The table default is `now()` (`supabase/migrations/20260928043200_trainee_measurements.sql:14`).

`withDeltas` sorts by `measured_on`, then `created_at`, then `id`, and compares each row with the previous row in that order (`src/lib/measurement-deltas.ts:3-22`, `src/lib/measurement-deltas.ts:49-57`). `listMeasurements` returns `withDeltas(data)` (`src/lib/services/measurements.ts:34`). The trainee journal calls `listMeasurements(supabase, user.id)` (`src/pages/measurements.astro:50`). The trainer preview calls `listMeasurements(supabase, selectedLink.traineeId)` (`src/pages/measurements.astro:77`).

The unit test "shows an increase of 1 kg after the earlier weight is saved as 81" sets `weight_kg: 81` on an object and passes the array to `withDeltas` (`src/lib/measurement-deltas.test.ts:218-232`). That case does not call `updateMeasurement`.

In `scripts/smoke.mjs`, the first trainee block posts `2026-01-01` / `80.0`, then `2026-01-02` / `78.5`, then expects the body `↓ 1.5` (`scripts/smoke.mjs:244-256`). A search of that file for `/api/measurements/` returned four call sites: `scripts/smoke.mjs:376`, `scripts/smoke.mjs:385`, `scripts/smoke.mjs:445`, and `scripts/smoke.mjs:454`. The step names at `scripts/smoke.mjs:374`, `scripts/smoke.mjs:383`, `scripts/smoke.mjs:443`, and `scripts/smoke.mjs:452` are rejected updates and deletes, and each expectation includes `error=` (`scripts/smoke.mjs:380`, `scripts/smoke.mjs:449`).

Phase 5's cheapest check is one more step in that smoke list: the signed-in trainee posts a new weight to their own `/api/measurements/${id}`, then `GET /measurements` expects the difference string that follows from the two stored weights. A new unit that builds the edited row by hand repeats `src/lib/measurement-deltas.test.ts:218`. Playwright does not see the write any earlier than this request.

### Playwright is in the manifest and absent from CI

`context/foundation/test-plan.md:89` says there is no Playwright in the manifest and not to add one for these risks. `package.json:47` lists `@playwright/test` `^1.63.0`. `package.json:63` lists `vitest` `^5.0.2`. A glob of `src/**/*.test.ts` returned four files, all under `src/lib`: `measurement-deltas.test.ts`, `measurement-input.test.ts`, `topbar.test.ts`, `trainer-preview.test.ts`. That matches `context/foundation/test-plan.md:83` for that glob. `tests/e2e/seed.spec.ts` sits outside that glob.

`context/changes/e2e-setup/plan.md` records that GitHub Actions does not run Playwright and that a Playwright job is out of scope for that change. `context/foundation/test-stack.md` describes the seed as the signed-out visit to the journal. This refresh should record the runner in section 4 and leave the seed on S-19.

## Code References

- `scripts/workers-build.mjs:13-22` — `db push` when `WORKERS_CI_BRANCH` is `main`, then `npm run build`
- `CLAUDE.md:63-64` — hosted push before the new Worker; add first, drop later
- `.github/workflows/ci.yml:10-55` — jobs `ci` and `smoke`; smoke starts local Supabase
- `supabase/migrations/20260928043200_trainee_measurements.sql:3` — `trainee_id` `on delete cascade`
- `supabase/migrations/20260928043200_trainee_measurements.sql:14` — `created_at` defaults to `now()`
- `supabase/migrations/20261002120000_measurements_update_own.sql:1-5` — grant and policy, no row assignment
- `supabase/migrations/20261002150000_measurements_delete_own.sql:1-5` — grant and policy, no row assignment
- `supabase/config.toml:65-70` — seed on reset points at `./seed.sql`
- `src/lib/services/measurements.ts:20-34` — select list omits `trainee_id`, then `withDeltas`
- `src/lib/services/measurements.ts:77-94` — update writes the numerics, `note`, and a new `created_at`
- `src/pages/api/measurements/[id].ts:48-53` — edit route calls `updateMeasurement`
- `src/pages/measurements.astro:50` — trainee list
- `src/pages/measurements.astro:77` — trainer preview list
- `src/lib/measurement-deltas.ts:49-57` — previous row after the sort; oldest has `deltas: null`
- `src/lib/measurement-deltas.test.ts:218-232` — in-memory weight 81
- `scripts/smoke.mjs:244-256` — two creates, then `↓ 1.5`
- `scripts/smoke.mjs:374-380` — cross-user update rejected
- `package.json:47` — `@playwright/test` `^1.63.0`
- `context/foundation/test-plan.md:89` — claim that the manifest has no Playwright

## Architecture Insights

Deltas are computed when the list is loaded. They are not a stored chain. A migration reaches hosted Supabase on a `main` Workers build before the Worker built in that same command. The previous Worker is the one `CLAUDE.md:64` says must keep working on the new schema.

The smoke script is the existing request harness with a signed-in trainee, a measurement write, and a list read. Vitest on this branch covers `withDeltas` inputs built in the test file.

## Historical Context (from prior changes)

- `context/archive/2026-10-04-testing-delta-after-edit-delete/plan.md` — Supported for the comparison rule: that plan excludes a request or database test. Partial for the write: it does not claim the unit test sees `updateMeasurement`.
- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md:86` — Supported. A `withDeltas` test does not fail if `updateMeasurement` stops writing `created_at`. The same gap applies to `weight_kg`, which that sentence does not name.
- `context/archive/2026-10-04-testing-reject-illegal-measurements/plan.md` — Supported for the future-date create. That exclusion of an edit-path request is about the refusal, not about a successful weight edit.
- `context/archive/2026-10-05-ci-cd-workflow-updates/plan.md` and `context/archive/2026-10-05-block-merge-on-failed-ci/plan.md` — Supported on this branch's workflow: required jobs are `ci` and `smoke`, and the workflow does not run Playwright.
- `context/changes/e2e-setup/plan.md` — Supported as the owner of the signed-out browser seed, with no Playwright CI job in that plan.
- `context/foundation/test-plan.md:89` — Contradicted by `package.json:47`.
- `context/foundation/test-plan.md:83` — Supported for the glob `src/**/*.test.ts` (four files, all under `src/lib`). `tests/e2e/seed.spec.ts` is outside that sentence.

## Related Research

- `context/archive/2026-10-04-testing-delta-after-edit-delete/research.md` — why the comparison rule is a unit test, and which writes that unit does not see
- `context/changes/e2e-setup/plan.md` — Playwright stays local to the signed-out seed

## Open Questions

- This session did not run `supabase db reset`. Whether the missing `supabase/seed.sql` makes reset fail is unknown.
- No inspected script selects `trainee_id` from Postgres. The phase 4 plan has to name the local SQL client that reads the inserted row. That choice does not change the oracle.
