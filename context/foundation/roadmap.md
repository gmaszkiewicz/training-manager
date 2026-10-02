---
project: Training Manager
version: 1
status: draft
created: 2026-09-26
updated: 2026-10-02
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

- **Intent:** A trainee can record body measurements and see the up/down difference versus the previous entry, and a trainer who linked that trainee can preview the same list. A visitor opening the public home sees Training Manager and can go to sign-in or sign-up. Sign-in, registration, and email confirmation use that same visual contract instead of the starter glass card. The trainee journal on `/dashboard` uses that contract too, and the trainer panel on the same route uses the trainee journal's contract instead of the starter glass card. The same top bar appears on the public home, sign-in, sign-up, and both dashboards: a guest sees "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer sees "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email. A trainee enters the measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel.
- **Source materials:** `context/foundation/prd.md` (v1); user description for the public home (MS-01); user description for the auth entry screens (MS-02); user description for the trainee journal UI (MS-03); user description for the trainer panel UI (MS-04); user description for the shared top bar (MS-05); user description for horizontal measurement entry and display (MS-06); user description for measurement copy and the `/measurements` route (MS-07)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, US-01, MS-01, MS-02, MS-03, MS-04, MS-05, MS-06, MS-07
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

The north star — the smallest end-to-end slice that proves the product works, placed as early as its prerequisites allow — is **S-02: user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison.** It sits immediately after a trainee account exists, because that comparison is the product and the sequencing goal is speed.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                                                                                                                      | Prerequisites | PRD refs                  | Status   |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------- | -------- |
| S-01 | trainee-signup             | user can register with email and password as a trainee and open an empty journal                                                                         | —             | FR-001                    | done     |
| S-02 | trainee-measurement-delta  | user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison | S-01          | US-01, FR-003, FR-006     | done     |
| S-03 | trainer-signup             | user can register with email and password and pick the trainer role                                                                                      | S-01          | FR-002                    | done     |
| S-04 | trainer-link-preview       | user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry    | S-02, S-03    | FR-007, FR-008            | done        |
| S-05 | edit-measurement-entry     | user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values            | S-02          | US-01, FR-004             | done |
| S-06 | delete-measurement-entry   | user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry                                      | S-02          | US-01, FR-005             | done |
| S-07 | product-home               | user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome                    | —             | MS-01                     | done        |
| S-08 | auth-signin-form           | user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card          | —             | MS-02                     | done |
| S-09 | trainee-journal-ui         | user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard` | S-02, S-08    | MS-03                     | done |
| S-10 | trainer-panel-ui           | user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`                       | S-04, S-09    | MS-04                     | done |
| S-11 | shared-topbar              | user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email | S-07, S-08, S-09, S-10 | MS-05          | done |
| S-12 | horizontal-measurements    | user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel | S-09, S-10    | MS-06                     | done |
| S-13 | measurement-copy-polish    | user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry | S-11, S-12    | MS-07                     | done |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                | Chain                                      | Note                                                                                                      |
| ------ | -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A      | Measurement journal  | `S-01` → `S-02` → `S-05` → `S-06`          | Speed puts the comparison (S-02) immediately after the trainee account. S-05 and S-06 can run side by side once S-02 is done. |
| B      | Trainer preview      | `S-03` → `S-04`                            | Joins Stream A at S-01 for the trainee account and at S-02 for the list being previewed.                 |
| C      | Public home          | `S-07`                                     | Stands alone: the public page does not read or change measurement data, so it can run beside the remaining journal edits. |
| D      | Auth entry screens   | `S-08`                                     | Stands alone: sign-in, registration, and email confirmation do not change measurement data, so this can run beside the remaining journal edits. |
| E      | Dashboard visual contract | `S-09` → `S-10` → `S-12` → `S-13`       | Restyles the measurements screen without changing measurement data. S-10 joins Stream B at S-04: the trainer panel uses the contract S-09 already applied to the trainee journal. S-12 turns the measurement fields on that journal and on the trainer list from a column into a horizontal row. S-13 polishes the copy and moves the screen to `/measurements`. Can run beside S-05 and S-06. |
| F      | Shared top bar            | `S-11`                                  | Joins streams C, D, and E: one bar on the public home, auth entry, and both dashboards. Does not change measurement data, so it can run beside S-05 and S-06. |

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

## Backlog Handoff

| Roadmap ID | Change ID                 | Suggested issue title                                                          | Ready for `/10x-plan` | Notes                                      |
| ---------- | ------------------------- | ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------ |
| S-01       | trainee-signup            | Trainee can register and open an empty journal                                | yes                   | Run `/10x-plan trainee-signup`             |
| S-02       | trainee-measurement-delta | Trainee can log a measurement and see the delta versus the previous entry     | no                    | Prerequisites not done                     |
| S-03       | trainer-signup            | Trainer can register                                                           | no                    | Prerequisites not done. Can run beside S-02 |
| S-04       | trainer-link-preview      | Trainer can link a trainee by email and preview their measurements            | no                    | Prerequisites not done                     |
| S-05       | edit-measurement-entry    | Trainee can edit a measurement entry                                           | no                    | Prerequisites not done. Can run beside S-06 |
| S-06       | delete-measurement-entry  | Trainee can delete a measurement entry                                         | no                    | Prerequisites not done. Can run beside S-05 |
| S-07       | product-home              | Visitor sees Training Manager on the public home instead of the starter welcome | yes                   | Run `/10x-plan product-home`. Can run beside S-05 and S-06 |
| S-08       | auth-signin-form          | Sign-in, registration, and email confirmation leave the starter glass card      | yes                   | Run `/10x-plan auth-signin-form`. Can run beside S-05 and S-06 |
| S-09       | trainee-journal-ui        | Trainee journal on `/dashboard` leaves the starter glass card                     | yes                   | Research in `context/changes/trainee-journal-ui/`. Run `/10x-plan trainee-journal-ui`. Can run beside S-05 and S-06 |
| S-10       | trainer-panel-ui          | Trainer panel on `/dashboard` leaves the starter glass card                       | yes                   | Run `/10x-plan trainer-panel-ui`. Can run beside S-05 and S-06 |
| S-11       | shared-topbar             | Shared top bar on the public home, sign-in, sign-up, and both dashboards         | yes                   | Run `/10x-new shared-topbar`. Can run beside S-05 and S-06 |
| S-12       | horizontal-measurements   | Trainee enters measurements in a row; trainee and trainer read each entry in a row; linked trainees sit in a row | yes                 | Change folder exists. Plan in `context/changes/horizontal-measurements/`. Can run beside S-05 and S-06 |
| S-13       | measurement-copy-polish   | Measurements screen, greeting, and field units                                  | no                    | [#41](https://github.com/gmaszkiewicz/training-manager/issues/41). Change folder exists. Work is on `cursor/measurement-copy-polish`. Can run beside S-05 and S-06 |

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
