# Align contributor CI docs with the live pull-request gate

## Overview

`.github/workflows/ci.yml` already validates every push and pull request to `main`. This plan records that gate by correcting the CI sections in `CLAUDE.md` and `README.md`, which still describe a shorter set of checks. The workflow file stays as it is. Production promotion stays on Cloudflare Workers Builds.

## Current State Analysis

One GitHub Actions workflow exists. `name: CI` runs on `push` to `main` and `pull_request` targeting `main` (`.github/workflows/ci.yml:3-7`).

Job `ci` (`.github/workflows/ci.yml:10-27`) checks out the repo, sets up Node 22, runs `npm ci` and `npx astro sync`, then:

- `npm run lint` (`package.json:12`)
- `npm run check:home-tokens` (`package.json:14`)
- `npx astro check`
- `npm test` (`package.json:17`, `vitest run`)
- `npm run build` with repository secrets `SUPABASE_URL` and `SUPABASE_KEY` (`.github/workflows/ci.yml:25-27`)

Job `smoke` (`.github/workflows/ci.yml:29-57`) starts local Supabase, writes `.env` and `.dev.vars` from that stack's API URL and anon key, builds, serves the production preview on port 4321, and runs `npm run smoke`. It does not read GitHub secrets.

`CLAUDE.md:68` says the workflow runs lint, build, and smoke. `README.md:184` says job `ci` runs lint, `astro check`, and build. Neither file names the home-token check or Vitest. `README.md:182-185` already says Actions does not deploy, and it describes the smoke job as local Supabase with no secrets.

`context/changes/deployment/deployment-plan.md:5` keeps this workflow unchanged and keeps auto-deploy on Workers Builds. There is no Actions deploy job.

### Key Discoveries:

- The pull-request gate is `.github/workflows/ci.yml`, already on `push` and `pull_request` to `main` (`.github/workflows/ci.yml:3-7`).
- The checks a reader must be able to name are lint, `check:home-tokens`, `astro check`, `npm test`, the secret-backed build, and the separate smoke job (`.github/workflows/ci.yml:21-27`, `.github/workflows/ci.yml:29-57`).
- Contributor docs under-list that gate: `CLAUDE.md:68` and `README.md:184`.
- Deploy stays outside Actions: `context/changes/deployment/deployment-plan.md:5`.

## Desired End State

A reader of `## CI` in `CLAUDE.md` or `README.md` can name both jobs and the checks they run, including the home-token check, `astro check`, Vitest, the build secrets, and the local-Supabase smoke job. Both sections say GitHub Actions does not deploy and that production promotion is Cloudflare Workers Builds. `.github/workflows/ci.yml` is byte-for-byte unchanged. Nothing new runs in Actions.

## What We're NOT Doing

- Adding a workflow file, or editing `.github/workflows/ci.yml`
- Adding an Actions deploy job, a Cloudflare token in GitHub, or preview deploys
- Changing triggers, permissions, concurrency, timeouts, or action pins
- Making the workflow a required status check in GitHub branch protection
- Adding Prettier, `npm audit`, or Playwright to CI
- Editing `context/changes/deployment/deployment-plan.md`, even though its line 5 also omits Vitest and the home-token check
- Renaming this change or rewriting `change.md` notes; the title still says this introduces the first workflow

## Implementation Approach

Treat `.github/workflows/ci.yml` as the source of truth. Update only the `## CI` section in each contributor doc so the prose lists the jobs and checks that file already runs. Leave runner setup (`actions/checkout`, `actions/setup-node`, `npm ci`, `npx astro sync`) out of the prose. Those steps are environment setup, and the quality gate is the commands that follow.

## Phase 1: Align the CI docs with the live workflow

### Overview

Bring `CLAUDE.md` and `README.md` into agreement with the two jobs in `.github/workflows/ci.yml`, without changing that workflow.

### Changes Required:

#### 1. CLAUDE.md CI section

**File**: `CLAUDE.md`

**Intent**: Replace the under-specified CI paragraph so an agent reading this file sees the same gate the workflow runs.

**Contract**: Edit only the body of `## CI` (`CLAUDE.md:66-68`). The section must state all of the following:

