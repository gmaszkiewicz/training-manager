# CI/CD Workflow Updates Implementation Plan

## Overview

Align the four documents that still describe Cloudflare Workers Builds and GitHub Actions with the pipeline that already exists. Workers Builds on `main` must be documented as `npm run build:workers`, and a person confirms the Cloudflare dashboard uses that command. After that docs pass, the workflow's action majors were bumped to `actions/checkout@v7`, `actions/setup-node@v7`, and `supabase/setup-cli@v3`. Triggers, jobs, and step commands stay the same.

## Current State Analysis

GitHub Actions (`.github/workflows/ci.yml`) is a quality gate on push and pull request to `main`. The `ci` job runs lint, `check:home-tokens`, `astro check`, `npm test`, and `npm run build` with repository secrets `SUPABASE_URL` and `SUPABASE_KEY`. The `smoke` job starts local Supabase, builds, serves the production preview, and runs `npm run smoke`. There is no deploy job.

Hosted deploys are Cloudflare Workers Builds. `package.json` maps `build:workers` to `scripts/workers-build.mjs`, which runs `npx supabase db push` only when `WORKERS_CI_BRANCH` is `main`, then `npm run build`. Cloudflare injects `WORKERS_CI_BRANCH` by default. Manual `npm run deploy` is `npm run build && wrangler deploy` and does not apply migrations.

The docs disagree with that path and with each other:

- `README.md` migrations paragraph already says `npm run build:workers`. The Deployment section still tells the dashboard to use `npm run build`. The CI section omits `check:home-tokens`, `npm test`, and the shape of the smoke job.
- `CLAUDE.md` already names `npm run build:workers` and `WORKERS_CI_BRANCH`. Its CI section says lint + build + smoke and omits the token check and `npm test`.
- `context/foundation/infrastructure.md` tells the reader to enable non-production builds and `wrangler versions upload`, and it says CI only lints and builds.
- `context/changes/deployment/deployment-plan.md` records the first deploy with build command `npm run build`. Non-production builds are already off in that file.

An earlier review left the dashboard switch to `npm run build:workers` open outside the repo (`context/archive/2026-09-26-trainee-signup/reviews/impl-review-2.md`). The repo cannot see the live dashboard value.

## Desired End State

A reader of `README.md`, `CLAUDE.md`, or `context/foundation/infrastructure.md` gets the same quality gate: lint, `check:home-tokens`, `astro check`, `npm test`, build, and the local-Supabase smoke job, with no deploy job. A reader of any of those three, or of `context/changes/deployment/deployment-plan.md`, gets the same Workers Builds settings: build `npm run build:workers`, deploy `npx wrangler deploy`, and non-production branch builds off. The deployment plan's opening CI sentence stays the shorter historical list.

The Worker `training-manager` dashboard matches that build command, deploy command, branch, and preview setting. `SUPABASE_DB_URL` is present as a Workers Builds secret, and `WORKERS_CI_BRANCH` is left at Cloudflare's default so a `main` build applies migrations.

### Key Discoveries:

- `.github/workflows/ci.yml:3-7` triggers only on push and pull request to `main`. Steps are at `:19-27` (`ci`) and `:29-57` (`smoke`). Earlier reviews accepted those triggers and gates.
- `scripts/workers-build.mjs:13-22` refuses a `main` build when `SUPABASE_DB_URL` is missing, skips `db push` on any other branch, then always runs `npm run build`.
- Cloudflare Workers Builds injects `WORKERS_CI_BRANCH` from the push (`https://developers.cloudflare.com/workers/ci-cd/builds/configuration/`). A dashboard override of that variable changes whether migrations run.
- `README.md:131` matches the script. `README.md:165` and `README.md:181-187` do not match the live workflow.
- `CLAUDE.md:63` matches the script. `CLAUDE.md:68` under-lists the CI gates.
- `context/foundation/infrastructure.md:88` and `:117` still prescribe previews and a bare `npm run build` for Workers Builds. `:119-123` is the original research boundary and stays.
- `context/changes/deployment/deployment-plan.md:28` and `:121` still show `npm run build`. `:123` and `:136-137` already keep previews off.
- `context/foundation/tech-stack.md` frontmatter still says `ci_default_flow: auto-deploy-on-merge`. That file is outside this change.

## What We're NOT Doing

