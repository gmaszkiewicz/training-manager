---
project: Training Manager
version: 1
status: draft
created: 2026-10-05
updated: 2026-10-05
prd_version: 1
main_goal: low-complexity
top_blocker: none
milestone_id: measurement-date-filter
milestone_seq: 2
milestone_status: open
---

# Roadmap: Training Manager

> Derived from `context/foundation/prd.md` (v1), next tranche after M-1, + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-2: Measurement list by date** — Status: open

- **Intent:** A trainee can narrow the measurement list by date. The comparison list, trainer preview, and the screens around them were delivered in M-1 and stay done. This milestone keeps that filter as one slice.
- **Source materials:** `context/foundation/prd.md` (v1), next tranche after M-1
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-009 is the new work. Carried from M-1 and already done: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, US-01, MS-01, MS-02, MS-03, MS-04, MS-05, MS-06, MS-07
  - MS-01: Remove the starter welcome and replace the public home with Training Manager's own page.
  - MS-02: Sign-in, registration, and email confirmation use the same visual contract as the public home, instead of the starter glass card.
  - MS-03: The trainee journal on `/dashboard` uses the same visual contract as the public home and auth entry screens, instead of the starter glass card.
  - MS-04: The trainer panel on `/dashboard` uses the same visual contract as the trainee journal, instead of the starter glass card.
  - MS-05: One top bar, the same as on the public home, on `/`, both dashboards, sign-in, and sign-up. A guest reads "Hello guest" with Home, Sign in, and Sign up. A signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out lives only in that bar. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email.
  - MS-06: The trainee enters measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel.
  - MS-07: The measurements screen and the redirects that open it use `/measurements`. The greeting has no role name. The trainer finds a trainee by email, and each field shows its unit beside the name with a clearer difference versus the previous entry.

## Vision recap

A trainee reporting body measurements today sends links and works in generic sheets, so weight and circumferences have to be compared by hand. The product is that up/down difference versus the previous entry — an arrow and the numeric difference next to each measurement — not another list of numbers. A trainer should preview a linked trainee's entries instead of chasing those links.

## North star

The north star — the smallest end-to-end slice that proves the product works, placed as early as its prerequisites allow — is **S-14: user can narrow the measurement list by date.** It is the only requirement M-1 did not deliver, and the sequencing goal is to keep that remaining work as one slice.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                                                                                                      | Prerequisites | PRD refs                  | Status |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------- | ------ |
| S-01 | trainee-signup             | user can register with email and password as a trainee and open an empty journal                                                                         | —             | FR-001                    | done   |
| S-02 | trainee-measurement-delta  | user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison | S-01          | US-01, FR-003, FR-006     | done   |
| S-03 | trainer-signup             | user can register with email and password and pick the trainer role                                                                                      | S-01          | FR-002                    | done   |
| S-04 | trainer-link-preview       | user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry    | S-02, S-03    | FR-007, FR-008            | done   |
| S-05 | edit-measurement-entry     | user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values            | S-02          | US-01, FR-004             | done   |
| S-06 | delete-measurement-entry   | user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry                                      | S-02          | US-01, FR-005             | done   |
| S-07 | product-home               | user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome                    | —             | MS-01                     | done   |
| S-08 | auth-signin-form           | user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card          | —             | MS-02                     | done   |
| S-09 | trainee-journal-ui         | user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard` | S-02, S-08    | MS-03                     | done   |
| S-10 | trainer-panel-ui           | user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard` | S-04, S-09    | MS-04                     | done   |
| S-11 | shared-topbar              | user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email | S-07, S-08, S-09, S-10 | MS-05 | done   |
| S-12 | horizontal-measurements    | user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel | S-09, S-10    | MS-06                     | done   |
| S-13 | measurement-copy-polish    | user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry | S-11, S-12    | MS-07                     | done   |
| S-14 | measurement-date-filter    | user can narrow the measurement list by date                                                                                                              | S-02          | FR-009                    | ready  |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme              | Chain                                      | Note                                                                                                      |
| ------ | ------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A      | Measurement journal | `S-01` → `S-02` → `S-05` → `S-06` → `S-14` | The date filter is the only new slice, and it sits on the list that already exists.                      |
| B      | Trainer preview    | `S-03` → `S-04`                            | Joins Stream A at S-01 for the trainee account and at S-02 for the list being previewed.                 |
| C      | Public home        | `S-07`                                     | Stands alone. Delivered in M-1.                                                                           |
| D      | Auth entry screens | `S-08`                                     | Stands alone. Delivered in M-1.                                                                           |
| E      | Dashboard screens  | `S-09` → `S-10` → `S-11` → `S-12` → `S-13` | Joins the public home and the auth screens at S-11: one bar on those screens and both dashboards. Delivered in M-1. |

## Baseline

