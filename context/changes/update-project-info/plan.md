# Update the README and sync slice issues Implementation Plan

## Overview

`README.md` still introduces this repository as the 10x Astro starter. The roadmap in `context/foundation/roadmap.md` is the source for S-01 through S-30, but several closed GitHub issues still use test-rollout titles, omit the `slice` label, or disagree with that slice on outcome, prerequisites, or risk. This plan refreshes the facts inside the current README headings, then updates those thirty issues in place.

## Current State Analysis

`README.md` is titled "10x Astro Starter" and tells a reader to clone `https://github.com/przeprogramowani/10x-astro-starter.git`. The auth table calls `/dashboard` the trainee journal. Sign-in and sign-up now redirect to `/measurements` (`src/pages/api/auth/signin.ts`, `src/pages/api/auth/signup.ts`). Protected routes are `/measurements` and `/profile` (`src/middleware.ts`). The script list omits `test`, `migration-check`, `deploy`, and `build:workers` even though those scripts exist in `package.json`. Getting Started still runs `npx supabase init`, while `supabase/` is already in the repo. The smoke section still says the script only guards the starter and is not a real test suite. CI documents `ci`, `smoke`, and `e2e`, and omits the `migration-check` job in `.github/workflows/ci.yml`. There is no `LICENSE` file and `package.json` has no `license` field, while the README still says MIT.

Every roadmap slice already has one closed issue in `gmaszkiewicz/training-manager`. The backlog handoff's `#61` for S-19 is not in the tracker; the issue whose Change ID is `e2e-setup` is `#64`. Nine issues have no `slice` label: `#48`, `#49`, `#50`, `#56`, `#58`, `#64`, `#65`, `#68`, and `#74`. `#2` already has `slice` and `north-star`. No other issue has `north-star`. The roadmap's North star section names only S-02.

Issue bodies use the same field names and then diverge. `#74` sets Prerequisites to `none` and uses the title as the outcome, while S-23 requires S-13 and S-22. `#49` is titled "Test rollout Phase 1: Delta after edit and delete" and sets Prerequisites to `none`, while S-14 requires S-04, S-05, and S-06. `#85`'s Outcome adds copying values from the previous entry, which the S-26 outcome does not say. `#99` keeps a `## Notes` section, a `**View:**` line, and a `**Token source:**` line after the risk.

## Desired End State

A reader of `README.md` can clone `gmaszkiewicz/training-manager`, install, start the existing Supabase folder, and open the journal at `/measurements` by following the current headings. The same headings are still there.

Each of S-01 through S-30 has its existing issue titled `S-NN: <roadmap heading>`, labeled `slice`, and still closed. The body starts with the roadmap outcome, change id, slice id, PRD refs, prerequisites, and risk. Prerequisites are `none` when the roadmap list is an em dash. `north-star` is on `#2` only. Notes, follow-ups, scope lists, and test-plan lines that sit outside those six fields are still there.

### Key Discoveries:

- Issue numbers are not slice numbers. S-14 is `#49`, S-15 is `#50`, S-16 is `#48`, and S-19 is `#64`.
- The issue rule in `.cursor/rules/github-issue-for-new-change.mdc` writes `**Prerequisites:**` as `none` when there are no prerequisites. The roadmap writes an em dash for that same case.
- `gh issue edit` can change a closed issue's title, body, and labels without a separate reopen.

## What We're NOT Doing

- No application code, tests, workflow files, or Supabase migrations.
- No edits to `context/foundation/roadmap.md`, including the backlog handoff and its stale `#61` link for S-19.
- No new README headings, and no new screenshot. The existing `./public/template.png` line stays.
- No new GitHub issues, no closing or reopening, and no comments on issues.
- No edits to `#101` (Change ID `defect-for-date-and-time`) or `#105` (this change).
- No `north-star` label on any issue except `#2`.
- No relocation of extra sentences that live inside Outcome or Risk. `#85`'s copy-values sentence is removed because it is inside Outcome. It is not copied into Notes.
- No leftover `**Roadmap:**` line once `**Slice:**` and `**PRD refs:**` carry those ids.

## Implementation Approach

Edit `README.md` in place from the repo as it is today: `package.json`, `.github/workflows/ci.yml`, `src/middleware.ts`, the auth redirects, and the existing `supabase/` tree. Leave a section's sentences alone when they already match.

Then edit the thirty mapped issues with `gh issue edit` against `gmaszkiewicz/training-manager`. Copy the six template fields from that slice's block in `context/foundation/roadmap.md`. Append the old body's other sections after the new risk line. Do not call `gh issue reopen` or `gh issue close`.

## Critical Implementation Details

