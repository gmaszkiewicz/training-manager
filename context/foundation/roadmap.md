---
project: Training Manager
version: 1
status: draft
created: 2026-09-26
updated: 2026-10-10
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

- **Intent:** A trainee can record body measurements and see the up/down difference versus the previous entry, and a trainer who linked that trainee can preview the same list. A visitor opening the public home sees Training Manager and can go to sign-in or sign-up. Sign-in, registration, and email confirmation use that same visual contract instead of the starter glass card. The trainee journal on `/dashboard` uses that contract too, and the trainer panel on the same route uses the trainee journal's contract instead of the starter glass card. The same top bar appears on the public home, sign-in, sign-up, and both dashboards: a guest sees "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer sees "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email. A trainee enters the measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel. The comparison after an edit or a delete, measurement ownership, and refusal of a create dated after tomorrow are covered by the archived test rollout. A maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in. A measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied. One persisted weight edit changes the listed difference. A trainee records each measurement with a date and time; creation time stays separate and immutable; a second entry with the same date and time is refused. The measurement list shows one calendar month at a time, paged 5, 10, or 15, newest first, and a linked trainer sees that same page. The trainee and a linked trainer still see that same month page — the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page — while the list is built without walking the whole journal.
- **Source materials:** `context/foundation/prd.md` (v1); `context/foundation/test-plan.md` (phases 1–4); user description for the public home (MS-01); user description for the auth entry screens (MS-02); user description for the trainee journal UI (MS-03); user description for the trainer panel UI (MS-04); user description for the shared top bar (MS-05); user description for horizontal measurement entry and display (MS-06); user description for measurement copy and the `/measurements` route (MS-07); user description for blocking merge when CI fails (MS-11); user description for end-to-end test configuration (MS-12); test plan phase 4 for a migration that preserves existing measurement rows (MS-13); test plan phase 5 for one persisted weight edit that changes the listed difference (MS-14); user description for measurement date and time (MS-15); user description for measurement-list query optimization (MS-16)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, US-01, MS-01, MS-02, MS-03, MS-04, MS-05, MS-06, MS-07, MS-08, MS-09, MS-10, MS-11, MS-12, MS-13, MS-14, MS-15, MS-16
  - MS-01: Remove the starter welcome and replace the public home with Training Manager's own page. A reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off.
  - MS-02: Sign-in, registration, and email confirmation use the same visual contract as the public home, instead of the starter glass card.
  - MS-03: The trainee journal on `/dashboard` uses the same visual contract as the public home and auth entry screens, instead of the starter glass card.
  - MS-04: The trainer panel on `/dashboard` uses the same visual contract as the trainee journal, instead of the starter glass card.
  - MS-05: One top bar, the same as on the public home, on `/`, both dashboards, sign-in, and sign-up. A guest reads "Hello guest" with Home, Sign in, and Sign up. A signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out lives only in that bar. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email.
  - MS-06: The trainee enters measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel.
  - MS-07: The measurements screen and the redirects that open it use `/measurements`. The greeting has no role name. The trainer finds a trainee by email, and each field shows its unit beside the name with a clearer difference versus the previous entry.
  - MS-08: Prove the remaining chain, the oldest entry, and the trainer's copy of that chain.
  - MS-09: Prove ownership on read and write, and that an email link cannot open the wrong journal; confirm anonymous smoke still hits the current journal route.
  - MS-10: Prove an illegal entry is refused and not stored, on both entry paths.
  - MS-11: A pull request to `main` whose `ci` or `smoke` check fails cannot be merged, and a direct push to `main` is rejected. The repository is public so GitHub Free can enforce that rule. No second reviewer is required, and the branch does not have to contain the latest `main`.
  - MS-12: Add a change for end-to-end test configuration.
  - MS-13: Prove a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied.
  - MS-14: Prove one persisted weight edit changes the listed difference.
  - MS-15: A trainee records a measurement with date and time; `created_at` stays immutable as the entry creation time; a second measurement with the same date and time is refused.
  - MS-16: The trainee and a linked trainer still see the same calendar-month page — the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page — while the list is built without walking the whole journal.

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
| S-14 | testing-delta-after-edit-delete | user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison | S-04, S-05, S-06 | MS-08, US-01, FR-004, FR-005, FR-008 | done |
| S-15 | testing-measurement-access-boundaries | user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person | S-04 | MS-09, FR-007, FR-008 | done |
| S-16 | testing-reject-illegal-measurements | user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged | S-02 | MS-10, FR-003 | done |
| S-17 | ci-cd-workflow-updates | a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off | — | MS-01 | done |
| S-18 | block-merge-on-failed-ci | a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main` | — | MS-11 | done |
| S-19 | e2e-setup | a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in | — | MS-12 | done |
| S-20 | testing-hosted-migration-preserves-measurements | a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied | S-02, S-16 | MS-13 | done |
| S-21 | testing-saved-edit-reaches-the-arrow | a persisted weight edit changes the listed difference | S-05, S-14 | MS-14, US-01, FR-004 | done |
| S-22 | measured-on-with-time | user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused | S-02 | MS-15 | done |
| S-23 | pagination-and-filter-measurements | user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list | S-13, S-22 | FR-009 | done |
| S-24 | query-optimization | user can open the same calendar-month page as today, with the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, and a linked trainer sees that same page, while the list is built without walking the whole journal | S-23 | MS-16, FR-009 | planning |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                | Chain                                      | Note                                                                                                      |
| ------ | -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A      | Measurement journal  | `S-01` → `S-02` → `S-05` → `S-06` → `S-22` → `S-23` → `S-24` | Speed puts the comparison (S-02) immediately after the trainee account. S-05 and S-06 can run side by side once S-02 is done. S-22 adds date and time on the same journal after S-02. S-23 pages that journal one month at a time. S-24 keeps that page and builds it without walking the whole journal. |
| B      | Trainer preview      | `S-03` → `S-04`                            | Joins Stream A at S-01 for the trainee account and at S-02 for the list being previewed.                 |
| C      | Public home          | `S-07` → `S-17`                            | S-17 is the deploy-path task on the same anchor, MS-01. It does not change the public home. |
| D      | Auth entry screens   | `S-08`                                     | Stands alone: sign-in, registration, and email confirmation do not change measurement data, so this can run beside the remaining journal edits. |
| E      | Dashboard visual contract | `S-09` → `S-10` → `S-12` → `S-13`       | Restyles the measurements screen without changing measurement data. S-10 joins Stream B at S-04: the trainer panel uses the contract S-09 already applied to the trainee journal. S-12 turns the measurement fields on that journal and on the trainer list from a column into a horizontal row. S-13 polishes the copy and moves the screen to `/measurements`. Can run beside S-05 and S-06. |
| F      | Shared top bar            | `S-11`                                  | Joins streams C, D, and E: one bar on the public home, auth entry, and both dashboards. Does not change measurement data, so it can run beside S-05 and S-06. |
| G      | Measurement tests         | `S-14` → `S-15` → `S-16` → `S-20` → `S-21`; `S-19` | Rollout order from the test plan. S-20 is phase 4 on MS-13: a seeded measurement row survives the migration under test. S-21 is phase 5 on MS-14: one saved weight edit changes the listed difference. S-19 is the end-to-end test configuration on MS-12 and does not depend on this chain. |
| H      | Merge gate                | `S-18`                                     | On MS-11. Blocks merge to `main` when `ci` or `smoke` fails, and rejects a direct push. Parallel with S-17. Does not change the workflow file. |

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

### S-14: Delta after edit and delete

- **Outcome:** user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison
- **Change ID:** testing-delta-after-edit-delete
- **PRD refs:** MS-08, US-01, FR-004, FR-005, FR-008
- **Prerequisites:** S-04, S-05, S-06
- **Parallel with:** S-15, S-16
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The comparison is the product. This slice locks that chain after an edit or a delete, including the trainer's copy, and was archived with the phase-1 tests.
- **Status:** done

### S-15: Measurement access boundaries

- **Outcome:** user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person
- **Change ID:** testing-measurement-access-boundaries
- **PRD refs:** MS-09, FR-007, FR-008
- **Prerequisites:** S-04
- **Parallel with:** S-14, S-16
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Privacy of body measurements is the next risk in the test plan. This slice locks ownership and the email link, and was archived with the phase-2 smoke steps.
- **Status:** done

### S-16: Reject illegal measurements

- **Outcome:** user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged
- **Change ID:** testing-reject-illegal-measurements
- **PRD refs:** MS-10, FR-003
- **Prerequisites:** S-02
- **Parallel with:** S-14, S-15
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A future-dated create must not land on the list. This slice locks that refusal on an empty journal, and was archived with the phase-3 smoke steps. The edit path is outside what that phase shipped.
- **Status:** done

### S-17: Docs and the live worker describe one deploy path

- **Outcome:** a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off
- **Change ID:** ci-cd-workflow-updates
- **PRD refs:** MS-01
- **Prerequisites:** —
- **Parallel with:** S-18
- **Blockers:** —
- **Unknowns:**
  - Does the live worker build setting already match the migration-aware production build? — Owner: user. Block: no.
- **Risk:** The quality gate already matches. A broad edit could erase the manual deploy path, which does not apply hosted migrations.
- **Status:** done

### S-18: Block merge when CI fails

- **Outcome:** a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main`
- **Change ID:** block-merge-on-failed-ci
- **PRD refs:** MS-11
- **Prerequisites:** —
- **Parallel with:** S-17
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The repository is already public, so branch protection on GitHub Free can enforce the rule. A null pull-request requirement, or a required check name other than `ci` and `smoke`, would leave a direct push or a red check able to reach `main`. Fork pull requests from outside this repository do not receive Actions secrets, so their build check can fail. The workflow file stays as it is.
- **Status:** done

