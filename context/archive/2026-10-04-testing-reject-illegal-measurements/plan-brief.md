# Reject Illegal Measurements — Plan Brief

> Full plan: `context/changes/testing-reject-illegal-measurements/plan.md`
> Research: `context/changes/testing-reject-illegal-measurements/research.md`

## What & Why

An illegal measurement must be refused and must not show up on the journal. The signed limits already have a unit test. A future date is the case the measurements table would still store if the create route skipped that rule. This plan proves that create leaves the empty journal empty.

## Starting Point

Smoke signs up a fresh trainee and already expects `No measurements yet` before any save. The next step posts weight `800` and checks only the error redirect. That weight is also rejected by a table check, so it does not prove the route stopped before insert. Vitest does not boot the preview. The plus-two date case already lives in `src/lib/measurement-input.test.ts`.

## Desired End State

Smoke posts a create dated two UTC calendar days ahead, with weight `80.0`, while that journal is still empty. The route returns the error redirect. The next journal read still says `No measurements yet` and does not contain that date. The cookbook tells the next illegal-entry check to extend this script, and the stack and gate lines point the storage proof at smoke.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Where the proof runs | Extend `scripts/smoke.mjs` | Vitest does not boot the preview, and phase 2 already keeps the live request there | Research |
| Which body | UTC today plus two calendar days, weight `80.0` | Plus two is the first illegal day, and the table would still accept that date | Research |
| What passes | Error redirect, then `No measurements yet` without that date | The redirect is the refusal; the list read is the proof nothing was stored | Research |
| Existing unit | Leave `measurement-input.test.ts` unchanged | It already locks the signed limits, including plus two | Research |
| Edit path | No second request | One create covers the shared rule and the create store | Research |
| Stack line | Correct §4 and the §5 Vitest gate | Both still describe this storage proof as a Vitest case | Plan |

## Scope

**In scope:**

- Two smoke steps after the fresh empty-journal render and before the out-of-range weight post
- A UTC-plus-two date computed inside `scripts/smoke.mjs`
- Cookbook §6.3 and §6.5
- The §4 sentence and the §5 gate row that still send the storage proof to Vitest

**Out of scope:**

- A new unit, a repeated field message, weight `800` as this proof
- An edit-path future-date request
- A Vitest request, a mocked insert, or a browser check
- Edits to test-plan §1, §2, or §3

## Architecture / Approach

The fresh trainee is already signed in with an empty journal. One helper in the smoke script builds the UTC-plus-two date. `measurementForm` supplies the legal numbers. The post expects the existing `/measurements?error=` redirect. The following GET expects the empty-journal sentence and forbids the posted date. Phase 2 only updates the test-plan cookbook and the two lines that still name Vitest as the place for this proof.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Future-date create leaves the journal empty | The smoke post and the following empty-journal read | A local-time date, or a step after the first save, makes the oracle lie |
| 2. Cookbook | §6.3, §6.5, and the §4 / §5 correction | The stack line keeps sending the next check to Vitest |

**Prerequisites:** research.md and the backported risk #5 row. A running app and local Supabase for `npm run smoke`, same as CI.
**Estimated effort:** one session across 2 phases.

## Open Risks & Assumptions

- The empty-journal sentence stays `No measurements yet`. A copy change fails the GET even when nothing was stored.
- The create refusal stays a redirect to `/measurements?error=`. The plan does not lock the field-message text.
- The edit handler's schema-failure return stays unproven on purpose.

## Success Criteria (Summary)

- `npm run smoke` passes with the future-date create before the weight-800 step.
- The following journal GET contains `No measurements yet` and excludes the posted date.
- §6.3, §6.5, §4, and §5 describe that smoke proof, and the existing unit file is unchanged.