Slice issue numbers do not follow the slice ids. S-16 is `#48`, S-14 is `#49`, S-15 is `#50`, and S-19 is `#64`. Do not create an issue to replace the missing `#61`.

`gh issue edit` is the only GitHub write. A follow-up reopen would undo the closed state that matches `Status: done` on every slice.

Outcome and Risk are replaced verbatim from the roadmap. A longer sentence inside those fields is deleted, not merged and not moved. `#85` is the case that loses the copy-values sentence.

## Phase 1: README facts

### Overview

Rewrite the facts under the current README headings so they describe Training Manager and this repository.

### Changes Required:

#### 1. README identity, setup, routes, scripts, and CI

**File**: `README.md`

**Intent**: A new clone follows this repo and the routes the app uses, while the existing heading outline stays.

**Contract**: The H1 becomes `# Training Manager`. Keep the image line under it. Replace the starter pitch with what this app does: a trainee records body measurements and sees the difference versus the previous entry, and a trainer can preview a linked trainee's list.

These headings stay, in this order:

- `## Tech Stack`
- `## Prerequisites`
- `## Getting Started`
- `## Available Scripts`
- `## Project Structure`
- `## Supabase Configuration`
- `### First-time setup (local, no cloud project needed)`
- `### Using a cloud Supabase project instead`
- `### Email confirmation in local development`
- `### Auth routes`
- `## Deployment`
- `## Smoke test`
- `## CI`
- `## License`

Tech Stack majors already match `package.json` (Astro 7, React 19, TypeScript 6, Tailwind 4). Prerequisites already match Node.js v24.22.0 and npm 11.19.1. Leave those bullets unless a reread shows a mismatch.

Getting Started clones `https://github.com/gmaszkiewicz/training-manager.git`. The `supabase init` step is removed. The first-time Supabase steps start the `supabase/` folder that is already in the repo (`npx supabase start` / `npx supabase stop`), still require Docker, and still copy the printed `SUPABASE_URL` and `SUPABASE_KEY` into `.env` and `.dev.vars`.

Available Scripts lists the contributor scripts in `package.json`: `dev`, `build`, `build:workers`, `preview`, `lint`, `lint:fix`, `check:home-tokens`, `format`, `smoke`, `migration-check`, `test`, `deploy`, and `db:types`. Omit the bare `astro` passthrough. One line each, from what that script runs.

The project-structure fence keeps its current entries and also names `src/lib`, `supabase`, `scripts`, and `.github/workflows`.

Auth routes: `/auth/signin`, `/auth/signup`, `/auth/confirm-email`, `/auth/reset-password`, `/measurements`, and `/profile`. `/measurements` and `/profile` redirect unauthenticated visits to `/auth/signin`. With email confirmation off, signup that returns a session opens `/measurements`. With it on, signup opens `/auth/confirm-email`, and the first sign-in after confirming opens `/measurements`. The same replacement applies to the local and cloud confirmation paragraphs. No `/dashboard` journal remains.

Deployment stays as written where it already matches `CLAUDE.md` and `npm run deploy` / `npm run build:workers`. Change a sentence only where it disagrees.

The smoke section drops the note that the script only guards the starter and is not a real test suite. It still tells the reader to run `npm run smoke` against a server, with `BASE_URL` defaulting to `http://localhost:4321`.

CI keeps the `ci`, `smoke`, and `e2e` bullets and adds `migration-check`: local Supabase, then `npm run migration-check`. The `ci` bullet continues to name lint, `check:home-tokens`, `astro check`, `npm test`, and build.

The License heading stays. The body does not claim MIT, because the repo has no `LICENSE` file and `package.json` has no license field. Say that this repository does not declare a license.

### Success Criteria:

#### Automated Verification:

- The H1 is `# Training Manager`, and the fourteen headings listed in the contract are present in that order.
- `README.md` contains none of `10x Astro Starter`, `10x-astro-starter`, or `/dashboard`.
- `README.md` contains `gmaszkiewicz/training-manager`, `/measurements`, `/profile`, `/auth/reset-password`, `npm run test`, and `npm run migration-check`.
- `npx prettier --check README.md` exits 0.

#### Manual Verification:

- Getting Started, the Supabase steps, Auth routes, Smoke test, and CI mention only commands and routes that exist in `package.json`, `.github/workflows/ci.yml`, `src/pages`, or `src/middleware.ts`.
- The License section does not claim MIT.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Slice issues

### Overview

Retitle, relabel, and refresh the template fields of the thirty existing slice issues so they match the roadmap, without reopening them or dropping the sections that sit outside those fields.

### Changes Required:

#### 1. Mapped issues in gmaszkiewicz/training-manager