### S-19: End-to-end test configuration

- **Outcome:** a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in
- **Change ID:** e2e-setup
- **PRD refs:** MS-12
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The measurement risks already have cheaper checks. This slice only stands up the browser-level runner and one signed-out gate, so later tests do not retread those checks.
- **Status:** done

### S-20: Hosted migration preserves measurements

- **Outcome:** a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied
- **Change ID:** testing-hosted-migration-preserves-measurements
- **PRD refs:** MS-13
- **Prerequisites:** S-02, S-16
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A migration applies on a database that already has measurement rows and then changes their numbers, drops rows, or leaves them owned by the wrong trainee. A successful `db push` is not proof the rows survived.
- **Status:** done

### S-21: Saved edit reaches the arrow

- **Outcome:** a persisted weight edit changes the listed difference
- **Change ID:** testing-saved-edit-reaches-the-arrow
- **PRD refs:** MS-14, US-01, FR-004
- **Prerequisites:** S-05, S-14
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The comparison rule is already locked by S-14. This slice proves one saved weight edit changes the listed difference, so a unit that builds the edited row in memory does not count.
- **Status:** done

### S-22: Measurement date and time

- **Outcome:** user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused
- **Change ID:** measured-on-with-time
- **PRD refs:** MS-15
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Existing same-day rows and edits that rewrite `created_at` can collide with a unique date-and-time rule or blur creation time versus measurement time.
- **Status:** done

