# Align contributor CI docs with the live pull-request gate — Plan Brief

> Full plan: `context/changes/new-pr-ci-cd-workflow/plan.md`

## What & Why

The change was opened to introduce the first GitHub Actions workflow for pull requests. That workflow is already `.github/workflows/ci.yml`. This plan records the live gate by correcting `CLAUDE.md` and `README.md`, which still describe a shorter set of checks, so the next reader does not add a second pipeline.

## Starting Point

`ci.yml` runs on every push and pull request to `main`. Job `ci` runs lint, the home-token check, `astro check`, Vitest, and a build that uses the `SUPABASE_URL` and `SUPABASE_KEY` repository secrets. Job `smoke` uses local Supabase and does not use those secrets. Cloudflare Workers Builds promotes `main`. `CLAUDE.md` mentions lint, build, and smoke. The README's `ci` bullet stops at lint, `astro check`, and build.

## Desired End State

Both CI sections name the two jobs and the checks above, and both say Actions does not deploy. The workflow file is unchanged. A pull request to `main` runs the same Actions jobs it runs today.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Pull-request gate | Leave `.github/workflows/ci.yml` unchanged | It already runs on push and pull requests to `main`. |
| Deploy | Stay on Cloudflare Workers Builds | The deployment plan keeps promotion there and leaves this workflow without a deploy job. |
| Where the record lives | `## CI` in `CLAUDE.md` and `README.md` | Those two sections omit the home-token check and Vitest. |
| Extra checks | None | Prettier, `npm audit`, Playwright, and required status checks stay out of this change. |
| Triggers | `main` only, as today | A pull request into any other branch still does not start Actions. |

## Scope

**In scope:**

- Rewrite the body of `## CI` in `CLAUDE.md` to match the live jobs
- Update the `ci` bullet in `## CI` in `README.md` to include `check:home-tokens` and `npm test`, keeping the smoke bullet's local-Supabase meaning

**Out of scope:**

- Any edit to `.github/workflows/ci.yml`
- An Actions deploy job, preview deploys, or a required status check
- Permissions, concurrency, timeouts, or action-pin changes
- Prettier, `npm audit`, or Playwright
- `deployment-plan.md` and the change title

## Architecture / Approach

The workflow file remains the source of truth. The two prose sections are updated to list the checks it already runs. Runner setup (`checkout`, Node, `npm ci`, `astro sync`) stays out of the docs. Deploy stays on Workers Builds.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Align the CI docs with the live workflow | `CLAUDE.md` and `README.md` CI sections match `ci.yml` | A later workflow edit can leave the paragraphs stale again, because nothing fails CI when the prose drifts |

**Prerequisites:** `.github/workflows/ci.yml` on the branch. No new secrets and no Supabase run for this edit.
**Estimated effort:** One short session, one phase.

## Open Risks & Assumptions

- The change title still says this introduces the first workflow. This plan does not rename it.
- A failing Actions run can still be merged. Required checks are a GitHub setting, and this plan leaves that setting alone.
- `context/changes/deployment/deployment-plan.md:5` still summarizes CI as lint / `astro check` / build / smoke. This plan does not edit that file.
- Assumption: "document the existing gate" means these two CI sections, and no other docs.

## Success Criteria (Summary)

- `CLAUDE.md` and `README.md` each name `check:home-tokens` and `npm test` in their CI coverage
- Both CI sections describe job `ci`, the build secrets, the local-Supabase smoke job, and that Actions does not deploy
- `.github/workflows/ci.yml` has no diff from this change