What's already in place in the codebase as of 2026-10-05 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — per tech-stack.md; pages and components are in the tree (`src/pages`, `src/components`)
- **Backend / API:** present — per tech-stack.md; measurement create, update, and delete routes exist (`src/pages/api/measurements/`)
- **Data:** present — per tech-stack.md; profile and measurement migrations are in the repo (`supabase/migrations/`)
- **Auth:** present — per tech-stack.md; session check and protected routes are in `src/middleware.ts`, and sign-up records trainee or trainer
- **Deploy / infra:** present — per tech-stack.md; the quality-gate workflow is `.github/workflows/ci.yml`
- **Observability:** absent — no logging library, error tracking, or metrics

## Foundations

No foundation items. Accounts, measurement storage, trainer preview, and deployment are already in place (see Baseline). The date filter is introduced in S-14, the slice that uses it.

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
- **Status:** done

### S-03: Trainer registers

- **Outcome:** user can register with email and password and pick the trainer role
- **Change ID:** trainer-signup
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Trainer registration extends the role added in S-01. It does not need measurement entries, so it can run beside S-02.
- **Status:** done

### S-04: Trainer links a trainee and previews the list

- **Outcome:** user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry
- **Change ID:** trainer-link-preview
- **PRD refs:** FR-007, FR-008
- **Prerequisites:** S-02, S-03
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Preview reads the list S-02 already shows, including notes, and stays read-only: the trainer cannot create, edit, or delete entries. Linking is by email with no accept step.
- **Status:** done

### S-05: Trainee edits an entry

- **Outcome:** user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values
- **Change ID:** edit-measurement-entry
- **PRD refs:** US-01, FR-004
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Editing changes the values the comparison uses, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** done

### S-06: Trainee deletes an entry

- **Outcome:** user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry
- **Change ID:** delete-measurement-entry
- **PRD refs:** US-01, FR-005
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-05, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** After a delete, the comparison uses the previous entry that is still there, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** done

### S-07: Public home replaces the starter welcome

- **Outcome:** user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome
- **Change ID:** product-home
- **PRD refs:** MS-01
- **Prerequisites:** —
- **Parallel with:** S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The public home still describes the starter, so a visitor cannot tell this is Training Manager until they sign in. It does not change measurement data, so it can run beside the remaining journal edits.
- **Status:** done

### S-08: Auth entry screens leave the starter glass card

- **Outcome:** user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card
- **Change ID:** auth-signin-form
- **PRD refs:** MS-02
- **Prerequisites:** —
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The three screens still use the starter glass card, so a visitor who leaves the public home hits a different visual. Field styles are shared with the journal form; this slice must keep that form readable and must not restyle the dashboard shell. It does not change measurement data, so it can run beside the remaining journal edits.
- **Status:** done

### S-09: Trainee journal leaves the starter glass card

- **Outcome:** user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard`
- **Change ID:** trainee-journal-ui
- **PRD refs:** MS-03
- **Prerequisites:** S-02, S-08
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** `/dashboard` still wraps the trainee journal in `bg-cosmic` and glass utilities, so a trainee who signs in hits a different visual than on `/` or `/auth/signin`. The measurement form already reads role tokens; the shell, list rows, empty and error copy, and Sign out still use starter literals. The trainer branch on the same route stays on the old shell until S-10. It does not change measurement data, so it can run beside S-05 and S-06.
- **Status:** done

### S-10: Trainer panel leaves the starter glass card

- **Outcome:** user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`
- **Change ID:** trainer-panel-ui
- **PRD refs:** MS-04
- **Prerequisites:** S-04, S-09
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A trainer who signs in still sees the starter glass card on `/dashboard`, while the trainee on the same route already uses the shared visual contract. Preview stays read-only and does not change measurement data, so this can run beside S-05 and S-06.
- **Status:** done

### S-11: Shared top bar on home, auth, and both dashboards

- **Outcome:** user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email
- **Change ID:** shared-topbar
- **PRD refs:** MS-05
- **Prerequisites:** S-07, S-08, S-09, S-10
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The home bar exists only on `/`. Sign-in, sign-up, and both dashboards omit it, and Sign out still sits under the measurement card on the journal and the trainer panel. The bar does not change measurement data, so this can run beside S-05 and S-06.
- **Status:** done

### S-12: Measurements enter and display in a row

- **Outcome:** user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel
- **Change ID:** horizontal-measurements
- **PRD refs:** MS-06
- **Prerequisites:** S-09, S-10
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The trainee form and the shared measurement list stack each field in a column, and the trainer's linked-trainee list stacks each email under the previous one, so both stay vertical until this slice. A horizontal row must stay readable on a narrow screen and must not change stored values, the delta, or who is linked. It can run beside S-05 and S-06.
- **Status:** done

### S-13: Measurement copy and the measurements route