- Do not change `.github/workflows/ci.yml` triggers, jobs, or step commands, and do not add a concurrency rule or a deploy job. Action majors were updated to `actions/checkout@v7`, `actions/setup-node@v7`, and `supabase/setup-cli@v3`.
- Leave `scripts/workers-build.mjs`, `package.json` scripts, and `context/foundation/tech-stack.md` unchanged.
- Keep non-production Workers Builds off. Leave preview URLs and `wrangler versions upload` out of the current setup.
- Leave the infrastructure pre-mortem, unknown unknowns, risk register, and the "CI/CD pipeline setup" out-of-scope line as written. Those passages warn or record research limits; they are not the current setup instructions.
- Keep `context/changes/deployment/deployment-plan.md` in Polish. Leave existing `[x]` checklist items checked.
- Leave manual `npm run deploy` (`npm run build && wrangler deploy`) as the human CLI path, which does not apply migrations.
- Do not push `main`, run `npx supabase db push` from this workspace, or add `CLOUDFLARE_API_TOKEN` to GitHub as part of this change.

## Implementation Approach

Correct the living instructions in place. Where a sentence already matches `scripts/workers-build.mjs`, leave it. Where Deployment, CI, the infrastructure operational steps, or the deployment-plan build command would send a reader to `npm run build` or to preview uploads, replace that instruction with the current pipeline.

Treat `context/changes/deployment/deployment-plan.md` as a finished first-deploy record. Update the command a later reader would copy, and add one Polish sentence that the first connected build used `npm run build`. That command does not apply hosted migrations.

The dashboard is not in git. Phase 1 ends with a manual check. If the build command is still `npm run build`, set it to `npm run build:workers`. The next push to `main` is what runs `supabase db push`. This change does not push.

## Critical Implementation Details

Bare `npm run build` remains correct for manual `npm run deploy` and for the first-deploy narrative. A sweep that deletes every `npm run build` would erase the manual path. Change only the Workers Builds build command.

`WORKERS_CI_BRANCH` is how `scripts/workers-build.mjs` tells `main` from every other branch. Document that it must stay at Cloudflare's injected default. Overriding it to any other value skips `db push` and the build still succeeds.

Preview warnings in the infrastructure risk register and unknown unknowns stay. They explain why previews are off. The Operational Story and Getting Started step 5 are the sentences that currently tell the reader to turn previews on; those are the ones to rewrite.

## Phase 1: Align the four docs

### Overview

Make `README.md`, `CLAUDE.md`, and `context/foundation/infrastructure.md` describe the same quality gate. Make those three and `context/changes/deployment/deployment-plan.md` describe the same Workers Builds settings, then confirm those settings in the Cloudflare dashboard. Leave the deployment plan's opening CI sentence as the shorter historical list.

### Changes Required:

#### 1. README deployment and CI sections

**File**: `README.md`

**Intent**: Stop the Deployment section from telling Workers Builds to use `npm run build`, and make the CI section list the gates the workflow already runs.

**Contract**: Under `## Deployment`, the Workers Builds build command is `npm run build:workers`, the deploy command is `npx wrangler deploy`, and non-production branch builds stay off. Manual `npm run deploy` stays `npm run build && wrangler deploy` and does not apply migrations. The hosted-migrations paragraph (`README.md` around the `build:workers` sentence) stays consistent with that and keeps `SUPABASE_DB_URL` as a Workers Builds secret. Under `## CI`, the `ci` job includes lint, `npm run check:home-tokens`, `npx astro check`, `npm test`, and `npm run build` with repository secrets `SUPABASE_URL` and `SUPABASE_KEY`. The `smoke` job starts local Supabase, builds, serves the production preview, and runs `npm run smoke`, with no repository secrets. GitHub Actions does not deploy. Production promotion stays on Workers Builds when `main` is pushed.

#### 2. CLAUDE.md environment and CI

**File**: `CLAUDE.md`

**Intent**: Make the agent-facing CI summary match `.github/workflows/ci.yml`, and state the branch-variable rule the build script depends on.

