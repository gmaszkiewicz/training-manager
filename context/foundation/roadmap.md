---
project: Training Manager
version: 1
status: draft
created: 2026-10-05
updated: 2026-10-05
prd_version: "—"
main_goal: low-complexity
top_blocker: none
milestone_id: aligned-deploy-path
milestone_seq: 2
milestone_status: open
---

# Roadmap: Training Manager

> Derived from `context/changes/ci-cd-workflow-updates/` (plan and plan brief) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-2: Aligned deploy path** — Status: open

- **Intent:** A reader of the project docs follows one deploy path, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off.
- **Source materials:** `context/changes/ci-cd-workflow-updates/plan.md`; `context/changes/ci-cd-workflow-updates/plan-brief.md`
- **Done when:** every S-NN below is `done`.
- **Scope anchors:**
  - MS-01: The deployment section of the project guide, the agent guide, the infrastructure operational steps, and the finished deployment plan describe one pipeline: the current quality gate, a production build that applies hosted migrations, the deploy of that build, and non-production builds off.
  - MS-02: The live worker's build settings match that pipeline, the build secret for the hosted database is set, and the branch variable that decides whether migrations run is left at the host default.

## Vision recap

A trainee reporting body measurements today sends links and works in generic sheets, so weight and circumferences have to be compared by hand. The product is that up/down difference versus the previous entry — an arrow and the numeric difference next to each measurement — not another list of numbers. A trainer should preview a linked trainee's entries instead of chasing those links. That product outcome shipped in M-1. This milestone only makes the written deploy path and the live worker settings say the same thing.

## North star

The north star — the smallest end-to-end slice that proves this milestone's outcome, placed as early as its prerequisites allow because nothing else in this milestone matters until this lands — is **S-01: a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off.** It is the only outcome the source declares, and the sequencing goal is to keep the change small.

## At a glance

| ID   | Change ID              | Outcome (user can …)                                                                                                                                                                                                 | Prerequisites | PRD refs    | Status |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | ------ |
| S-01 | ci-cd-workflow-updates | a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off | —             | MS-01, MS-02 | ready  |

## Baseline

What's already in place in the codebase as of 2026-10-05 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro with React islands, file-based pages, and shared UI components (`package.json`, `src/pages`)
- **Backend / API:** partial — server-rendered routes for sign-in and for creating, editing, and deleting measurements, plus trainer links; the measurement list is rendered on the page, not as a separate list request (`src/pages/api/`, `src/pages/measurements.astro`)
- **Data:** present — hosted Postgres with measurement tables and row-level policies (`supabase/migrations/`)
- **Auth:** present — email and password sessions, trainee or trainer chosen at sign-up, and the measurements page refused to signed-out visitors (`src/lib/supabase.ts`, `src/middleware.ts`)
- **Deploy / infra:** present — a quality gate on pull request and on push to the production branch (lint, token check, type check, tests, build, and a local-database smoke); hosted deploy of that branch is already wired and is separate from the quality gate (`.github/workflows/ci.yml`)
- **Observability:** absent — no logging library, error tracking, or metrics

## Foundations

No foundation items. The app, accounts, measurement journal, quality gate, and hosted deploy are already in place (see Baseline). This milestone corrects the written path and the live settings. It does not scaffold a layer.

## Slices

### S-01: Docs and the live worker describe one deploy path

- **Outcome:** a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off
- **Change ID:** ci-cd-workflow-updates
- **PRD refs:** MS-01, MS-02
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Does the live worker build setting already match the migration-aware production build? — Owner: user. Block: no.
- **Risk:** This is the only slice, so it is first. A broad edit could erase the manual deploy path, which does not apply hosted migrations.
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID              | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                                                 |
| ---------- | ---------------------- | ---------------------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| S-01       | ci-cd-workflow-updates | Align the written deploy path with the live worker        | yes                   | Plan already exists in the change folder. Implementation can start. |

## Open Roadmap Questions

1. **What is the expected request volume (qps ballpark)?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; qps was not captured.
2. **What is the expected data volume?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; data_volume was not captured.

## Parked

- **Trainer replies to trainee notes** — Why parked: PRD §Non-Goals. Trainer preview is read-only on notes.
- **Personalized trainer questions on an entry** — Why parked: PRD §Non-Goals. Logging a measurement is not a trainer questionnaire.
- **Nutrition journal (module 2)** — Why parked: PRD §Non-Goals. Body measurements only.
- **Training-results journal (module 3)** — Why parked: PRD §Non-Goals. Body measurements only.
- **Mobile app** — Why parked: PRD §Non-Goals. Web only.
- **Good/bad coloring of deltas** — Why parked: PRD §Non-Goals. Arrow and numeric difference versus the previous entry only.
- **Date filter on the measurement list (FR-009)** — Why parked: PRD §Non-Goals. Nice-to-have, and this milestone's source does not include it.
- **Changing the quality-gate workflow, turning preview builds on, or adding a deploy job to that gate** — Why parked: the source keeps the current gate and keeps preview builds off.
- **Pushing the production branch or applying migrations from this workspace** — Why parked: the source leaves the next production build to apply any pending hosted migrations.

## Milestone History

- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — closed 2026-10-05. A trainee can record measurements and see the difference versus the previous entry, and a linked trainer can preview that list. The archived test rollout is recorded on this milestone as S-14, S-15, and S-16.

## Done

No items archived in this milestone yet.