### S-23: Pagination and filter measurements

- **Outcome:** user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list
- **Change ID:** pagination-and-filter-measurements
- **PRD refs:** FR-009
- **Prerequisites:** S-13, S-22
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Paging or filtering the journal could hide entries, show another trainee's measurements, or change the difference versus the previous entry.
- **Status:** done

### S-24: Measurement list reads less of the journal

- **Outcome:** user can open the same calendar-month page as today, with the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, and a linked trainer sees that same page, while the list is built without walking the whole journal
- **Change ID:** query-optimization
- **PRD refs:** MS-16, FR-009
- **Prerequisites:** S-23
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A shorter read can drop a row from the month page, show another trainee's measurements, or change the difference when the previous entry sits outside the page.
- **Status:** planning

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
| S-14       | testing-delta-after-edit-delete | Prove the comparison chain after edit and delete, including the trainer preview | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-delta-after-edit-delete/` |
| S-15       | testing-measurement-access-boundaries | Prove ownership, the email link, and that a trainer cannot change entries | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-measurement-access-boundaries/` |
| S-16       | testing-reject-illegal-measurements | Prove a create dated after tomorrow is refused and stays off the empty journal | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-reject-illegal-measurements/` |
| S-17       | ci-cd-workflow-updates        | Align the written deploy path with the live worker                              | yes                   | On MS-01. Plan already exists in the change folder. Implementation can start. |
| S-18       | block-merge-on-failed-ci      | Block merge to main when ci or smoke fails                                      | yes                   | On MS-11. Plan in `context/changes/block-merge-on-failed-ci/`. Repository is already public. Phase 2 sets branch protection. |
| S-19       | e2e-setup                     | End-to-end test configuration                                                    | yes                   | [#61](https://github.com/gmaszkiewicz/training-manager/issues/61). On MS-12. Change folder exists. Run `/10x-plan e2e-setup`. |
| S-20       | testing-hosted-migration-preserves-measurements | Hosted migration preserves measurements                         | yes                   | [#65](https://github.com/gmaszkiewicz/training-manager/issues/65). On MS-13. Change folder exists. Run `/10x-plan testing-hosted-migration-preserves-measurements`. |
| S-21       | testing-saved-edit-reaches-the-arrow | Saved edit reaches the arrow                                              | yes                   | [#68](https://github.com/gmaszkiewicz/training-manager/issues/68). On MS-14. Change folder exists. Run `/10x-research testing-saved-edit-reaches-the-arrow`. |
| S-22       | measured-on-with-time             | Add time of day to measured_on                                             | yes                   | [#71](https://github.com/gmaszkiewicz/training-manager/issues/71). On MS-15. Change folder exists. Run `/10x-research measured-on-with-time`. |
| S-23       | pagination-and-filter-measurements | Pagination and filter measurements                                         | no                    | [#74](https://github.com/gmaszkiewicz/training-manager/issues/74). On FR-009. Archived 2026-10-09 → `context/archive/2026-10-08-pagination-and-filter-measurements/` |
| S-24       | query-optimization                      | Measurement list reads less of the journal                                 | yes                   | [#77](https://github.com/gmaszkiewicz/training-manager/issues/77). On MS-16. Change folder exists. Run `/10x-plan query-optimization`. |

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

- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — closed 2026-10-05. A trainee can record measurements and see the difference versus the previous entry, and a linked trainer can preview that list. The archived test rollout is recorded on this milestone as S-14, S-15, and S-16.
- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — reopened 2026-10-05. The deploy-path task is on MS-01, not a new milestone.

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
- **S-14: user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-delta-after-edit-delete/`. Lesson: —.
- **S-15: user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-measurement-access-boundaries/`. Lesson: —.
- **S-16: user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-reject-illegal-measurements/`. Lesson: —.
- **S-18: a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main`** — Archived 2026-10-05 → `context/archive/2026-10-05-block-merge-on-failed-ci/`. Lesson: —.
- **S-17: a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off** — Archived 2026-10-05 → `context/archive/2026-10-05-ci-cd-workflow-updates/`. Lesson: —.
- **S-19: a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in** — Archived 2026-10-06 → `context/archive/2026-10-05-e2e-setup/`. Lesson: —.
- **S-20: a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied** — Archived 2026-10-06 → `context/archive/2026-10-06-testing-hosted-migration-preserves-measurements/`. Lesson: —.
- **S-21: a persisted weight edit changes the listed difference** — Archived 2026-10-06 → `context/archive/2026-10-06-testing-saved-edit-reaches-the-arrow/`. Lesson: —.
- **S-22: user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused** — Archived 2026-10-08 → `context/archive/2026-10-06-measured-on-with-time/`. Lesson: —.
- **S-23: user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list** — Archived 2026-10-09 → `context/archive/2026-10-08-pagination-and-filter-measurements/`. Lesson: —.