**Contract**: The auto-deploy bullet keeps build `npm run build:workers`, deploy `npx wrangler deploy`, and `supabase db push` only when `WORKERS_CI_BRANCH` is `main`. It also states that `WORKERS_CI_BRANCH` must not be overridden, that non-production builds stay off, that `SUPABASE_DB_URL` is a Workers Builds secret, that GitHub Actions does not deploy, and that `npm run deploy` does not apply migrations. The `## CI` section names lint, `check:home-tokens`, `astro check`, `npm test`, build (repository secrets `SUPABASE_URL` and `SUPABASE_KEY`), and the smoke job. It stays a quality gate on push and pull request to `main`. The manual deploy bullet (`npm run build && wrangler deploy`) stays.

#### 3. Infrastructure operational instructions

**File**: `context/foundation/infrastructure.md`

**Intent**: Replace the current-setup sentences that enable preview builds and that use `npm run build` as the Workers Builds command.

**Contract**: In `## Operational Story`, the production branch `main` uses build command `npm run build:workers` and deploy command `npx wrangler deploy`. Non-production branch builds stay off. That bullet does not tell the reader to run `wrangler versions upload`. It describes GitHub Actions as the quality gate (lint, token check, `astro check`, test, build, smoke) that does not deploy. In `## Getting Started` step 5, the same build and deploy commands appear, and the non-production `wrangler versions upload` instruction is removed in favor of non-production builds off. Leave the pre-mortem, unknown unknowns, risk register, and `## Out of Scope` list unchanged, including the preview-URL warnings and the "CI/CD pipeline setup" line. Leave the manual deploy command in Getting Started step 3 (`npm run build && npx wrangler deploy`) unchanged.

#### 4. Deployment plan build command

**File**: `context/changes/deployment/deployment-plan.md`

**Intent**: Make the finished runbook show the current Workers Builds command without rewriting the first deploy as if it had used that command.

**Contract**: Keep the file in Polish. The mermaid `buildCmd` node and section 5's build-command setting show `npm run build:workers`. Deploy command stays `npx wrangler deploy`. Non-production builds stay off (`wyłączone`). Add one Polish sentence that the first connected build used `npm run build`, and that this command does not apply hosted migrations. Existing `[x]` items stay `[x]`. `## Poza zakresem` continues to exclude a GitHub Actions deploy job and preview URLs. Section 4's manual `npm run build && npx wrangler deploy` stays.

### Success Criteria:

#### Automated Verification:

- README `## Deployment` states the Workers Builds build command `npm run build:workers`, the deploy command `npx wrangler deploy`, and that non-production branch builds stay off, and it still describes manual `npm run deploy` as `npm run build && wrangler deploy` without applying migrations
- README `## CI` names the ci job steps lint, `check:home-tokens`, `astro check`, `npm test`, and build with repository secrets `SUPABASE_URL` and `SUPABASE_KEY`, names the smoke job as local Supabase plus preview plus `npm run smoke`, and states that GitHub Actions does not deploy
- CLAUDE.md states Workers Builds build command `npm run build:workers`, that `scripts/workers-build.mjs` runs `supabase db push` only when `WORKERS_CI_BRANCH` is `main`, that `WORKERS_CI_BRANCH` must not be overridden, that non-production builds stay off, and that CI includes lint, `check:home-tokens`, `astro check`, `npm test`, build, and smoke
- `context/foundation/infrastructure.md` Operational Story and Getting Started step 5 state build command `npm run build:workers` and deploy command `npx wrangler deploy` with non-production builds off, those two places do not tell the reader to run `wrangler versions upload`, and the Operational Story describes GitHub Actions as the quality gate (lint, token check, `astro check`, test, build, smoke) that does not deploy
- `context/changes/deployment/deployment-plan.md` mermaid and section 5 name the current Workers Builds build command `npm run build:workers`, keep non-production builds off, stay in Polish, leave existing `[x]` items checked, and include one Polish sentence that the first connected build used `npm run build` and that this command does not apply hosted migrations
- `.github/workflows/ci.yml` keeps the same triggers, jobs, and step commands. Its action majors are `actions/checkout@v7`, `actions/setup-node@v7`, and `supabase/setup-cli@v3`.

#### Manual Verification:

- In Cloudflare Worker `training-manager` Settings → Builds, the build command is `npm run build:workers`, the deploy command is `npx wrangler deploy`, the production branch is `main`, and non-production branch builds are off
- `SUPABASE_DB_URL` is set as a Workers Builds secret, and `WORKERS_CI_BRANCH` is not overridden

