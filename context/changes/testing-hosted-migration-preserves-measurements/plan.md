# Hosted migration preserves measurements — Implementation Plan

## Overview

Add a local Supabase check that inserts one known measurement row, applies only the newest migration, and selects that row’s numbers, the row count, and `trainee_id`. Run the same command in its own CI job, and require that job on `main` so a failing run blocks the pull request.

## Current State Analysis

Risk #6 in `context/foundation/test-plan.md` is a migration that runs on a database that already has measurement rows and then changes their numbers, drops rows, or leaves them owned by the wrong trainee. The proof is: insert one known row, apply the migration under test, then select the numeric columns, the row count, and the owning trainee. Expected values come from the insert. The phase 4 row is `not started`. Section 5 lists the migration check as planned until this phase lands. Section 6.4 still says the cookbook pattern is TBD.

The seven files in `supabase/migrations/` create `public.measurements` and later add grants and policies. None of them assign `weight_kg` or `trainee_id`. The newest file is `20261002150000_measurements_delete_own.sql`. The file before it is `20261002120000_measurements_update_own.sql`. A green run of that newest grant shows that file left the inserted row in place. A later file is covered when this same sequence runs with that later file as the newest one.

Hosted Supabase receives `npx supabase db push` from `scripts/workers-build.mjs` when `WORKERS_CI_BRANCH` is `main`. That script checks the process status. The CI `smoke` and `e2e` jobs start local Supabase, which applies every migration before any measurement row exists. `main` requires the status checks `ci` and `smoke`. The `e2e` job is not in that list.

The workspace lockfile and `npm ls` resolve `supabase@2.117.0`. On that CLI, `db reset --version` stops at a version, `--no-seed` skips seeding, and `migration up` applies the pending set. `supabase/config.toml` enables seed with `sql_paths = ["./seed.sql"]`, and that file is absent. `db query --local` is the SQL client. Local status exposes `DB_URL` as user `postgres`, which bypasses RLS. The journal list in `src/lib/services/measurements.ts` omits `trainee_id`.

A measurement row needs a parent `auth.users` row and a `profiles` row. Signup is enabled and email confirmation is off. The app inserts `profiles` itself; no migration creates a profile trigger. Research read the CLI help and did not execute reset or query.

### Key Discoveries:

- `migration up` has no single-file flag. Resetting to the second-newest version makes the pending set the newest file (`context/changes/testing-hosted-migration-preserves-measurements/research.md`).
- `supabase/config.toml` seed path `./seed.sql` is missing, so reset must pass `--no-seed`.
- Branch protection on `gmaszkiewicz/training-manager` `main` requires contexts `ci` and `smoke` with `strict` false. A new workflow job blocks merge only after its job name is added there.
- `listMeasurements` cannot prove the owner (`src/lib/services/measurements.ts`).

## Desired End State

`npm run migration-check` resets the local database to the version immediately before the newest file in `supabase/migrations`, inserts one trainee-owned measurement, applies that newest file, and exits 0 only when the stored numbers, the row count, and `trainee_id` match the insert. CI runs that command in a job named `migration-check` with Supabase CLI 2.117.0. `main` requires `ci`, `smoke`, and `migration-check`. The test-plan cookbook tells the next migration check to use this command. Section 3 of the test plan stays as it is; the rollout orchestrator advances that row.

## What We're NOT Doing

- Re-applying every migration after the measurements table.
- Treating two new migration files as two subjects. Only the newest file runs after the insert.
- Selecting measurement rows on hosted Supabase after `db push`.
- Changing `scripts/workers-build.mjs` or `npm run deploy`.
- Adding `supabase/seed.sql`.
- Using Playwright, the journal HTML, or `listMeasurements` as the oracle.
- Asserting `note`, `measured_on`, `id`, or `created_at`.
- Naming a past migration as the cause of the hosted-row incident from the 2026-10-05 interview.
- Adding the `e2e` job to the required status checks.
- Rewriting §1, §2, or §3 of `context/foundation/test-plan.md`.

## Implementation Approach