- **Outcome:** user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry
- **Change ID:** measurement-copy-polish
- **PRD refs:** MS-07
- **Prerequisites:** S-11, S-12
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** `/dashboard` no longer opens the screen, so an old address 404s. Copy and the route change do not change stored measurements, who is linked, or how the difference is calculated. It can run beside S-05 and S-06.
- **Status:** done

### S-14: Trainee narrows the list by date

- **Outcome:** user can narrow the measurement list by date
- **Change ID:** measurement-date-filter
- **PRD refs:** FR-009
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Does "by date" mean one calendar day or a from-to range? — Owner: user. Block: no.
- **Risk:** The list and its comparison already exist, so this slice only narrows what is shown. Reading "by date" as more than one control would grow the slice; it stays one filter on the trainee list.
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID                 | Suggested issue title                                                          | Ready for `/10x-plan` | Notes                                      |
| ---------- | ------------------------- | ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------ |
| S-01       | trainee-signup            | Trainee can register and open an empty journal                                | no                    | Delivered in M-1                           |
| S-02       | trainee-measurement-delta | Trainee can log a measurement and see the delta versus the previous entry     | no                    | Delivered in M-1                           |
| S-03       | trainer-signup            | Trainer can register                                                           | no                    | Delivered in M-1                           |
| S-04       | trainer-link-preview      | Trainer can link a trainee by email and preview their measurements            | no                    | Delivered in M-1                           |
| S-05       | edit-measurement-entry    | Trainee can edit a measurement entry                                           | no                    | Delivered in M-1                           |
| S-06       | delete-measurement-entry  | Trainee can delete a measurement entry                                         | no                    | Delivered in M-1                           |
| S-07       | product-home              | Visitor sees Training Manager on the public home instead of the starter welcome | no                   | Delivered in M-1                           |
| S-08       | auth-signin-form          | Sign-in, registration, and email confirmation leave the starter glass card    | no                    | Delivered in M-1                           |
| S-09       | trainee-journal-ui        | Trainee journal leaves the starter glass card                                 | no                    | Delivered in M-1                           |
| S-10       | trainer-panel-ui          | Trainer panel leaves the starter glass card                                   | no                    | Delivered in M-1                           |
| S-11       | shared-topbar             | Shared top bar on the public home, sign-in, sign-up, and both dashboards      | no                    | Delivered in M-1                           |
| S-12       | horizontal-measurements   | Measurements enter and display in a row                                       | no                    | Delivered in M-1                           |
| S-13       | measurement-copy-polish   | Measurements screen, greeting, and field units                                | no                    | Delivered in M-1                           |
| S-14       | measurement-date-filter   | Trainee can narrow the measurement list by date                               | yes                   | Run `/10x-plan measurement-date-filter`    |

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

## Milestone History

- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — closed 2026-10-05. A trainee can record measurements and see the difference versus the previous entry, and a linked trainer can preview that list on the product's own screens.

## Done

- **S-01: user can register with email and password as a trainee and open an empty journal** — Archived 2026-09-27 → `context/archive/2026-09-26-trainee-signup/`. Lesson: —.
- **S-02: user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison** — Archived 2026-09-28 → `context/archive/2026-09-27-trainee-measurement-delta/`. Lesson: —.
- **S-03: user can register with email and password and pick the trainer role** — Archived 2026-09-28 → `context/archive/2026-09-28-trainer-signup/`. Lesson: —.
- **S-04: user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry** — Archived 2026-09-29 → `context/archive/2026-09-28-trainer-link-preview/`. Lesson: —.
- **S-07: user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome** — Archived 2026-09-29 → `context/archive/2026-09-29-product-home/`. Lesson: —.
- **S-08: user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card** — Archived 2026-09-29 → `context/archive/2026-09-29-auth-signin-form/`. Lesson: —.
- **S-09: user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard`** — Archived 2026-09-30 → `context/archive/2026-09-29-trainee-journal-ui/`. Lesson: —.
- **S-10: user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`** — Archived 2026-09-30 → `context/archive/2026-09-30-trainer-panel-ui/`. Lesson: —.
- **S-11: user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email** — Archived 2026-09-30 → `context/archive/2026-09-30-shared-topbar/`. Lesson: —.
- **S-12: user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel** — Archived 2026-09-30 → `context/archive/2026-09-30-horizontal-measurements/`. Lesson: —.
- **S-13: user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry** — Archived 2026-10-01 → `context/archive/2026-09-30-measurement-copy-polish/`. Lesson: —.
- **S-05: user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values** — Archived 2026-10-02 → `context/archive/2026-10-02-edit-measurement-entry/`. Lesson: —.
- **S-06: user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry** — Archived 2026-10-02 → `context/archive/2026-10-02-delete-measurement-entry/`. Lesson: —.