**File**: GitHub issues listed below. Source of the six fields: the matching `### S-NN:` block in `context/foundation/roadmap.md`.

**Intent**: Someone scanning the tracker sees the roadmap heading, the `slice` label, and the roadmap's outcome, prerequisites, and risk on the issue that already belongs to that slice.

**Contract**: Edit only these issues. The title is exactly the Title cell.

| Slice | Issue | Title | Change ID |
| ----- | ----- | ----- | --------- |
| S-01 | #1 | S-01: Trainee registers | `trainee-signup` |
| S-02 | #2 | S-02: Trainee sees the delta versus the previous entry | `trainee-measurement-delta` |
| S-03 | #3 | S-03: Trainer registers | `trainer-signup` |
| S-04 | #4 | S-04: Trainer links a trainee and previews the list | `trainer-link-preview` |
| S-05 | #5 | S-05: Trainee edits an entry | `edit-measurement-entry` |
| S-06 | #6 | S-06: Trainee deletes an entry | `delete-measurement-entry` |
| S-07 | #23 | S-07: Public home replaces the starter welcome | `product-home` |
| S-08 | #27 | S-08: Auth entry screens leave the starter glass card | `auth-signin-form` |
| S-09 | #29 | S-09: Trainee journal leaves the starter glass card | `trainee-journal-ui` |
| S-10 | #32 | S-10: Trainer panel leaves the starter glass card | `trainer-panel-ui` |
| S-11 | #35 | S-11: Shared top bar on home, auth, and both dashboards | `shared-topbar` |
| S-12 | #38 | S-12: Measurements enter and display in a row | `horizontal-measurements` |
| S-13 | #41 | S-13: Measurement copy and the measurements route | `measurement-copy-polish` |
| S-14 | #49 | S-14: Delta after edit and delete | `testing-delta-after-edit-delete` |
| S-15 | #50 | S-15: Measurement access boundaries | `testing-measurement-access-boundaries` |
| S-16 | #48 | S-16: Reject illegal measurements | `testing-reject-illegal-measurements` |
| S-17 | #56 | S-17: Docs and the live worker describe one deploy path | `ci-cd-workflow-updates` |
| S-18 | #58 | S-18: Block merge when CI fails | `block-merge-on-failed-ci` |
| S-19 | #64 | S-19: End-to-end test configuration | `e2e-setup` |
| S-20 | #65 | S-20: Hosted migration preserves measurements | `testing-hosted-migration-preserves-measurements` |
| S-21 | #68 | S-21: Saved edit reaches the arrow | `testing-saved-edit-reaches-the-arrow` |
| S-22 | #71 | S-22: Measurement date and time | `measured-on-with-time` |
| S-23 | #74 | S-23: Pagination and filter measurements | `pagination-and-filter-measurements` |
| S-24 | #77 | S-24: Measurement list reads less of the journal | `query-optimization` |
| S-25 | #80 | S-25: Forgot password and password change on Profile | `handle-change-and-reset-pass` |
| S-26 | #85 | S-26: Preview the delta versus the previous entry from the new entry date | `preview-for-new-entry` |
| S-27 | #88 | S-27: Journal calendar and saved entry display | `calendar-upgrade-and-visual-fixes` |
| S-28 | #92 | S-28: Linked trainee list matches the month field | `visual-update-for-linked-trainee` |
| S-29 | #95 | S-29: Reactive trainee search | `reactive-trainee-search` |
| S-30 | #99 | S-30: Inline measurement errors and clearer button states | `some-display-changes` |

Add the `slice` label on every row. Add `north-star` on `#2` only. Do not remove `slice` from an issue that already has it.

The body starts with this block. Copy Outcome, PRD refs, and Risk verbatim from that slice. Copy Prerequisites the same way, except an em dash becomes `none`.

```markdown
## Outcome

<roadmap outcome>

**Change ID:** `<change-id>`

**Slice:** S-NN

**PRD refs:** <roadmap PRD refs>

**Prerequisites:** <roadmap list, or none>

**Risk:** <roadmap risk>
```

After that block, append the previous body with these lines removed: the old outcome section, and any line that is `**Change ID:**`, `**Slice:**`, `**PRD refs:**`, `**Prerequisites:**`, `**Risk:**`, or `**Roadmap:**`. Keep `## Notes`, `## Follow-up`, `## Context`, `**Test plan:**`, `**Plan:**`, `**Parallel with:**`, `**In scope:**`, `**Out of scope:**`, `**View:**`, `**Token source:**`, and trailing notes such as "Implemented on branch".

Known results of that rule:

