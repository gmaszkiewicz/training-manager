# Block Merge When CI Fails Implementation Plan

## Overview

Make `main` accept a change only through a pull request whose `ci` and `smoke` checks are green. The repository is public, and `main` already has a protection rule that matches this plan. Phase 2 reads that rule and sends the protection body only when the live rule differs. `.github/workflows/ci.yml` stays as it is.

## Current State Analysis

`.github/workflows/ci.yml` runs on push and pull request to `main`. The `ci` job fails when lint, `check:home-tokens`, `astro check`, `npm test`, or `npm run build` fails. The `smoke` job fails when the local-Supabase auth smoke fails. The two jobs are separate checks. A recent run reported their names as `ci` and `smoke`.

A red check did not block merge while the repository was private, because GitHub Free returned HTTP 403 from the branch-protection API. The repository is now public. `GET /repos/gmaszkiewicz/training-manager/branches/main/protection` returns HTTP 200. The live rule already has `strict` false, contexts `ci` and `smoke`, `enforce_admins` true, `required_approving_review_count` 0, force pushes off, deletions off, and no bypass list. No ruleset file exists in the repo.

S-17 (`ci-cd-workflow-updates`) is already in progress. Its outcome is one written deploy path, with the quality gate left as it already runs. This change does not edit that plan or those docs.

## Desired End State

The repository is public. `main` requires a pull request. The required checks are `ci` and `smoke`, and they are loose: the pull-request head must be green, and the branch does not have to contain the latest `main`. The required approving review count is 0, so a solo author can merge a green pull request. Administrators do not bypass the rule. A direct push to `main`, including a force push, is rejected.

Verify with the protection API, then with one red pull request, one rejected push, and one green merge.

### Key Discoveries:

- `.github/workflows/ci.yml:3-7` triggers on push and pull request to `main`. The `ci` job is `:10-27`. The `smoke` job is `:29-57`. There is no deploy job.
- Actions run `37271652220` reported job names `ci` and `smoke`. Those strings are the status-check contexts.
- `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` returned 403 while the repo was private. It now returns HTTP 200 with the matching rule.
- `gh repo view` reports `visibility: PUBLIC`.
- Git history does not track `.env` or `.dev.vars`. `wrangler.jsonc` is tracked and is Worker config, not the Supabase secret values.
- GitHub's branch-protection API accepts `required_approving_review_count: 0`, which requires a pull request and does not require a reviewer. `null` for `required_pull_request_reviews` turns the pull-request requirement off and would leave direct push allowed.
- S-17's Change ID is `ci-cd-workflow-updates`. Its roadmap status is `in-progress`.

## What We're NOT Doing

- Leave `.github/workflows/ci.yml` unchanged. Same triggers, same jobs, no split between test and build.
- Leave `context/changes/ci-cd-workflow-updates/` and the S-17 roadmap text unchanged.
- Leave the required approving review count at 0. Do not require a second person, a code owner, or approval of the last push.
- Leave the up-to-date rule off. A green head is enough.
- Do not buy GitHub Pro. Public visibility is the unlock that was chosen.
- Do not add `CLOUDFLARE_API_TOKEN`, a deploy job, or a ruleset file.
- Do not make the repository private again as part of this change.

## Implementation Approach

The human makes the repository public. The agent does not. Phase 2 starts only after the protection API no longer returns the Free-plan 403.

Phase 2 reads classic branch protection on `main` through the GitHub API. It sends the body below only when the live rule differs in `strict`, the contexts, `enforce_admins`, `required_approving_review_count`, force pushes, deletions, or a bypass user. A matching rule is left in place. The intended rule requires a pull request, requires the contexts `ci` and `smoke`, sets `strict` to false, sets `enforce_admins` to true, and sets the approving review count to 0. No bypass allowance lists the owner. Force pushes and branch deletion stay off.

The proof is manual and uses a throwaway pull request. Do not push a failing commit to `main` to test the rule.

## Critical Implementation Details

Phase 2 cannot succeed while the repository is private. The 403 is the plan limit, not a missing token. Do not run `gh repo edit --visibility public`. The human flips visibility after checking that publishing the git history is acceptable.

`required_pull_request_reviews: null` disables the pull-request rule, so a direct push would still work. The object must be present with `required_approving_review_count` 0. Omit `dismissal_restrictions` and `bypass_pull_request_allowances` on this personal repository. Listing `gmaszkiewicz` there would give the owner the bypass this change rejects.

The required contexts are the job names `ci` and `smoke`, not `CI / ci`. Renaming a job later silently stops blocking that job.

## Phase 1: Make the repository public

### Overview

The human publishes `gmaszkiewicz/training-manager`. After that, the branch-protection API is available and phase 2 can run.

### Changes Required:

#### 1. Repository visibility

**File**: GitHub repository `gmaszkiewicz/training-manager` (no file in this repo)

**Intent**: Unlock protected branches on GitHub Free by making the repository public, without an agent performing that visibility change.

**Contract**: Visibility is `PUBLIC`. The human confirms the git history was acceptable to publish. `.env` and `.dev.vars` are not tracked. Phase 2 does not start while a protection request still returns HTTP 403 with the GitHub Pro message. HTTP 200 with the matching rule is the current result, not a 404.

