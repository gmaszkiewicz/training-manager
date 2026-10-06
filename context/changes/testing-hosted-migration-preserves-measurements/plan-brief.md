# Hosted migration preserves measurements — Plan Brief

> Full plan: `context/changes/testing-hosted-migration-preserves-measurements/plan.md`
> Research: `context/changes/testing-hosted-migration-preserves-measurements/research.md`

## What & Why

A migration can apply cleanly on an empty local database and still change measurement numbers, drop rows, or move a row to another trainee once rows already exist. This change adds the phase 4 check: insert one known row, apply the newest migration, and select the numbers, the count, and the owner. A failing run blocks the pull request before `main` can push that migration to hosted Supabase.

## Starting Point

Seven local migrations create `public.measurements` and then add grants and policies. The newest file is the delete-own grant, `20261002150000_measurements_delete_own.sql`. CI starts Supabase and applies that whole set before any row exists. The hosted push records whether `db push` exited cleanly. `main` requires `ci` and `smoke`. The journal list omits `trainee_id`.

## Desired End State

`npm run migration-check` resets the local database to the version before the newest migration, inserts one trainee measurement (`weight_kg` `80.0`, circumferences `50.0`), applies that newest file, and passes only when those numbers, a count of 1, and the same `trainee_id` are still there. CI runs that command as the `migration-check` job. `main` requires `ci`, `smoke`, and `migration-check`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Migration under test | Newest file each run | `migration up` applies the whole pending set, so reset stops at the previous version and a failure points at one file | Plan |
| Where it is required | Local command and a CI job | A newest migration that changes the seeded row fails the pull request before `main` pushes it | Plan |
| Oracle | Inserted `80.0` / `50.0`, count `1`, signup `trainee_id` | Risk #6 expects the insert’s own values, and the journal select omits `trainee_id` | Research |
| SQL client | `supabase db query --local` | CLI 2.117.0 can run SQL, and the local `postgres` role bypasses RLS | Research |
| Before-state | Reset `--version` previous `--no-seed`, then signup, profile, one row | The seed file is missing, and a measurement needs `auth.users` and `profiles` | Research |
| CI CLI | Pin `2.117.0` | Those flags were read on this version, and the lockfile already resolves it | Plan |
| Older files | Left applied before the insert | The interview cause stays unnamed; a later file is covered when it becomes newest | Research |
| Two new files in one change | Only the last runs after the insert | That is the tradeoff of checking the newest file only | Plan |

## Scope

**In scope:**

- `scripts/migration-check.mjs` and `npm run migration-check`
- A `migration-check` CI job on CLI 2.117.0
- Adding that job name to branch protection beside `ci` and `smoke`
- Test-plan §4, §5, §6.4, and §6.5, plus the CI sentence in `CLAUDE.md`

**Out of scope:**

- Walking every migration after the measurements table
- Hosted row selects, `workers-build.mjs`, and `supabase/seed.sql`
- Playwright, journal HTML, and asserting `note`, `measured_on`, `id`, or `created_at`
- Required status for the `e2e` job
- Test-plan §1, §2, and §3

## Architecture / Approach

The script sorts `supabase/migrations`, resets to the second-newest version, signs up `migration-check@example.com` with a password of at least 6 characters and `data.role` `trainee`, takes `trainee_id` from signup `user.id`, inserts one profile and one measurement, and applies the pending file. SQL equality produces the token `migration-check-preserved` when `weight_kg` is `80.0`, the seven circumferences are `50.0`, `count(*)` is `1`, and `trainee_id` is the signup id. The CI job starts its own local Supabase so the reset does not wipe the `smoke` or `e2e` databases.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Local check | The script and `npm run migration-check` | Reset or signup after reset may differ from the CLI help text |
| 2. CI and branch protection | Job `migration-check` required on `main` | A job that is not in the protection contexts does not block merge |
| 3. Test-plan gate | Cookbook and required gate | §3 must stay for the rollout orchestrator |

**Prerequisites:** Docker for local Supabase, and `gh` access to branch protection on `gmaszkiewicz/training-manager`.
**Estimated effort:** About one to two sessions across 3 phases.

## Open Risks & Assumptions

- Research did not execute `db reset --version` or `db query`. Signup after that reset is assumed from the running Auth API and `enable_confirmations = false`.
- A green run of `20261002150000_measurements_delete_own.sql` shows that grant left the row in place. A later `UPDATE` fails this check when that file is the newest one.
- The hosted push still records only its exit status. This check is a local replay.

## Success Criteria (Summary)

- `npm run migration-check` passes for reset version `20261002120000` and applied file `20261002150000_measurements_delete_own.sql`, with `weight_kg` `80.0`, circumferences `50.0`, count `1`, and the signup `trainee_id`.
- The `migration-check` job uses CLI `2.117.0`, and `main` requires `ci`, `smoke`, and `migration-check`.
- The cookbook points the next migration-after-rows check at `npm run migration-check`.
