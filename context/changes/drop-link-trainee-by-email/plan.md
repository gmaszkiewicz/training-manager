# Drop the legacy link_trainee_by_email function Implementation Plan

## Overview

The Hub request flow (S-37, `hub-collaborations-handle`, merged in #141) is live, and no running Worker calls `public.link_trainee_by_email(text)` any more. This plan drops that function in a new migration and regenerates the database types. The smoke consent check that used the function moves to `request_trainee_link`, and a new smoke step proves the old function is gone. The plan also closes review finding F5 as accepted: a declined request is deleted, and the trainer can send a new one right away with no block or cooldown. A smoke check pins this, and the decision is recorded in the review follow-up and in the PRD.

## Current State Analysis

- `link_trainee_by_email` was created in `supabase/migrations/20260928170000_trainer_links.sql:23-75`. S-37 redefined it in `supabase/migrations/20261027120000_trainer_link_requests.sql:14-66` so it inserts `pending` rows. That kept the previous Worker working during the deploy window and closed the consent bypass over REST.
- Nothing in `src` calls it. The only live references are the generated type at `src/db/database.types.ts:154` and one smoke step at `scripts/smoke.mjs:951`.
- That smoke step is part of a chain. The direct call creates a pending row for `unlinkedEmail`. Then the steps "trainer direct link row is only pending" (`:955`), "catalog is still the current month", "measurement months while pending", "request after the direct link is already pending" (`:969`) and "unlinked trainee accepts" (`:984`) all depend on that row. The chain ends with "trainer removes the link" (`:1009`) and the removal checks up to `:1027`.
- Decline deletes the row through `remove_trainer_link` (`20261027120000_trainer_link_requests.sql`, the last function), so `request_trainee_link` returns `sent` again. No smoke or e2e test runs a decline followed by a new request. The F5 entry in `context/changes/hub-collaborations-handle/follow-ups/review-fixes.md` still says "Decision needed (product)".
- The PRD still describes the pre-S-37 rule: FR-007 at `context/foundation/prd.md:81` and the Pairing line at `context/foundation/prd.md:106` both say "no pending/accept ceremony".

## Desired End State

- The function `public.link_trainee_by_email(text)` no longer exists on local or hosted Supabase. A REST call to `/rest/v1/rpc/link_trainee_by_email` returns 404.
- `grep -rn link_trainee_by_email src scripts` matches only the smoke step that expects the 404.
- Smoke still proves that a trainer's direct REST call cannot create an accepted link, now through `request_trainee_link`.
- Smoke proves that after a trainee declines, the trainer's next request is `sent` and the row is `pending` again.
- F5 is recorded as accepted in the review follow-up and in the PRD.

### Key Discoveries:

- `rpcWith(cookieJar, name, args)` (`scripts/smoke.mjs:331`) already calls `request_trainee_link` over REST at `:745` and expects `{ value: "not_found" }`. The same helper with `unlinkedEmail` returns `"sent"`.
- `trainerLinkRest(subjectId)` (`scripts/smoke.mjs:353`) reads the trainer's own link status. `removeWith(cookieJar, otherId, intent)` (`:492`) posts to `/api/collaborations/remove`, which accepts `cancel | unlink | decline | remove` (`src/pages/api/collaborations/remove.ts:17`). The intent only picks the notice wording.
- `requestSentPath(email)`, `requestErrorPath(message)` and `hubPath(query)` (`scripts/smoke.mjs:476-482`) build the exact redirect targets used by the request and Hub steps.
- `npm run db:types` regenerates `src/db/database.types.ts` from local Supabase and runs Prettier on it (`package.json:19`). Do not hand-edit that file.
- `npm run migration-check` applies the newest migration and checks that one measurement row survives. A function drop does not touch `measurements`.

## What We're NOT Doing

- No block, cooldown, rate limit or `declined` status after a decline (F5 is accepted as it is).
- No change to `request_trainee_link`, `remove_trainer_link`, RLS policies, routes or UI.
- No Playwright case for decline followed by a new request; smoke pins it.
- No `/10x-lesson` entry for F5; it is a single product decision, not a recurring pitfall.
- No PRD rewrite beyond FR-007 and the Access Control Pairing line.
- No edits to the old migrations; they stay as history.

## Implementation Approach

The drop goes in a new migration, since migrations are append-only and reach hosted Supabase before the Worker. The S-37 Worker already in production does not call the function, so this migration is backward compatible. The smoke chain keeps its shape: only the step that creates the pending row changes, so every later step still works. The F5 steps run after the chain's removal steps, while the trainee is not linked, and they finish by cancelling the new request, so the steps after them see the same state as today.

## Critical Implementation Details

- **Release ordering:** merge only after the Workers Build for #141 (`57ea069`) has deployed successfully to production. If an older Worker were still serving, its link POST would fail once the function is dropped.

## Phase 1: Drop the legacy function

### Overview

Remove `link_trainee_by_email` from the schema and types, and move the smoke consent check to the request flow.

### Changes Required:

#### 1. Drop migration

**File**: `supabase/migrations/20261027180000_drop_link_trainee_by_email.sql`

**Intent**: Drop the legacy instant-link function now that no Worker calls it. Add a short comment that names S-37 as the replacement (`request_trainee_link`).

**Contract**: `drop function if exists public.link_trainee_by_email(text);` and nothing else. The timestamp must sort after `20261027120000`.

#### 2. Regenerated types

**File**: `src/db/database.types.ts`

**Intent**: Remove the function from the generated `Database` type.

**Contract**: Run `npm run db:types` against local Supabase with the new migration applied. The `link_trainee_by_email` entry in `public.Functions` disappears, and the other functions stay as they are.

#### 3. Smoke consent check

**File**: `scripts/smoke.mjs`

**Intent**: Keep the check that a trainer's direct REST call cannot create an accepted link, now through the function the app uses, and prove the legacy function is gone.

**Contract**:
- Replace the step "trainer direct link call returns the trainee" (`:950`) with a direct `rpcWith(jar, "request_trainee_link", { p_email: unlinkedEmail })` that expects `{ status: 200, json: () => ({ value: "sent" }) }`. Give it a title that names the direct request call.
- Put a new step right before it: `rpcWith(jar, "link_trainee_by_email", { p_email: unlinkedEmail })` expects `{ status: 404 }`, with a title like "legacy link function is gone".
- Keep the steps that follow ("only pending", "still the current month", "while pending", "already pending", "accepts"). Adjust their titles only where they say "direct link"; the expected results stay the same.

### Success Criteria:

#### Automated Verification:

- `grep -rn link_trainee_by_email src scripts` matches only the smoke 404 step
- Migration check passes: `npm run migration-check`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Unit tests pass: `npm test`
- Build passes: `npm run build`
- Smoke passes against the local preview with local Supabase: `npm run smoke`

#### Manual Verification:

- Workers Build for `57ea069` (#141) shows a successful production deploy before this PR is merged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Pin and record F5

### Overview

Pin with a smoke test that a declined request can be sent again at once, and record that decision.

### Changes Required:

#### 1. Smoke: decline, then request again

**File**: `scripts/smoke.mjs`

**Intent**: Fail CI if a block or cooldown after a decline is ever added by accident.

**Contract**: After "trainer measurement months after the removal" (`:1025`), and before the signout that follows, add these steps in order:
1. The trainer sends a request to `unlinkedEmail` through `POST /api/trainer-links` and expects `requestSentPath(unlinkedEmail)` exactly.
2. The unlinked trainee declines: `removeWith(unlinkedJar, trainerId, "decline")` expects `hubPath("notice=declined")` exactly. If `unlinkedJar` is no longer signed in here, sign it in first, as at `:979`.
3. The trainer sends the request again and expects `requestSentPath(unlinkedEmail)` exactly (no block, no cooldown).
4. `trainerLinkRest(unlinkedTraineeId)` expects `{ linkStatus: "pending" }`.
5. The trainer cancels the request: `removeWith(jar, unlinkedTraineeId, "cancel")` expects the cancel notice from `NOTICES` in `src/pages/api/collaborations/remove.ts`. The steps after this then see the same state as today.

Read the exact notice codes from `NOTICES` in `remove.ts` instead of guessing them.

#### 2. Review follow-up

**File**: `context/changes/hub-collaborations-handle/follow-ups/review-fixes.md`

**Intent**: Close the open F5 decision, and note that F4 is done in this change.

**Contract**: Retitle the F5 section to show the decision, for example "Repeat requests after a decline (F5): accepted". Replace "Decision needed (product)" and its option list with the decision: a declined request is deleted, the trainer may send a new one at once, there is no block or cooldown, and the smoke test pins this. Keep the "Constraint" line as guidance for any future change. Add a one-line note under F4 saying it is done in `drop-link-trainee-by-email`.

#### 3. PRD pairing rule

**File**: `context/foundation/prd.md`

**Intent**: Make the PRD match the shipped request flow and state the F5 rule.

**Contract**:
- Rewrite FR-007 (`:81`): the trainer finds an existing trainee by email and sends a link request; the trainee accepts or declines it in the Hub; a declined request is removed and the trainer may send it again at once. Keep `Priority: must-have` and the Socrates note below it unchanged.
- Rewrite the Access Control Pairing line (`:106`) the same way: the trainer sees a protégé's entries only after the trainee accepts.
- Change nothing else in the PRD.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Smoke passes, including the new decline steps: `npm run smoke`
- Markdown formatting is clean: `npx prettier --check context/foundation/prd.md context/changes/hub-collaborations-handle/follow-ups/review-fixes.md`

#### Manual Verification:

- PRD FR-007 and the Pairing line read correctly and no longer say "no pending/accept ceremony"
- The F5 entry in `review-fixes.md` states the accepted decision and no longer asks for one

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- None added; no application code changes. Existing `npm test` must stay green.

### Integration Tests:

- `npm run smoke`: the 404 for the dropped function, the direct-REST request that stays pending, and the decline → request again → pending sequence.
- `npm run migration-check`: the new migration applies and the measurement row survives.
- `npx playwright test`: the existing Hub e2e runs unchanged in CI.

### Manual Testing Steps:

1. Confirm the production deploy of #141 in Workers Builds.
2. Read the updated PRD lines and the F5 follow-up entry.

## Performance Considerations

None.

## Migration Notes

- The drop is safe once the S-37 Worker is live, because that Worker calls `request_trainee_link` only. Workers Builds applies the migration before deploying the new Worker, and the Worker in that window is the S-37 one.
- Rollback: re-create the function from the body in `20261027120000_trainer_link_requests.sql:14-66` in a new migration. Nothing in the app needs it.

## References

- Follow-up source: `context/changes/hub-collaborations-handle/follow-ups/review-fixes.md` (F4, F5)
- Review: `context/changes/hub-collaborations-handle/reviews/impl-review.md` (F4 `:76`, F5 `:86`)
- Function body today: `supabase/migrations/20261027120000_trainer_link_requests.sql:14-66`
- Smoke chain: `scripts/smoke.mjs:946-1027`
- Roadmap item: `context/foundation/roadmap.md` S-38

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Drop the legacy function

#### Automated

- [x] 1.1 `grep -rn link_trainee_by_email src scripts` matches only the smoke 404 step
- [x] 1.2 Migration check passes: `npm run migration-check`
- [x] 1.3 Lint passes: `npm run lint`
- [x] 1.4 Type check passes: `npx astro check`
- [x] 1.5 Unit tests pass: `npm test`
- [x] 1.6 Build passes: `npm run build`
- [x] 1.7 Smoke passes against the local preview with local Supabase: `npm run smoke`

#### Manual

- [ ] 1.8 Workers Build for `57ea069` (#141) shows a successful production deploy before this PR is merged

### Phase 2: Pin and record F5

#### Automated

- [ ] 2.1 Lint passes: `npm run lint`
- [ ] 2.2 Smoke passes, including the new decline steps: `npm run smoke`
- [ ] 2.3 Markdown formatting is clean: `npx prettier --check context/foundation/prd.md context/changes/hub-collaborations-handle/follow-ups/review-fixes.md`

#### Manual

- [ ] 2.4 PRD FR-007 and the Pairing line read correctly and no longer say "no pending/accept ceremony"
- [ ] 2.5 The F5 entry in `review-fixes.md` states the accepted decision and no longer asks for one
