---
date: 2026-10-06T05:25:44+02:00
researcher: unknown
git_commit: def5f72888b893d6b2f02c2b5c0225dd36c45649
branch: main
repository: training-manager
topic: "Hosted migration preserves measurements"
tags: [research, codebase, migrations, measurements, supabase]
status: complete
last_updated: 2026-10-06
last_updated_by: unknown
---

# Research: Hosted migration preserves measurements

**Date**: 2026-10-06T05:25:44+02:00
**Researcher**: unknown
**Git Commit**: def5f72888b893d6b2f02c2b5c0225dd36c45649
**Branch**: main
**Repository**: training-manager

## Research Question

Phase 4 in `context/foundation/test-plan.md` asks for a local Supabase check that a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied. Ground the seeded before-state and the add-first, drop-later rule. Do not name a past migration as the cause of the hosted-row corruption described in the 2026-10-05 interview.

## Summary

On `main` at `def5f72888b893d6b2f02c2b5c0225dd36c45649`, the seven files in `supabase/migrations/` create `public.measurements` in one file and, in the later measurement files, add grants and policies. A case-insensitive search of that directory for `update`, `delete from`, `truncate`, `drop table`, `drop column`, and `insert into` hit `grant update`, `for update`, and one `insert into public.trainer_links`. It did not hit an assignment of `weight_kg` or `trainee_id` on `public.measurements`, and it did not hit `DELETE FROM`, `TRUNCATE`, or `DROP TABLE`.

Hosted Supabase receives `npx supabase db push` from `scripts/workers-build.mjs` when `WORKERS_CI_BRANCH` is `main`. That script checks the process status and does not select measurement rows. The CI `smoke` and `e2e` jobs run `supabase start`, which `README.md` says applies `supabase/migrations/` before the app runs. Neither job runs `db query`, `db reset`, or `migration up`. `npm run deploy` does not apply migrations.

The workspace CLI reported by `npm ls supabase --depth=0` is `supabase@2.117.0`. On that binary, `db reset --help` lists `--version`, `--last`, and `--no-seed`; `migration up --help` applies pending migrations and has no `--version` flag; `db query --help` executes SQL against the local database, including from `--file`. This session ran those help commands and did not run reset or query, so row survival after a versioned reset is not an observed result.

`listMeasurements` selects a column list that omits `trainee_id`, so the journal HTML cannot prove the owner. The phase 4 oracle stays the one in the test plan: insert one known row, apply the migration under test, then select the numeric columns, the row count, and the owning trainee, with expected values taken from the insert.

## Detailed Findings

### The insert has to satisfy the table and two parent keys