- `#74` Prerequisites becomes `S-13, S-22`, and the outcome becomes the S-23 outcome, not the title text.
- `#49` Prerequisites becomes `S-04, S-05, S-06`. The `**Test plan:**` line stays. The Risk line becomes the S-14 risk.
- `#85` Outcome becomes: `user can see a preview of the difference versus the previous entry, chosen from the date typed for the new entry, while filling in that entry`. The copy-values sentence is not in the body afterward.
- `#99` still contains `## Notes` after the risk, including the footer note.

Every mapped issue stays `CLOSED`. `#101` and `#105` are not edited.

### Success Criteria:

#### Automated Verification:

- For every row in the map, `gh issue view <n> --repo gmaszkiewicz/training-manager --json title,state,labels,body` shows state `CLOSED`, the Title cell, a `slice` label, and Outcome, Change ID, Slice, PRD refs, Prerequisites, and Risk matching that slice in `context/foundation/roadmap.md`, with Prerequisites `none` when the roadmap value is an em dash.
- `#2` has the `north-star` label, and no other issue in the map has it.
- `#99` still contains `## Notes`. `#85`'s Outcome is the S-26 sentence above and does not contain `copy`. `#49` Prerequisites is `S-04, S-05, S-06`. `#74` Prerequisites is `S-13, S-22`.

#### Manual Verification:

- `#58` still has `**In scope:**` and `**Out of scope:**` after the Risk line.
- `#49` still has its `**Test plan:**` line, and its Risk line is the S-14 risk from the roadmap.
- `#101` is still titled "Current local minute is rejected as later than now" with no labels, and `#105` is still titled "Update the README and sync slice issues to the roadmap" with no labels.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. This change does not touch application code.

### Integration Tests:

- No new integration or browser tests. Phase 2's check is `gh issue view` against the issue map.

### Manual Testing Steps:

1. Read the README from the H1 through License and confirm a clone path, the journal route, and the CI jobs match the repo.
2. Open `#49`, `#74`, `#85`, `#99`, and `#58` and confirm the field block, the preserved sections, and the removed copy-values sentence.
3. Confirm `#101` and `#105` were not edited, and that no mapped issue reopened.

## Performance Considerations

README and issue text do not change runtime behavior.

## Migration Notes

The thirty slice issues are edited in place. None are opened, closed, or replaced. `#101` and `#105` stay as they are.

## References

- Change notes: `context/changes/update-project-info/change.md`
- Roadmap source: `context/foundation/roadmap.md`
- Issue shape: `.cursor/rules/github-issue-for-new-change.mdc`
- Current README: `README.md`
- Scripts: `package.json`
- CI jobs: `.github/workflows/ci.yml`
- Protected routes: `src/middleware.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: README facts

#### Automated

- [x] 1.1 The H1 is `# Training Manager`, and the fourteen headings listed in the contract are present in that order. — 83e1e01
- [x] 1.2 `README.md` contains none of `10x Astro Starter`, `10x-astro-starter`, or `/dashboard`. — 83e1e01
- [x] 1.3 `README.md` contains `gmaszkiewicz/training-manager`, `/measurements`, `/profile`, `/auth/reset-password`, `npm run test`, and `npm run migration-check`. — 83e1e01
- [x] 1.4 `npx prettier --check README.md` exits 0. — 83e1e01

#### Manual

- [x] 1.5 Getting Started, the Supabase steps, Auth routes, Smoke test, and CI mention only commands and routes that exist in `package.json`, `.github/workflows/ci.yml`, `src/pages`, or `src/middleware.ts`. — 83e1e01
- [x] 1.6 The License section does not claim MIT. — 83e1e01

### Phase 2: Slice issues

#### Automated

- [x] 2.1 For every row in the map, `gh issue view <n> --repo gmaszkiewicz/training-manager --json title,state,labels,body` shows state `CLOSED`, the Title cell, a `slice` label, and Outcome, Change ID, Slice, PRD refs, Prerequisites, and Risk matching that slice in `context/foundation/roadmap.md`, with Prerequisites `none` when the roadmap value is an em dash.
- [x] 2.2 `#2` has the `north-star` label, and no other issue in the map has it.
- [x] 2.3 `#99` still contains `## Notes`. `#85`'s Outcome is the S-26 sentence above and does not contain `copy`. `#49` Prerequisites is `S-04, S-05, S-06`. `#74` Prerequisites is `S-13, S-22`.

#### Manual

- [ ] 2.4 `#58` still has `**In scope:**` and `**Out of scope:**` after the Risk line.
- [ ] 2.5 `#49` still has its `**Test plan:**` line, and its Risk line is the S-14 risk from the roadmap.
- [ ] 2.6 `#101` is still titled "Current local minute is rejected as later than now" with no labels, and `#105` is still titled "Update the README and sync slice issues to the roadmap" with no labels.
