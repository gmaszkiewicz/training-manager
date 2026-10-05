# Test Plan Refresh — Plan Brief

> Full plan: `context/changes/test-plan-refresh/plan.md`
> Research: `context/changes/test-plan-refresh/research.md`

## What & Why

The test guide still says the manifest has no Playwright, and it has no risk for a migration that corrupts measurement rows after they exist. The 2026-10-05 interview named that migration gap, and a saved weight whose arrow still uses the pre-edit number. This change rewrites the guide so the next rollout can protect those two failures.

## Starting Point

Phases 1–3 are complete: the comparison-rule unit, the access smoke, and one future-date create. The seven migration files contain no row `UPDATE` or `DELETE FROM`. Smoke shows `↓ 1.5` after two creates. `@playwright/test` `^1.63.0` is installed, and CI runs `ci` and `smoke`.

## Desired End State

The guide lists risk #6 and leaves rollout phases 4 and 5 not started. Phase 4's proof is a known measurement row inserted before the migration under test, then selected for its numbers, count, and owner. Phase 5's proof is one smoke edit of a saved weight, beside the existing unit. Playwright is recorded as the local runner for the signed-out seed. Kitchen-sink screens and visual restyles stay out of the test budget.

## Key Decisions Made

| Decision               | Choice                                                                                 | Why (1 sentence)                                                   | Source       |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------ |
| What this change ships | The guide only                                                                         | The new checks are later rollout phases left `not started`         | Plan         |
| Risk numbers           | Keep #1–#5 and append #6                                                               | Later sections already cite those numbers                          | Change notes |
| Risk #6 proof          | Insert a known row, apply the migration under test, select numbers, count, and owner   | An empty apply and a `db push` exit code do not read existing rows | Research     |
| Risk #1 adjustment     | Keep the comparison-rule unit and add one smoke edit                                   | The unit builds the edited weight in memory                        | Research     |
| Playwright             | Record 1.63.0 for the S-19 seed, no CI job                                             | The runner exists and the workflow does not run it                 | Research     |
| Exclusions             | Kitchen-sink screens, visual restyles, and no browser suite beyond the signed-out seed | Interview Q5, with the seed already owned by S-19                  | Change notes |
| Interview              | Zero further questions                                                                 | The brief and the research already fixed the wording               | Plan         |

## Scope

**In scope:**

- Sections 1–8 of `context/foundation/test-plan.md`
- Hot-spot counts from the 2026-10-05 scan (51 commits / 30 days across `src`, `scripts`, `supabase`)
- TBD cookbook pointers for phases 4 and 5

**Out of scope:**

- The migration check, the smoke edit, and any new Vitest file
- A SQL client name, a Playwright CI job, and a second signed-out phase
- Renumbering risks or reopening phases 1–3

## Architecture / Approach

One markdown guide. Phase 1 writes the risk map and the rollout table the orchestrator reads. Phase 2 writes the stack, gates, cookbook pointers, exclusions, and dates. Research file references stay in the research document. The guide states scenarios.

## Phases at a Glance

| Phase                           | What it delivers                                                     | Key risk                                                                                  |
| ------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1. Risk map and rollout         | Risk #6, the #1 smoke-edit line, phases 4 and 5 not started          | A file:line anchor lands in section 2, or phase 4 is described as an empty-database apply |
| 2. Stack, gates, and exclusions | Playwright 1.63.0 recorded, TBD pointers, freshness dates 2026-10-05 | A Playwright CI job is added, or the cookbook pretends the new checks already shipped     |

**Prerequisites:** `research.md` is complete and the two-phase outline is approved.
**Estimated effort:** One session. Two edits of one file.

## Open Risks & Assumptions

- `supabase/seed.sql` is missing and `supabase db reset` was not run. The later phase 4 change has to name the SQL client. This guide does not.
- A green run of the two grant-and-policy migrations after an insert does not, by itself, catch a later `UPDATE`. The guide's proof is the migration under test, applied after the row exists.

## Success Criteria (Summary)

- Section 3 shows phases 1–3 complete and phases 4 and 5 not started.
- Risk #6's proof is insert, apply the migration under test, then select. Risk #1 keeps the unit and adds one smoke edit.
- Section 4 names Playwright 1.63.0, section 5 adds no Playwright gate, and section 7 still excludes kitchen-sink screens and visual restyles.
