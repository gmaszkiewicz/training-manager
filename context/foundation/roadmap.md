---
project: Training Manager
version: 1
status: draft
created: 2026-09-26
updated: 2026-09-28
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: trainee-delta-trainer-preview
milestone_seq: 1
milestone_status: open
---

# Roadmap: Training Manager

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Trainee delta and trainer preview** — Status: open

- **Intent:** A trainee can record body measurements and see the up/down difference versus the previous entry, and a trainer who linked that trainee can preview the same list.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, US-01

## Vision recap

A trainee reporting body measurements today sends links and works in generic sheets, so weight and circumferences have to be compared by hand. The product is that up/down difference versus the previous entry — an arrow and the numeric difference next to each measurement — not another list of numbers. A trainer should preview a linked trainee's entries instead of chasing those links.

## North star

The north star — the smallest end-to-end slice that proves the product works, placed as early as its prerequisites allow — is **S-02: user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison.** It sits immediately after a trainee account exists, because that comparison is the product and the sequencing goal is speed.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                                                                                                      | Prerequisites | PRD refs                  | Status   |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------- | -------- |
| S-01 | trainee-signup             | user can register with email and password as a trainee and open an empty journal                                                                         | —             | FR-001                    | done     |
| S-02 | trainee-measurement-delta  | user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison | S-01          | US-01, FR-003, FR-006     | in-progress |
| S-03 | trainer-signup             | user can register with email and password and pick the trainer role                                                                                      | S-01          | FR-002                    | proposed |
| S-04 | trainer-link-preview       | user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry    | S-02, S-03    | FR-007, FR-008            | proposed |
| S-05 | edit-measurement-entry     | user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values            | S-02          | US-01, FR-004             | proposed |
| S-06 | delete-measurement-entry   | user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry                                      | S-02          | US-01, FR-005             | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                | Chain                                      | Note                                                                                                      |
| ------ | -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A      | Measurement journal  | `S-01` → `S-02` → `S-05` → `S-06`          | Speed puts the comparison (S-02) immediately after the trainee account. S-05 and S-06 can run side by side once S-02 is done. |
| B      | Trainer preview      | `S-03` → `S-04`                            | Joins Stream A at S-01 for the trainee account and at S-02 for the list being previewed.                 |

## Baseline

What's already in place in the codebase as of 2026-09-26 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — per tech-stack.md: Astro + React + TypeScript + Tailwind; scaffold is in the tree (`src/pages`, `src/components`)
- **Backend / API:** partial — per tech-stack.md: Astro SSR; auth routes exist (`src/pages/api/auth/`); no measurement API yet
- **Data:** partial — per tech-stack.md: Supabase Postgres; client is wired; no migrations in the repo
- **Auth:** partial — per tech-stack.md: Supabase email/password; session middleware is present (`src/middleware.ts`); sign-up does not pick trainee vs trainer
- **Deploy / infra:** present — per tech-stack.md: Cloudflare Workers + GitHub Actions as a quality gate (`.github/workflows/ci.yml`)
- **Observability:** absent — no logging library, error tracking, or metrics

## Foundations

No foundation items. The app shell, sign-in, and deployment are already in place (see Baseline). The trainee role, private measurement storage, and the trainer link are introduced in the first slice that uses each of them: S-01, S-02, and S-04.

## Slices

### S-01: Trainee registers

- **Outcome:** user can register with email and password as a trainee and open an empty journal
- **Change ID:** trainee-signup
- **PRD refs:** FR-001
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sign-up already accepts email and password; this slice records the trainee role so later slices can attach a journal to that account.
- **Status:** done

### S-02: Trainee sees the delta versus the previous entry

- **Outcome:** user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison
- **Change ID:** trainee-measurement-delta
- **PRD refs:** US-01, FR-003, FR-006
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the comparison the vision calls the product, placed immediately after a trainee account exists. The slice also stores entries so only that trainee can see them.
- **Status:** in-progress

### S-03: Trainer registers

- **Outcome:** user can register with email and password and pick the trainer role
- **Change ID:** trainer-signup
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Trainer registration extends the role added in S-01. It does not need measurement entries, so it can run beside S-02.
- **Status:** proposed

### S-04: Trainer links a trainee and previews the list

- **Outcome:** user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry
- **Change ID:** trainer-link-preview
- **PRD refs:** FR-007, FR-008
- **Prerequisites:** S-02, S-03
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Preview reads the list S-02 already shows, including notes, and stays read-only: the trainer cannot create, edit, or delete entries. Linking is by email with no accept step.
- **Status:** proposed

### S-05: Trainee edits an entry

- **Outcome:** user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values
- **Change ID:** edit-measurement-entry
- **PRD refs:** US-01, FR-004
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Editing changes the values the comparison uses, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** proposed

### S-06: Trainee deletes an entry

- **Outcome:** user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry
- **Change ID:** delete-measurement-entry
- **PRD refs:** US-01, FR-005
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** After a delete, the comparison uses the previous entry that is still there, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                 | Suggested issue title                                                          | Ready for `/10x-plan` | Notes                                      |
| ---------- | ------------------------- | ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------ |
| S-01       | trainee-signup            | Trainee can register and open an empty journal                                | yes                   | Run `/10x-plan trainee-signup`             |
| S-02       | trainee-measurement-delta | Trainee can log a measurement and see the delta versus the previous entry     | no                    | Prerequisites not done                     |
| S-03       | trainer-signup            | Trainer can register                                                           | no                    | Prerequisites not done. Can run beside S-02 |
| S-04       | trainer-link-preview      | Trainer can link a trainee by email and preview their measurements            | no                    | Prerequisites not done                     |
| S-05       | edit-measurement-entry    | Trainee can edit a measurement entry                                           | no                    | Prerequisites not done. Can run beside S-06 |
| S-06       | delete-measurement-entry  | Trainee can delete a measurement entry                                         | no                    | Prerequisites not done. Can run beside S-05 |

## Open Roadmap Questions

1. **What is the expected request volume (qps ballpark)?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; qps was not captured.
2. **What is the expected data volume?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; data_volume was not captured.

## Parked

- **Trainer replies to trainee notes** — Why parked: PRD §Non-Goals. Trainer preview is read-only on notes.
- **Personalized trainer questions on an entry** — Why parked: PRD §Non-Goals. Logging a measurement is not a trainer questionnaire.
- **Nutrition journal (module 2)** — Why parked: PRD §Non-Goals. This milestone is body measurements only.
- **Training-results journal (module 3)** — Why parked: PRD §Non-Goals. This milestone is body measurements only.
- **Mobile app** — Why parked: PRD §Non-Goals. Web only.
- **Good/bad coloring of deltas** — Why parked: PRD §Non-Goals. Arrow and numeric difference versus the previous entry only.
- **Date filter on the measurement list (FR-009)** — Why parked: PRD §Non-Goals. Nice-to-have, out of this milestone unless the required slices are already done.

## Milestone History

None yet.

## Done

- **S-01: user can register with email and password as a trainee and open an empty journal** — Archived 2026-09-27 → `context/archive/2026-09-26-trainee-signup/`. Lesson: —.