A zero-dependency Node script, on the pattern of `scripts/smoke.mjs`, shells out to the `supabase` CLI on `PATH`. It sorts `supabase/migrations/*.sql` by filename, takes the newest timestamp as the file under test, and resets with `--version` set to the timestamp before it and `--no-seed`. It creates one auth user through the local Auth signup API, the same shape as the `e2e` job, then uses `supabase db query --local` to insert a `profiles` row with role `trainee` and one `measurements` row. `migration up` must apply exactly that newest file. The follow-up query compares the eight numeric columns, `count(*)`, and `trainee_id` to the insert in SQL, and the script looks for a token it selected so the result does not depend on table versus JSON rendering.

The CI job is separate from `smoke` and `e2e` because this command resets the database. The job installs CLI 2.117.0, starts local Supabase, runs `npm run migration-check`, and stops the stack. Branch protection gains the job name `migration-check` and keeps `ci` and `smoke`.

The inserted row uses `measured_on` `2026-01-01`, `weight_kg` `80.0`, and `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, and `navel_cm` each `50.0`. `note` is null. Those numbers sit inside the table checks. The select expects `weight_kg` `80.0`, those seven circumferences at `50.0`, `count(*)` `1`, and `trainee_id` equal to the signup user id. The signup email is `migration-check@example.com`.

## Critical Implementation Details

- Reset applies migrations up to and including `--version`, and it requires the local stack to be running. The version argument is the second-newest filename timestamp. After that reset, `migration up` must apply one file, the newest filename. If `public.measurements` is missing after the reset, the script exits non-zero before the insert.
- `[db.seed].sql_paths` points at a missing `supabase/seed.sql`. The reset command includes `--no-seed`.
- `db query` prints a table for a person and JSON when an agent is detected. The script selects a single text token, `migration-check-preserved`, when the SQL comparison holds, and treats any other result as failure.
- `npm run` puts `node_modules/.bin` first on `PATH`. The lockfile binary is `supabase@2.117.0`. The CI step that runs `supabase start` uses `supabase/setup-cli`, so that action’s `version` is `2.117.0` as well.
- The required status-check context is the job name. The live rule lists `ci` and `smoke`. The protection update reads the live rule, then PUTs a body in the shape from `context/archive/2026-10-05-block-merge-on-failed-ci/plan.md`: `required_status_checks.strict` false, `contexts` set to the live list plus `migration-check`, `enforce_admins` true, `required_pull_request_reviews` present with `required_approving_review_count` 0, force pushes off, and deletions off. Do not PUT the GET JSON. Do not send `required_pull_request_reviews: null`.

## Phase 1: Local check

### Overview

Ship the script and the npm command that bracket the newest migration with one known row.

### Changes Required:

#### 1. Migration check script

**File**: `scripts/migration-check.mjs`

**Intent**: Run the insert-apply-select sequence against local Supabase so a newest migration that changes stored numbers, the row count, or `trainee_id` fails the command.

**Contract**: The script uses the `supabase` binary on `PATH` and no npm libraries. It requires a running local stack. It prints that the local database will be reset, then runs `supabase db reset --version <second-newest timestamp> --no-seed`. It signs up `migration-check@example.com` through the local Auth API using `API_URL` and `ANON_KEY` from `supabase status -o env`, with email confirmation already off in `supabase/config.toml`. The JSON body includes that email, a password of at least 6 characters (`minimum_password_length` in `supabase/config.toml`; `password_requirements` is empty), and `data.role` `trainee`, matching the `e2e` job. `trainee_id` is the signup JSON `user.id` (the same `session.user.id` `scripts/smoke.mjs` reads when a session is returned). It inserts `public.profiles` (`id` = that user id, `role` = `trainee`) and one `public.measurements` row (`measured_on` `2026-01-01`, `weight_kg` `80.0`, the seven `*_cm` columns `50.0`, `note` null) with `supabase db query --local`. It runs `supabase migration up` and requires the applied file to be exactly the newest migration filename. The follow-up query returns the text `migration-check-preserved` only when `weight_kg` is `80.0`, each of `chest_cm`, `waist_cm`, `arms_cm`, `thigh_cm`, `calf_cm`, `hips_cm`, and `navel_cm` is `50.0`, `count(*)` is `1`, and `trainee_id` is the signup user id. The script exits 0 when that token is present and exits non-zero otherwise. Stdout names the reset version and the applied filename.

#### 2. npm script

**File**: `package.json`

**Intent**: Give the local command the name the cookbook and CI will call.

**Contract**: `"migration-check": "node scripts/migration-check.mjs"`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes with `scripts/migration-check.mjs` included
- `npm run migration-check` exits 0 against a started local Supabase and reports reset version `20261002120000` and applied file `20261002150000_measurements_delete_own.sql`
- The passing select matches inserted `weight_kg` `80.0`, the seven circumference columns at `50.0`, `count(*)` `1`, and `trainee_id` from that run’s signup

#### Manual Verification:

- A measurement row created in the local database before the command is absent afterward, and the command prints that it resets the local database before the reset starts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Phase 2: CI and branch protection

### Overview

Run the local command in its own GitHub Actions job and make `main` require that job.

### Changes Required:

#### 1. Workflow job

**File**: `.github/workflows/ci.yml`

**Intent**: Give the check a runner that does not share the database `smoke` or `e2e` already started.

**Contract**: Add a job named `migration-check` on `ubuntu-latest`, triggered with the existing workflow (push and pull request to `main`). It checks out the repo, sets up Node 22, installs `supabase/setup-cli@v3` with `version: 2.117.0`, runs `npm ci`, starts local Supabase with `supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,storage-api,postgres-meta,supavisor`, runs `npm run migration-check`, and on `always()` runs `supabase stop --no-backup`. It does not build the app or start the preview.

#### 2. Required status check

**Intent**: A red `migration-check` job blocks merge the way a red `ci` or `smoke` job already does.

**Contract**: Read `GET /repos/gmaszkiewicz/training-manager/branches/main/protection`. PUT a constructed body in the shape from `context/archive/2026-10-05-block-merge-on-failed-ci/plan.md`. Set `required_status_checks.contexts` to the live contexts plus `migration-check` (`ci`, `smoke`, and `migration-check` on the rule read for this plan). Leave `strict` false. Keep `required_pull_request_reviews` with `required_approving_review_count` 0. Keep `enforce_admins`, force-push, and deletion settings as the live rule has them. Do not PUT the GET JSON. Do not send `required_pull_request_reviews: null`. Do not add `e2e`.

#### 3. CI description

**File**: `CLAUDE.md`

**Intent**: Keep the agent guide aligned with the jobs that actually run.

**Contract**: The CI section names the `migration-check` job: it starts local Supabase and runs `npm run migration-check`. The existing `ci`, `smoke`, and `e2e` sentences stay.

### Success Criteria:

#### Automated Verification:

- The `migration-check` job installs Supabase CLI `2.117.0`, starts local Supabase with smoke’s excluded services, runs `npm run migration-check`, and stops Supabase
- `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` shows required contexts `ci`, `smoke`, and `migration-check`, with `strict` false
- `CLAUDE.md` names the `migration-check` job beside `ci`, `smoke`, and `e2e`

#### Manual Verification:

- A pull request whose `migration-check` job is failing cannot be merged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Phase 3: Test-plan gate

### Overview

Record the check in the cookbook and mark the migration gate required. Leave the rollout table for the test-plan orchestrator.

### Changes Required:

#### 1. Cookbook, stack, and gate

**File**: `context/foundation/test-plan.md`

**Intent**: Tell the next reader where this proof lives and that the gate is now required.

**Contract**: §6.4 replaces the phase 4 TBD with this pattern: `scripts/migration-check.mjs`, run with `npm run migration-check` against a started local Supabase. The script resets to the version immediately before the newest file with `--no-seed`, signs up `migration-check@example.com` with a password of at least 6 characters and `data.role` `trainee`, inserts one profile and one measurement (`weight_kg` `80.0`, seven circumferences `50.0`), applies that newest file with `migration up`, and expects `migration-check-preserved` only when those numbers, `count(*)` `1`, and the signup `trainee_id` are still there. A journal read, a hosted `db push` exit code, an empty database with no pre-insert, and copying an `UPDATE` from a migration into the expected row are outside this pattern. §6.5 records that rollout phase 4 shipped that command, that no Playwright job was added, and that no hosted row select was added, with `Checked` set to the UTC date of the cookbook commit. §4 names `scripts/migration-check.mjs` and CLI `2.117.0` for this check. §5 changes the migration-check row to required on local Supabase and in CI, catching measurement numbers, row count, or owning trainee changed by the newest migration. The header `Last updated` and the §8 strategy review date move to that same cookbook date. §1, §2, and §3 stay as they are, including phase 4 status `not started` and change folder `—`.

### Success Criteria:

#### Automated Verification:

- §6.4 names `npm run migration-check`, reset to the version before the newest file, one inserted row with `weight_kg` `80.0` and circumferences `50.0`, and the select of those numbers, count `1`, and `trainee_id`
- §6.5 records that phase 4 shipped this check, with no Playwright job and no hosted row select
- §4 names `scripts/migration-check.mjs` and §5 marks the migration check required on local Supabase and in CI
- §1, §2, and the §3 rollout rows are unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

## Testing Strategy

The product check is `npm run migration-check`. Phase 1 runs it locally against the current newest file, `20261002150000_measurements_delete_own.sql`, after a reset to `20261002120000`. `npm run lint` covers `scripts/**/*.mjs`. Phase 2 repeats the command in the new CI job. No Vitest case and no Playwright spec are added. The negative path is the script’s non-zero exit when the selected token is absent; this plan does not add a temporary migration that rewrites `weight_kg`.

## Performance Considerations

The new job starts one local Supabase stack and resets it once. That is the same class of CI cost as the existing `smoke` job’s `supabase start`. The app’s request path is unchanged.

## Migration Notes

This change adds no SQL migration and does not push to hosted Supabase. `npm run migration-check` resets the local database and discards local rows. Hosted measurement rows are untouched. The compatibility rule in `CLAUDE.md` stays: migrations add first and drop in a later release, because the hosted push still runs before the new Worker.

## References

- Related research: `context/changes/testing-hosted-migration-preserves-measurements/research.md`
- Risk #6 and phase 4: `context/foundation/test-plan.md`
- Hosted push: `scripts/workers-build.mjs`
- Required checks today: `ci` and `smoke` on `gmaszkiewicz/training-manager` `main`
- Prior apply step that asserted grants, not row survival: `context/archive/2026-10-02-delete-measurement-entry/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Local check