- The workflow path is `.github/workflows/ci.yml`
- It runs on `push` to `main` and on `pull_request` targeting `main`
- Job `ci` runs `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, and `npm run build`
- That build uses repository secrets `SUPABASE_URL` and `SUPABASE_KEY`
- Job `smoke` starts local Supabase, builds, serves the production preview, and runs `npm run smoke`, without GitHub secrets
- GitHub Actions is a quality gate and does not deploy; production promotion is Cloudflare Workers Builds

Do not name `npm run format`, `npm audit`, Playwright, or `wrangler deploy` as workflow steps. Leave every other heading in `CLAUDE.md` unchanged.

#### 2. README.md CI section

**File**: `README.md`

**Intent**: Update the published CI section so contributors see the same two jobs and the same checks.

**Contract**: Edit only `## CI` (`README.md:180-187`). Keep the heading. The `ci` bullet (`README.md:184`) must add `npm run check:home-tokens` and `npm test` beside lint, `astro check`, and the build that uses `SUPABASE_URL` and `SUPABASE_KEY`. The smoke bullet must keep its current meaning: local Supabase via the Supabase CLI, production preview, `npm run smoke`, no GitHub secrets (`README.md:185`). Keep the statements that Actions does not deploy (`README.md:182`) and that production deploys run in Cloudflare Workers Builds when `main` is pushed (`README.md:187`). Do not name `npm run format`, `npm audit`, Playwright, or `wrangler deploy` as workflow steps. Leave every other heading in `README.md` unchanged.

### Success Criteria:

#### Automated Verification:

- `git diff --exit-code -- .github/workflows/ci.yml` exits 0
- `rg -n "check:home-tokens" CLAUDE.md README.md` matches both files
- `rg -n "npm test" CLAUDE.md README.md` matches both files

#### Manual Verification:

- Read `## CI` in `CLAUDE.md` and `README.md` against `.github/workflows/ci.yml` lines 3-57: job `ci` names lint, the home-token check, `astro check`, Vitest, and the build with `SUPABASE_URL` and `SUPABASE_KEY`; job `smoke` names local Supabase and no GitHub secrets; both sections say Actions does not deploy; neither section adds Prettier, `npm audit`, Playwright, or a deploy job; no other section in either file changed

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. The gate this change describes is already `npm test` inside job `ci`. This change does not alter that command or any test file.

### Integration Tests:

- No integration or smoke run is required to prove the doc edit. Job `smoke` stays as implemented in `.github/workflows/ci.yml:29-57`.

### Manual Testing Steps:

1. Open `## CI` in `CLAUDE.md` and `README.md` next to `.github/workflows/ci.yml`.
2. Confirm each named command appears in that workflow, and that both sections include `check:home-tokens` and `npm test`.
3. Confirm both sections say Actions does not deploy, and that the smoke job is local Supabase with no GitHub secrets.
4. Confirm `git diff` for this phase touches the `## CI` sections only, plus any plan-progress update the implement step writes.

## Performance Considerations

Doc-only. No runtime, CI-minute, or build impact.

## Migration Notes

No schema, data, or workflow migration. Existing pull requests keep the current Actions runs.

## References

- Live gate: `.github/workflows/ci.yml`
- Stale paragraphs: `CLAUDE.md:68`, `README.md:184`
- Deploy split: `context/changes/deployment/deployment-plan.md:5`
- Scripts: `package.json:12` (`lint`), `package.json:14` (`check:home-tokens`), `package.json:17` (`test`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Align the CI docs with the live workflow

#### Automated

- [x] 1.1 `git diff --exit-code -- .github/workflows/ci.yml` exits 0
- [x] 1.2 `rg -n "check:home-tokens" CLAUDE.md README.md` matches both files
- [x] 1.3 `rg -n "npm test" CLAUDE.md README.md` matches both files

#### Manual

- [ ] 1.4 Read `## CI` in `CLAUDE.md` and `README.md` against `.github/workflows/ci.yml` lines 3-57: job `ci` names lint, the home-token check, `astro check`, Vitest, and the build with `SUPABASE_URL` and `SUPABASE_KEY`; job `smoke` names local Supabase and no GitHub secrets; both sections say Actions does not deploy; neither section adds Prettier, `npm audit`, Playwright, or a deploy job; no other section in either file changed
