# Drop the legacy link_trainee_by_email function — Plan Brief

> Full plan: `context/changes/drop-link-trainee-by-email/plan.md`

## What & Why

S-37 replaced instant linking with a request the trainee accepts or declines. It kept `link_trainee_by_email` (redefined to insert `pending`) only so the previous Worker kept working during the deploy. That Worker is gone, so the function is now dead code that can still be called over REST. This change drops it (review F4). It also closes review F5 as accepted: a declined request is deleted, and the trainer can send a new one right away.

## Starting Point

Nothing in `src` calls the function. Its only live references are the generated type (`src/db/database.types.ts:154`) and one smoke step (`scripts/smoke.mjs:951`). That step creates the pending row the next smoke steps use (already pending → accept → remove). No test runs a decline followed by a new request, and the PRD still says "no pending/accept ceremony".

## Desired End State

The function no longer exists, and a REST call to it returns 404. Smoke still proves that a direct REST call cannot create an accepted link, now through `request_trainee_link`. Smoke also proves that after a decline, the trainer's next request is `sent` and pending. F5 is recorded as accepted in the review follow-up and in the PRD.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Replacement for the smoke step | Direct REST call to `request_trainee_link` (expects `sent`), plus a step that expects `link_trainee_by_email` to return 404 | Keeps the REST consent check and the smoke chain, and proves the drop against a running server | Plan |
| F5 test | Smoke steps: decline, then request again → `sent` and pending, then cancel | A test pins the accepted decision, so adding a block by accident fails CI | Plan |
| F5 record | `review-fixes.md` F5 set to Accepted, and PRD FR-007 and the Pairing line updated | Closes the open item and puts the rule where requirements are read | Plan |
| F5 behaviour | No block, cooldown or `declined` status | Accepted in the change notes | Change notes |
| Migration form | New migration with `drop function if exists`; old migrations untouched | Migrations are append-only and must stay backward compatible | Plan |

## Scope

**In scope:**
- A new migration that drops `public.link_trainee_by_email(text)`
- Regenerated `src/db/database.types.ts`
- Smoke: request-based consent check, a 404 check for the old function, and the decline → request again steps
- F5 recorded in `hub-collaborations-handle/follow-ups/review-fixes.md` and in PRD FR-007 and the Pairing line

**Out of scope:**
- Any block, cooldown, rate limit or `declined` status
- Changes to request or removal functions, RLS, routes or UI
- A Playwright case for F5, or a `/10x-lesson` entry
- Other PRD edits

## Architecture / Approach

The migration only drops the function, so it is backward compatible with the S-37 Worker now in production. In the smoke chain, only the step that creates the pending row changes, so the later steps keep their expectations. The F5 steps run after the chain removes the link and end by cancelling the new request, so the steps after them see the same state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Drop the legacy function | Migration, regenerated types, smoke switched to `request_trainee_link` plus a 404 check | Merging before the #141 Worker is live would break an old Worker's link POST |
| 2. Pin and record F5 | Smoke decline → request again steps; F5 accepted in review-fixes.md and the PRD | Wrong notice codes or a signed-out trainee session in the new smoke steps |

**Prerequisites:** #141 (`57ea069`) deployed to production by Workers Builds; local Supabase running for `db:types`, `migration-check` and `smoke`.
**Estimated effort:** ~1 short session across 2 phases.

## Open Risks & Assumptions

- Assumes PostgREST returns 404 for a dropped RPC (its `PGRST202` "function not found" response).
- Assumes `unlinkedJar` is still signed in when the F5 steps run; the plan says to sign it in again if it is not.

## Success Criteria (Summary)

- `link_trainee_by_email` is gone from the schema, the types and the app, and CI (lint, check, test, build, smoke, migration-check, e2e) passes.
- A declined request can be sent again at once, and a smoke test proves it.
- The PRD and the review follow-up state the F5 decision.