#### Automated

- [ ] 1.1 `npm run lint` passes with `scripts/migration-check.mjs` included
- [ ] 1.2 `npm run migration-check` exits 0 against a started local Supabase and reports reset version `20261002120000` and applied file `20261002150000_measurements_delete_own.sql`
- [ ] 1.3 The passing select matches inserted `weight_kg` `80.0`, the seven circumference columns at `50.0`, `count(*)` `1`, and `trainee_id` from that run’s signup

#### Manual

- [ ] 1.4 A measurement row created in the local database before the command is absent afterward, and the command prints that it resets the local database before the reset starts

### Phase 2: CI and branch protection

#### Automated

- [ ] 2.1 The `migration-check` job installs Supabase CLI `2.117.0`, starts local Supabase with smoke’s excluded services, runs `npm run migration-check`, and stops Supabase
- [ ] 2.2 `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` shows required contexts `ci`, `smoke`, and `migration-check`, with `strict` false
- [ ] 2.3 `CLAUDE.md` names the `migration-check` job beside `ci`, `smoke`, and `e2e`

#### Manual

- [ ] 2.4 A pull request whose `migration-check` job is failing cannot be merged

### Phase 3: Test-plan gate

#### Automated

- [ ] 3.1 §6.4 names `npm run migration-check`, reset to the version before the newest file, one inserted row with `weight_kg` `80.0` and circumferences `50.0`, and the select of those numbers, count `1`, and `trainee_id`
- [ ] 3.2 §6.5 records that phase 4 shipped this check, with no Playwright job and no hosted row select
- [ ] 3.3 §4 names `scripts/migration-check.mjs` and §5 marks the migration check required on local Supabase and in CI
- [ ] 3.4 §1, §2, and the §3 rollout rows are unchanged