`20260928043200_trainee_measurements.sql` is the only inspected file that creates `public.measurements`. Columns that are `not null` and have no default are `trainee_id`, `measured_on`, `weight_kg`, `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, and `navel_cm` (`supabase/migrations/20260928043200_trainee_measurements.sql:3-12`). `id` defaults to `gen_random_uuid()`, `note` is nullable, and `created_at` defaults to `now()` (`supabase/migrations/20260928043200_trainee_measurements.sql:2`, `supabase/migrations/20260928043200_trainee_measurements.sql:13-14`). The eight columns from `weight_kg` through `navel_cm` are `numeric(5,1)` (`supabase/migrations/20260928043200_trainee_measurements.sql:5-12`), and each of those eight has a check (`supabase/migrations/20260928043200_trainee_measurements.sql:15-22`). This session did not select a stored value, so the text `db query` would print for `numeric(5,1)` is unknown.

`trainee_id` references `public.profiles (id) on delete cascade` (`supabase/migrations/20260928043200_trainee_measurements.sql:3`). `profiles.id` references `auth.users (id) on delete cascade` (`supabase/migrations/20260927065512_trainee_profile.sql:2`). None of the seven migration files inserts a `profiles` or `measurements` row. A before-state insert therefore needs a parent `auth.users` row and a `profiles` row whose `id` is that user. This session did not insert into `auth.users`.

RLS is enabled on `public.measurements` (`supabase/migrations/20260928043200_trainee_measurements.sql:29`). The select policy for `authenticated` requires `auth.uid() = trainee_id` (`supabase/migrations/20260928043200_trainee_measurements.sql:31-35`). The app list used by the journal selects `id, measured_on, created_at, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm, note` and filters with `.eq("trainee_id", traineeId)` (`src/lib/services/measurements.ts:20-28`). That select string does not include `trainee_id`.

### The seven files, and what each does to measurement rows

The glob `supabase/migrations/*.sql` returned these seven files: `20260927065512_trainee_profile.sql`, `20260927100031_profiles_explicit_grants.sql`, `20260928043200_trainee_measurements.sql`, `20260928100000_trainer_role.sql`, `20260928170000_trainer_links.sql`, `20261002120000_measurements_update_own.sql`, `20261002150000_measurements_delete_own.sql`.

| File | What this read found |
| --- | --- |
| `20260927065512_trainee_profile.sql` | Creates `public.profiles` and its first role check (`supabase/migrations/20260927065512_trainee_profile.sql:1-5`). No measurement DML. |
| `20260927100031_profiles_explicit_grants.sql` | `revoke all` and `grant select, insert` on `public.profiles` (`supabase/migrations/20260927100031_profiles_explicit_grants.sql:1-3`). No measurement DML. |
| `20260928043200_trainee_measurements.sql` | Creates the measurements table, index, RLS, select and insert policies, and `grant select, insert` (`supabase/migrations/20260928043200_trainee_measurements.sql:1-45`). No `INSERT` of a measurement row. |
| `20260928100000_trainer_role.sql` | Drops and recreates `profiles_role_check` so `role` is `trainee` or `trainer`, and replaces the profiles insert policy (`supabase/migrations/20260928100000_trainer_role.sql:1-12`). No measurement DML. |
| `20260928170000_trainer_links.sql` | Inserts into `public.trainer_links` inside `link_trainee_by_email` (`supabase/migrations/20260928170000_trainer_links.sql:65-67`) and adds a trainer select policy on `measurements` (`supabase/migrations/20260928170000_trainer_links.sql:77-81`). The insert target is `trainer_links`, not `measurements`. |
| `20261002120000_measurements_update_own.sql` | `grant update` and an update policy (`supabase/migrations/20261002120000_measurements_update_own.sql:1-8`). No assignment of `weight_kg` or `trainee_id`. |
| `20261002150000_measurements_delete_own.sql` | `grant delete` and a delete policy (`supabase/migrations/20261002150000_measurements_delete_own.sql:1-7`). No `DELETE FROM`. |

`20260928100000_trainer_role.sql:1` drops a constraint on `profiles`. It does not drop a measurement column. A delete of `profiles` rows would cascade to measurements because of the foreign key at `supabase/migrations/20260928043200_trainee_measurements.sql:3`. The directory search did not find `DELETE FROM` in these seven files.

### Apply paths that do not read an existing measurement row

`scripts/workers-build.mjs` runs `npx supabase db push --db-url <SUPABASE_DB_URL>` when `WORKERS_CI_BRANCH === "main"`, and exits 1 when that variable is `main` and `SUPABASE_DB_URL` is missing (`scripts/workers-build.mjs:13-19`). A non-zero child status exits the process (`scripts/workers-build.mjs:6-10`). The same file then runs `npm run build` (`scripts/workers-build.mjs:22`). `CLAUDE.md` states that this push happens before the new Worker, that `npm run deploy` does not apply migrations, and that migrations add first and drop in a later release (`CLAUDE.md:63-64`). `package.json` defines `deploy` as `npm run build && wrangler deploy` (`package.json:6`).

`.github/workflows/ci.yml` has three jobs: `ci` (`.github/workflows/ci.yml:10`), `smoke` (`.github/workflows/ci.yml:29`), and `e2e` (`.github/workflows/ci.yml:59`). The `ci` job does not start Supabase. `smoke` and `e2e` install the CLI with `supabase/setup-cli@v3` and `version: latest` (`.github/workflows/ci.yml:37-39`, `.github/workflows/ci.yml:67-69`), then run `supabase start` (`.github/workflows/ci.yml:43`, `.github/workflows/ci.yml:73`). A search of that workflow file found no `db query`, `db reset`, or `migration up`. `README.md` states that migrations under `supabase/migrations/` apply locally on `supabase start` (`README.md:115`). `scripts/smoke.mjs` then creates measurements through HTTP, including `POST /api/measurements` (`scripts/smoke.mjs:245`). That is after start has already applied the migration files, and it is not a SQL select of a row inserted before a chosen migration.

`supabase/config.toml` enables migrations (`supabase/config.toml:58-60`) and enables seed on reset with `sql_paths = ["./seed.sql"]` (`supabase/config.toml:65-70`). A glob for `supabase/seed.sql` returned no file. Local Postgres is port `54322` and major version `17` (`supabase/config.toml:32-34`, `supabase/config.toml:41`). This session did not run `supabase db reset`, so the effect of the missing seed file is unverified.

### Commands on CLI 2.117.0 that match the oracle

`npm ls supabase --depth=0` printed `supabase@2.117.0`. `package.json` declares `"supabase": "^2.23.4"` (`package.json:60`), which allows that resolved version. The help text below is from that binary, invoked as `npx supabase` in this workspace on 2026-10-06. CI's `version: latest` was not resolved in this session, so these flags are not a claim about the CLI image GitHub Actions will download.

On this binary:

- `supabase db reset --help` includes `--version string` ("Reset up to the specified version"), `--last integer` ("Reset up to the last n migration versions"), and `--no-seed` ("Skip running the seed script after reset"). The `--last` sentence does not say whether `n` counts from the newest file or stops short of it.
- `supabase migration up --help` describes "Apply pending migrations to local database" and lists no `--version` flag. One `migration up` therefore applies the pending set, not a single named file.
- `supabase db query --help` describes "Execute a SQL query against the database", with an optional SQL argument, `--local`, and `--file`.

Context7's `/supabase/cli` develop docs say a local connection uses user `postgres`, the password from config, database `postgres`, and the port from `config.toml`. That source is not the installed `2.117.0` package. This session did not execute `db query`, so the role used by this binary is unverified. The phase 4 select has to read `trainee_id`. The journal select at `src/lib/services/measurements.ts:21` does not.

A sequence consistent with that help text, and not executed here: start the local stack, `supabase db reset --version <previous version> --no-seed`, insert the parent user, the profile, and one known measurement row with `supabase db query`, run `supabase migration up`, then `supabase db query` the numeric columns, the row count, and `trainee_id`. The expected numbers and `trainee_id` come from that insert. The help text says this command applies pending migrations and lists no `--version` flag, so one invocation is the pending set rather than one named file. The reset version has to be the migration immediately before the file under test if a failure should point at that file. Resetting to an earlier version leaves every later file in that same pending set.

`supabase start` and a reset with no `--version` both apply the full local set before a following insert (`README.md:115` for start; the reset description is "Resets the local database to current migrations"). A row inserted after that full apply was not present when those files ran. `db push` exiting 0, as checked in `scripts/workers-build.mjs:6-10`, does not select the row.

On a database reset to a version where `public.measurements` exists and no measurement rows have been inserted, one insert followed by `count(*)` is the row count in the test-plan oracle. A `count(*)` without a filter on a database that already held other measurement rows would include those rows. This session did not run the reset, so that empty-table starting point is the CLI description, not an observed database.

### What a green run of the current tip would show

The newest file in the inspected set is `20261002150000_measurements_delete_own.sql`, and the file before it is `20261002120000_measurements_update_own.sql`. Both are grant and policy files, quoted above, with no assignment of measurement numbers. A reset to version `20261002120000`, one insert, `migration up`, and a select would show whether `20261002150000_measurements_delete_own.sql` left that row's numbers, count, and `trainee_id` in place. It would not show that a later file assigning `weight_kg` fails the same check unless that later file is the pending file applied after the insert.

No inspected migration file is identified here as the cause of the hosted corruption in the interview (`context/changes/test-plan-refresh/change.md` notes, Q2 and Q4). The interview records the gap. It does not name a file.

### Add first, drop later, beside row survival

`CLAUDE.md:64` states the compatibility rule for the previous Worker: add first, drop in a later release, because the hosted push runs before the new Worker (`CLAUDE.md:63-64`, `scripts/workers-build.mjs:13-22`). In the seven files inspected, measurement columns are introduced in `20260928043200_trainee_measurements.sql` and are not dropped later. That rule is about the previous Worker reading the new schema. The phase 4 select is about stored numbers, row count, and `trainee_id` after the file under test. A grant-only file can satisfy the select and still be the wrong place to look for a column drop.

## Code References

- `supabase/migrations/20260928043200_trainee_measurements.sql:1-45` — table, checks, cascade FK, RLS, select/insert grants
- `supabase/migrations/20260927065512_trainee_profile.sql:1-5` — `profiles.id` references `auth.users`
- `supabase/migrations/20260928100000_trainer_role.sql:1-12` — profiles check widened; no measurement DML
- `supabase/migrations/20260928170000_trainer_links.sql:65-67` — insert into `trainer_links`
- `supabase/migrations/20260928170000_trainer_links.sql:77-81` — trainer select policy
- `supabase/migrations/20261002120000_measurements_update_own.sql:1-8` — update grant and policy
- `supabase/migrations/20261002150000_measurements_delete_own.sql:1-7` — delete grant and policy
- `src/lib/services/measurements.ts:20-28` — list select omits `trainee_id`
- `scripts/workers-build.mjs:6-22` — `db push` status, then `npm run build`
- `CLAUDE.md:63-64` — hosted push before the Worker; add first, drop later
- `.github/workflows/ci.yml:10-88` — `ci`, `smoke`, and `e2e`; start applies migrations; no SQL select
- `README.md:115` — local migrations apply on `supabase start`
- `supabase/config.toml:32-41` — local port 54322, Postgres 17
- `supabase/config.toml:58-70` — migrations enabled; seed path `./seed.sql`
- `package.json:6` — `npm run deploy` does not push migrations
- `package.json:60` — `"supabase": "^2.23.4"`; resolved `2.117.0` in this workspace
- `context/foundation/test-plan.md:62` — insert, apply, select; expected values from the insert
- `context/foundation/test-plan.md:75` — phase 4, local Supabase check, not started
- `context/foundation/test-plan.md:117` — migration check planned until phase 4 lands

## Architecture Insights

Deltas are computed when the list loads (`src/lib/services/measurements.ts:34` calls `withDeltas`). They are not columns a migration has to preserve. The phase 4 check reads the stored numeric columns, the row count, and `trainee_id`.

The workspace CLI can stop at a version (`db reset --version`), skip the missing seed file (`--no-seed`), run SQL (`db query`), and apply whatever is still pending (`migration up`). `supabase start` in CI applies the whole set first, so the existing smoke job does not host this oracle. Playwright is the signed-out browser layer; `context/foundation/test-plan.md:93` says not to add a Playwright job for risks #1–#6.

## Historical Context (from prior changes)

- `context/foundation/test-plan.md:62` — Supported. The proof is insert one known row, apply the migration under test, select numbers, count, and owner. Challenges include a green `db push`, an empty database, and using the migration SQL as the expected value.
- `context/foundation/test-plan.md:152-153` — Supported. The cookbook line for a migration that runs after rows exist is still "TBD — see §3 Phase 4."
- `context/changes/test-plan-refresh/research.md:56-58` — Supported as that document's corrected proof (apply through the previous file, insert, apply the file under test, select). On this commit the "apply the file under test" step is `migration up` of the pending set, which is one file when reset stopped at the previous version. The same paragraph's claim that a green grant-file run does not catch a later `UPDATE` still matches the two grant files read above.
- `context/changes/test-plan-refresh/research.md:28-32` — Partial. The exit-code-only `db push` and the empty `supabase start` still match `scripts/workers-build.mjs:6-19` and `.github/workflows/ci.yml:43`. The sentence that CI has only the `ci` and `smoke` jobs is contradicted by the `e2e` job at `.github/workflows/ci.yml:59`.
- `context/changes/test-plan-refresh/research.md:54` — Supported for the current list select: `src/lib/services/measurements.ts:21` omits `trainee_id`.
- `context/changes/test-plan-refresh/research.md:123-124` — The missing SQL client is answered for this workspace by `supabase db query` on CLI `2.117.0`. The missing-seed reset behavior is still unverified.
- `context/archive/2026-09-26-trainee-signup/plan.md:74` — Supported as that plan's contract: policy checks used `set local role authenticated` in the SQL editor, which that plan says runs as `postgres` and bypasses RLS. That plan did not select a pre-existing measurement row after a later migration.
- `context/archive/2026-10-02-delete-measurement-entry/plan.md:181` — Supported as that plan's apply step: `npx supabase migration up`, or stop and start, before the journal test. The assertion there is the grant and policy, not row survival.
- `context/changes/test-plan-refresh/change.md` Q2 and Q4 — Supported as interview notes. They do not name a migration file.

## Related Research

- `context/changes/test-plan-refresh/research.md` — prior grounding of risk #6, at commit `5f26eb395aa78fda03a796ad75c5fb83a95edc5a`, including the open SQL-client question this note answers for CLI 2.117.0

## Open Questions

- `supabase db reset --version` and `supabase db query` were not executed. Whether a reset to `20261002120000` with `--no-seed` leaves `auth.users` insertable, and how `numeric(5,1)` is printed, is unknown.
- CI requests `supabase/setup-cli@v3` at `version: latest` (`.github/workflows/ci.yml:37-39`). This session did not resolve that version, so the `--version` and `db query` flags are confirmed on workspace CLI `2.117.0` only.
- The local role used by `db query` on `2.117.0` was not observed. Develop CLI docs describe user `postgres`.
- A reset that tries to load the missing `supabase/seed.sql` was not run. `--no-seed` is the flag that skips that path on the binary whose help was read.