### Success Criteria:

#### Automated Verification:

- `gh repo view gmaszkiewicz/training-manager --json visibility --jq .visibility` prints `PUBLIC`
- `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` does not return HTTP 403. HTTP 200 with the matching rule is the current result before phase 2

#### Manual Verification:

- The human confirms the git history is acceptable to publish, then sets the repository visibility to public

**Implementation Note**: After the automated checks pass, pause for the human visibility confirmation before phase 2. Phase blocks use plain bullets. The checkboxes live in `## Progress`.

---

## Phase 2: Protect main

### Overview

Require a pull request on `main` whose `ci` and `smoke` checks are green. Reject direct pushes, including from the owner. Do not require a reviewer and do not require the branch to be up to date with `main`.

### Changes Required:

#### 1. Branch protection on main

**File**: GitHub branch protection for `gmaszkiewicz/training-manager` branch `main` (no file in this repo)

**Intent**: Turn the existing red checks into a merge block, and reject a push that bypasses the pull request.

**Contract**: Read `GET /repos/gmaszkiewicz/training-manager/branches/main/protection` first. `PUT` the body below only when the live rule differs in `strict`, the contexts, `enforce_admins`, `required_approving_review_count`, force pushes, deletions, or a bypass user. The resulting rule has loose required checks `ci` and `smoke`, admins enforced, a pull request required, and zero approving reviews. Do not list a bypass actor. Do not edit `.github/workflows/ci.yml`. When the live rule already matches, do not `PUT`.

```json
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["ci", "smoke"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

### Success Criteria:

#### Automated Verification:

- `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` shows `required_status_checks.strict` false and contexts `ci` and `smoke`
- That response shows `enforce_admins.enabled` true
- That response shows `required_pull_request_reviews.required_approving_review_count` equal to 0, and `bypass_pull_request_allowances.users` does not include `gmaszkiewicz`
- `git diff -- .github/workflows/ci.yml` is empty

#### Manual Verification:

- A pull request whose `ci` or `smoke` check is failing cannot be merged
- `git push` to `main` is rejected for the owner
- A pull request whose `ci` and `smoke` checks are both green can be merged with no second approving review

**Implementation Note**: After the automated checks pass, pause for the three manual proofs before treating the phase as done.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. This change does not edit application code or the workflow file.

### Integration Tests:

- No new test job. The existing `ci` and `smoke` jobs are the checks the branch rule requires.

### Manual Testing Steps:

1. On a throwaway branch, open a pull request that fails `ci` or `smoke`. Confirm the Merge control stays blocked. Close that pull request without merging.
2. From a local clone, `git push origin main` and confirm GitHub rejects it. Do not force-push.
3. Open a pull request whose `ci` and `smoke` checks are both green. Merge it without asking a second person to approve.

## Performance Considerations

No application or workflow runtime change. Protection adds no extra CI job. Loose checks avoid a second run merely because `main` moved.

## Migration Notes

Publishing the repository exposes the current git history to anyone. Making it private later does not pull back clones or forks made while it was public. This plan does not reverse visibility.

Branch protection does not change Worker deploys or Supabase. A green pull request still merges to `main`, and the existing Workers Builds path still deploys that push. Fork pull requests from outside collaborators do not receive Actions secrets, so their `ci` build can fail the required check. Pull requests from branches in this repository still receive `SUPABASE_URL` and `SUPABASE_KEY`.

## References

- Workflow: `.github/workflows/ci.yml`
- Check names from Actions run `37271652220`: jobs `ci` and `smoke`
- GitHub plans (protected branches on public Free repositories): https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- Branch protection API: https://docs.github.com/en/rest/branches/branch-protection
- Separate in-progress change: `context/changes/ci-cd-workflow-updates/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Make the repository public

#### Automated

- [x] 1.1 `gh repo view gmaszkiewicz/training-manager --json visibility --jq .visibility` prints `PUBLIC` — c346232
- [x] 1.2 `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` does not return HTTP 403. HTTP 200 with the matching rule is the current result before phase 2 — c346232

#### Manual

- [x] 1.3 The human confirms the git history is acceptable to publish, then sets the repository visibility to public — c346232

### Phase 2: Protect main

#### Automated

- [x] 2.1 `gh api repos/gmaszkiewicz/training-manager/branches/main/protection` shows `required_status_checks.strict` false and contexts `ci` and `smoke`
- [x] 2.2 That response shows `enforce_admins.enabled` true
- [x] 2.3 That response shows `required_pull_request_reviews.required_approving_review_count` equal to 0, and `bypass_pull_request_allowances.users` does not include `gmaszkiewicz`
- [x] 2.4 `git diff -- .github/workflows/ci.yml` is empty

#### Manual

- [ ] 2.5 A pull request whose `ci` or `smoke` check is failing cannot be merged
- [ ] 2.6 `git push` to `main` is rejected for the owner
- [ ] 2.7 A pull request whose `ci` and `smoke` checks are both green can be merged with no second approving review
