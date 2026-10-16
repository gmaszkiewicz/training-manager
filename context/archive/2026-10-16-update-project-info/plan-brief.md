# Update the README and sync slice issues — Plan Brief

> Full plan: `context/changes/update-project-info/plan.md`

## What & Why

The README still describes the Astro starter, including a clone URL for `przeprogramowani/10x-astro-starter` and a journal at `/dashboard`. The app's journal is `/measurements`, and the roadmap's thirty slices already have closed GitHub issues whose titles, labels, and template fields do not all match that roadmap.

## Starting Point

`README.md` keeps a starter outline: tech stack, setup, scripts, Supabase, auth routes, deploy, smoke, CI, and license. Nine slice issues have no `slice` label (`#48`, `#49`, `#50`, `#56`, `#58`, `#64`, `#65`, `#68`, `#74`). `#2` already has `slice` and `north-star`. S-19's issue is `#64`, not the `#61` named in the roadmap handoff. `#85`'s Outcome mentions copying values from the previous entry; the S-26 outcome does not. `#99` carries a Notes section beyond the template fields.

## Desired End State

The same README headings describe this repository: clone `gmaszkiewicz/training-manager`, start the existing `supabase/` folder, and use `/measurements` and `/profile`. Each slice issue is titled `S-NN: <roadmap heading>`, labeled `slice`, still closed, and starts with the roadmap outcome, change id, slice id, PRD refs, prerequisites, and risk. Empty prerequisites say `none`. Notes and scope lists that sit outside those fields remain. `north-star` stays on `#2` only.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| README depth | Refresh the facts in every existing section | A clone should follow this repo, its scripts, and `/measurements`. |
| README structure | Keep the current headings | The change note requires the current structure. |
| Issue titles | `S-NN: <roadmap heading>` for all thirty | The issue list matches the roadmap index, including former test-rollout issues. |
| Issue bodies | Replace the six template fields and keep later sections | `#74` gains real prerequisites, and `#99` keeps its Notes. |
| Empty prerequisites | `none` | That is the issue rule's token; the roadmap's em dash means the same empty list. |
| north-star | Only `#2` (S-02) | The roadmap marks only that slice. |
| Issue state | Leave all thirty closed | Every slice is `done`. |
| License line | Stop claiming MIT | The repo has no `LICENSE` file and `package.json` has no license field. |

## Scope

**In scope:**

- Fact updates inside the current `README.md` headings.
- Titles, the `slice` label, and the six template fields on the thirty mapped issues.
- `north-star` confirmed on `#2` only.

**Out of scope:**

- Application code, tests, workflows, and `context/foundation/roadmap.md`.
- New issues, issue comments, and any reopen.
- `#101` and `#105`.
- Moving `#85`'s copy-values sentence into Notes. That sentence is inside Outcome, so it is removed.

## Architecture / Approach

Phase 1 edits `README.md` from `package.json`, `.github/workflows/ci.yml`, and the auth routes. Phase 2 runs `gh issue edit` on the mapped issues. The new body block is the roadmap fields; older Notes, Test plan, and In scope sections are appended after the risk. `gh issue edit` does not reopen a closed issue.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. README facts | Current facts under the same headings | A section still sends the reader to `/dashboard` or the starter repo. |
| 2. Slice issues | Thirty closed issues match the roadmap fields and titles | A preserved section is dropped, or `#85`'s extra outcome sentence is kept inside Outcome. |

**Prerequisites:** `gh` authenticated for `gmaszkiewicz/training-manager`. The roadmap file is the field source and is not edited.
**Estimated effort:** One session across two phases.

## Open Risks & Assumptions

- Replacing Risk on the test-rollout issues shortens those risks to the roadmap sentence. The `**Test plan:**` line stays.
- The README image line stays pointed at `./public/template.png`. This plan does not make a new screenshot.
- The License section will say the repository does not declare a license.

## Success Criteria (Summary)

- The README H1 is Training Manager, the starter clone URL and `/dashboard` are gone, and the current scripts, routes, and `migration-check` job are named.
- Every mapped issue is closed, titled `S-NN: <heading>`, labeled `slice`, and its six template fields match the roadmap, with `none` for an empty prerequisite list.
- `#99` still has `## Notes`, `#58` still has its scope lists, `#85` no longer says the trainee can copy values, and `#101` and `#105` are untouched.
