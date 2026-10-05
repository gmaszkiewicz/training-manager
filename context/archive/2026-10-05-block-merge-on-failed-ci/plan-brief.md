# Block Merge When CI Fails — Plan Brief

> Full plan: `context/changes/block-merge-on-failed-ci/plan.md`

## What & Why

Pull requests to `main` already run tests, the production build, and the auth smoke. A failure used to leave Merge available while the repository was private on GitHub Free. The repository is public now, and `main` already has the protection rule this plan describes.

## Starting Point

`.github/workflows/ci.yml` runs jobs named `ci` and `smoke` on every pull request to `main`. The repository is public. Branch protection on `main` already matches this plan: loose checks `ci` and `smoke`, admins enforced, and zero approving reviews. Phase 2 writes that rule only when the live response differs. S-17 is a separate in-progress change that only aligns the written deploy path.

## Desired End State

`gmaszkiewicz/training-manager` is public. `main` accepts a change only as a pull request whose `ci` and `smoke` checks are green. The branch does not have to be updated to the latest `main` first. No second reviewer is required. The owner cannot bypass the rule, and a direct push to `main` is rejected.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| How to unlock the block | Make the repository public | GitHub Free enforces protected branches on public repositories, and both protection APIs return 403 while this one is private |
| Which checks block merge | `ci` and `smoke` | A green test and build with a red smoke must not reach `main` |
| Direct push | Rejected | A push to `main` would otherwise skip the pull request |
| Owner bypass | Off | The rule applies to the owner as well |
| Branch freshness | Loose | The pull-request head must be green, and it does not have to contain the latest `main` |
| Reviewers | Zero | A solo author can merge a green pull request |
| Workflow file | Leave `.github/workflows/ci.yml` unchanged | The jobs already publish checks named `ci` and `smoke` |
| S-17 | Leave it untouched | That change aligns deploy docs and keeps the current quality gate |

## Scope

**In scope:**

- Human makes `gmaszkiewicz/training-manager` public
- Branch protection on `main`: required pull request, checks `ci` and `smoke`, loose, admins enforced, zero approving reviews, no owner bypass, force push off

**Out of scope:**

- Edits to `.github/workflows/ci.yml`, including splitting test and build into their own check
- Edits to `context/changes/ci-cd-workflow-updates/` or the S-17 roadmap item
- A required human reviewer, code owners, or an up-to-date-with-`main` rule
- GitHub Pro, a ruleset file, or making the repository private again

## Architecture / Approach

The workflow already fails the right checks. Phase 1 is a human visibility confirmation, because an agent must not publish the repository. Phase 2 reads branch protection only after the Free-plan 403 is gone, and it PUTs the rule only when the live response differs. `required_pull_request_reviews` stays an object with zero required approvals. Setting it to null would allow a direct push again.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Make the repository public | Protection API is available | Publishing exposes git history; clones made while public remain |
| 2. Protect main | Red `ci` or `smoke` blocks merge, and direct push is rejected | A null pull-request rule, or the wrong check name, leaves a bypass in place |

**Prerequisites:** Admin rights on `gmaszkiewicz/training-manager`, and a decision that the git history may be public. `.env` and `.dev.vars` are not tracked.
**Estimated effort:** One short session. One visibility change, one API call, and three manual proofs.

## Open Risks & Assumptions

- The human, not the agent, sets visibility to public. Phase 2 cannot run before that.
- Making the repository private later does not recall forks or clones.
- Pull requests from forks outside this repository do not receive Actions secrets, so their build check can fail. Branches in this repository still receive `SUPABASE_URL` and `SUPABASE_KEY`.
- If a later change renames the `ci` or `smoke` job, the required contexts no longer match and the block silently drops that job.
- Job names `ci` and `smoke` were read from Actions run `37271652220`.

## Success Criteria (Summary)

- `gh repo view` reports `PUBLIC`, and the protection API no longer returns the Free-plan 403.
- `main` requires checks `ci` and `smoke`, does not require them to be up to date with `main`, enforces the rule for admins, and requires zero approving reviews.
- A failing pull request cannot be merged, a direct push to `main` is rejected, and a green pull request merges with no second reviewer.