**Implementation Note**: After the automated checks pass, pause for the dashboard confirmation before treating the phase as done. Phase blocks use plain bullets. The checkboxes for these items live in `## Progress`.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. This change edits documentation only.

### Integration Tests:

- No new integration tests. `.github/workflows/ci.yml` keeps the same jobs. Action majors are current, and the existing lint, test, build, and smoke jobs stay the automated product gate.

### Manual Testing Steps:

1. Open Worker `training-manager` → Settings → Builds. Record the build command, deploy command, production branch, and whether non-production branch builds are enabled.
2. If the build command is `npm run build`, set it to `npm run build:workers`. Deploy command stays `npx wrangler deploy`. Production branch stays `main`. Non-production branch builds stay off.
3. Confirm `SUPABASE_DB_URL` is stored as a Workers Builds secret (a build variable or secret, not a runtime secret). Confirm `WORKERS_CI_BRANCH` has no custom override.
4. Stop there. Do not push `main` and do not run `npx supabase db push` from this workspace. The next push to `main` is what applies pending hosted migrations.

## Performance Considerations

No runtime or bundle change. The workflow file only bumps action majors.

## Migration Notes

Updating the dashboard build command does not apply SQL by itself. The next successful Workers Build of `main` runs `npx supabase db push` before `npm run build`. If `SUPABASE_DB_URL` is missing, that build exits before the Worker build. If `db push` fails, the deploy stops. Worker rollback still does not undo a migration that already landed.

If the dashboard has been on `npm run build`, hosted Supabase may be behind the migrations already in the repo. This change does not backfill them ahead of that next `main` build.

## References

- Workflow: `.github/workflows/ci.yml`
- Build script: `scripts/workers-build.mjs:13-22`
- Finished first deploy: `context/changes/deployment/deployment-plan.md`
- Open dashboard follow-up: `context/archive/2026-09-26-trainee-signup/reviews/impl-review-2.md`
- Workers Builds default variables, including `WORKERS_CI_BRANCH`: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Align the four docs

#### Automated

- [x] 1.1 README `## Deployment` states the Workers Builds build command `npm run build:workers`, the deploy command `npx wrangler deploy`, and that non-production branch builds stay off, and it still describes manual `npm run deploy` as `npm run build && wrangler deploy` without applying migrations — a6b1662
- [x] 1.2 README `## CI` names the ci job steps lint, `check:home-tokens`, `astro check`, `npm test`, and build with repository secrets `SUPABASE_URL` and `SUPABASE_KEY`, names the smoke job as local Supabase plus preview plus `npm run smoke`, and states that GitHub Actions does not deploy — a6b1662
- [x] 1.3 CLAUDE.md states Workers Builds build command `npm run build:workers`, that `scripts/workers-build.mjs` runs `supabase db push` only when `WORKERS_CI_BRANCH` is `main`, that `WORKERS_CI_BRANCH` must not be overridden, that non-production builds stay off, and that CI includes lint, `check:home-tokens`, `astro check`, `npm test`, build, and smoke — a6b1662
- [x] 1.4 `context/foundation/infrastructure.md` Operational Story and Getting Started step 5 state build command `npm run build:workers` and deploy command `npx wrangler deploy` with non-production builds off, those two places do not tell the reader to run `wrangler versions upload`, and the Operational Story describes GitHub Actions as the quality gate (lint, token check, `astro check`, test, build, smoke) that does not deploy — a6b1662
- [x] 1.5 `context/changes/deployment/deployment-plan.md` mermaid and section 5 name the current Workers Builds build command `npm run build:workers`, keep non-production builds off, stay in Polish, leave existing `[x]` items checked, and include one Polish sentence that the first connected build used `npm run build` and that this command does not apply hosted migrations — a6b1662
- [x] 1.6 `git diff -- .github/workflows/ci.yml` is empty — a6b1662. True at a6b1662; 12641a9 later bumped the action majors.

#### Manual

- [ ] 1.7 In Cloudflare Worker `training-manager` Settings → Builds, the build command is `npm run build:workers`, the deploy command is `npx wrangler deploy`, the production branch is `main`, and non-production branch builds are off
- [ ] 1.8 `SUPABASE_DB_URL` is set as a Workers Builds secret, and `WORKERS_CI_BRANCH` is not overridden
