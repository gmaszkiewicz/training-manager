# CI/CD Workflow Updates — Plan Brief

> Full plan: `context/changes/ci-cd-workflow-updates/plan.md`

## What & Why

The repo already deploys `main` through Cloudflare Workers Builds and uses GitHub Actions only as a quality gate. Four documents still disagree about that path. The Deployment section of the README, the infrastructure note, and the finished deployment plan tell Workers Builds to run `npm run build`, which skips hosted migrations. The infrastructure note also tells the reader to turn preview builds on.

## Starting Point

`.github/workflows/ci.yml` lints, checks home tokens, runs `astro check`, runs `npm test`, builds with `SUPABASE_URL` and `SUPABASE_KEY`, and runs a separate local-Supabase smoke job. `scripts/workers-build.mjs` applies migrations only when `WORKERS_CI_BRANCH` is `main`, then runs `npm run build`. README's migrations paragraph and `CLAUDE.md` already name `npm run build:workers`. The Cloudflare dashboard value is not in git; an earlier review left that switch open.

## Desired End State

README, CLAUDE.md, the infrastructure operational steps, and the deployment plan describe one pipeline: the current GitHub Actions gates, Workers Builds build command `npm run build:workers`, deploy command `npx wrangler deploy`, and non-production builds off. The Worker `training-manager` dashboard matches that, `SUPABASE_DB_URL` is set, and `WORKERS_CI_BRANCH` is left at Cloudflare's default.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| What "updates" means | Docs plus a dashboard check | The workflow already runs the gates earlier slices required; the open gap is a build command that can skip hosted migrations |
| Workflow file | Leave `.github/workflows/ci.yml` unchanged | Triggers, jobs, and steps were accepted by earlier reviews |
| Preview builds | Off | Matches the deployment that already shipped and avoids public preview URLs on the shared Supabase project |
| Documents | README, CLAUDE.md, infrastructure.md, deployment-plan.md | Those four still disagree with `scripts/workers-build.mjs` or with each other |
| Finished runbook | Correct the current command in Polish and keep `[x]` items | A later reader would otherwise copy `npm run build` from a completed checklist |
| Dashboard | Manual check in phase 1 | The Builds settings are not in the repo |
| Pending migrations | Next `main` build runs `db push` | This change must not push `main` or run `db push` from the workspace |

## Scope

**In scope:**

- Rewrite the Workers Builds command, preview setting, and CI summary in the four documents above
- State that `WORKERS_CI_BRANCH` must not be overridden
- Manually confirm Worker `training-manager` Builds settings and the `SUPABASE_DB_URL` secret

**Out of scope:**

- Any edit to `.github/workflows/ci.yml`, `scripts/workers-build.mjs`, `package.json`, or `context/foundation/tech-stack.md`
- Enabling preview builds or adding a GitHub Actions deploy job
- Rewriting the infrastructure pre-mortem, risk register, or research out-of-scope list
- Translating the deployment plan, or unchecking its completed items
- Pushing `main` or applying migrations from this workspace

## Architecture / Approach

GitHub Actions stays the quality gate. Workers Builds on `main` runs `npm run build:workers`, which pushes migrations only when the injected `WORKERS_CI_BRANCH` is `main`, then builds the Worker. The dashboard deploy command stays `npx wrangler deploy`. This change rewrites the four docs that still describe a different command or that turn previews on, then a person confirms the dashboard. Manual `npm run deploy` stays a local build plus `wrangler deploy` and still does not apply migrations.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Align the four docs | The four docs match the live pipeline, and the dashboard is confirmed | A search that deletes every `npm run build` would wipe the manual deploy path; the dashboard change does not itself apply SQL |

**Prerequisites:** Access to Cloudflare Worker `training-manager` → Settings → Builds, including build secrets.
**Estimated effort:** One short session. Documentation edits plus a dashboard check.

## Open Risks & Assumptions

- The dashboard may already use `npm run build:workers`. The manual check then passes with no setting change.
- If it still uses `npm run build`, hosted Supabase may be behind the migrations in the repo. The next `main` build runs `db push`. A failed push blocks that deploy.
- Overriding `WORKERS_CI_BRANCH` to anything other than `main` skips migrations and the build still succeeds.
- `context/foundation/tech-stack.md` frontmatter still says `ci_default_flow: auto-deploy-on-merge`. That file is out of scope, so a later reader can still misread it.
- `WORKERS_CI_BRANCH` injection is taken from Cloudflare's Builds configuration docs. This workspace cannot see the live dashboard.

## Success Criteria (Summary)

- The four documents name `npm run build:workers` as the Workers Builds build command, keep non-production builds off, and describe the CI gates that `.github/workflows/ci.yml` already runs.
- `.github/workflows/ci.yml` has no diff from this change.
- Worker `training-manager` Builds uses that build command and deploy command, with `SUPABASE_DB_URL` set and `WORKERS_CI_BRANCH` left at the default.
