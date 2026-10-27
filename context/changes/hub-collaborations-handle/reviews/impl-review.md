<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Hub with Collaborations

- **Plan**: context/changes/hub-collaborations-handle/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-27
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 6 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Notes:
- **Plan adherence:** every planned change is implemented. These deviations were agreed with the user during manual testing and are recorded in commits 18c56cd and e1bb2b8, so they are not drift:
  - a measurements-style table with fixed layout and one-line truncation;
  - header icons;
  - no "Entries per page" control;
  - the "Actions for …" row menu below 32rem (always shown, since the Hub stays `max-w-sm`);
  - `supabase` as the first argument of the service functions;
  - the `viewerRole` prop;
  - no `ensureProfile` call on `/hub/collaborations`.
- **Security:**
  - every SECURITY DEFINER function sets `search_path = ''`, revokes from `public, anon`, grants to `authenticated` only, and is scoped by `auth.uid()` plus a role check;
  - only `accept_trainer_link` can set `accepted`, and only for the trainee's own pending row;
  - the RLS policy requires `status = 'accepted'`;
  - there is no XSS and no open redirect;
  - the Astro origin check covers the new POST routes.
- **Success criteria:**
  - Rerun for this review: `npm test` (184), `npm run lint`, `npx astro check` (0 errors) and `npm run check:home-tokens` all passed.
  - Earlier in the same session, on the same code: `npx playwright test` passed 12/12 at e1bb2b8, and `npm run build` passed.
  - `npm run smoke` passed after the Phase 3 UI fixes; only a CSS-class change came after that run.
  - `npx supabase db reset` and `npm run migration-check` passed in Phase 1. They were not rerun because they wipe the local database, including the seeded E2E trainee.
  - Manual rows 1.7–3.3 were all confirmed by the user in this session. 1.9 was proven via SQL: a pre-migration link becomes `accepted` and stays readable under RLS.

## Findings

### F1 — Request route reports an RPC failure as "No trainee with that email"

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/trainer-links/index.ts:83
- **Detail**: When `requestTraineeLink` returns `{ ok: false }` (a Supabase or network failure), the trainer is redirected with "No trainee with that email", so an outage looks like a miss. An email over 320 characters also gets that message (zod failure, :76). The plan defines copy only for the four outcomes. The old route already behaved this way.
- **Fix**: Add a separate error message (e.g. "Could not send the request. Try again.") for `!requested.ok`, and keep "No trainee with that email" only for the `not_found` outcome and the over-length email.
- **Decision**: FIXED — `requestFailedMessage` ("Could not send the request. Try again.") in src/lib/collaborations.ts, used for `!requested.ok` in the request route; unit case added

### F2 — Huge `?page=` values error instead of falling back to the last page

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/collaborations.ts:16-22; src/lib/services/trainer-links.ts:105
- **Detail**: `parseCollaborationPage` accepts any safe integer, but the RPC parameter is `int4`, so `?page=99999999999` makes PostgREST fail and the Hub shows "Could not load collaborations". The past-the-end fallback runs only when a page comes back empty, not when the call errors. The action routes' `pageSchema` has the same open range.
- **Fix**: Clamp the parsed page (e.g. to 10000) in `parseCollaborationPage` and in the action routes' `pageSchema`, and add a unit case for it.
- **Decision**: FIXED — `collaborationMaxPage = 10_000` in src/lib/collaborations.ts; `parseCollaborationPage` and the accept/remove `pageSchema` clamp to it; unit case added

### F3 — `?requested=` displays any text as the sent notice

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/measurements.astro:136
- **Detail**: Any `?requested=<text>` shows a trainer "Your request has been sent to <text>". The text is escaped, so this is not XSS, but a crafted link can display a misleading notice. The existing `?error=` toasts behave the same way.
- **Fix**: Show the notice only when the value parses as an email (`z.email()`), and ignore it otherwise.
- **Decision**: FIXED — `requestedNoticeEmail` (z.email()) in src/lib/collaborations.ts, used by src/pages/measurements.astro; unit case added

### F4 — Deploy window: the old Worker shows a fresh request as linked; drop `link_trainee_by_email` later

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261027120000_trainer_link_requests.sql:14-66
- **Detail**: Until the new Worker is live, the old Worker's POST creates a pending row through `link_trainee_by_email` and redirects to `?trainee=<id>`. Its picker lists that row with an empty journal. RLS still blocks the data, so nothing leaks. The plan's Migration Notes accept this window and schedule dropping the function for a later release, but nothing currently tracks that follow-up.
- **Fix**: Track a follow-up (roadmap/backlog item or GitHub issue) to drop `public.link_trainee_by_email` in a later release.
- **Decision**: FIXED — follow-up queued in context/changes/hub-collaborations-handle/follow-ups/review-fixes.md

### F5 — A declined trainer can re-send the same request immediately

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261027120000_trainer_link_requests.sql:84-151
- **Detail**: Decline deletes the row, as the plan says, so `request_trainee_link` returns `sent` again at once. There is no cooldown or block. This matches "What We're NOT Doing" (no history of declined requests), but it is a product gap a trainee could feel as spam.
- **Fix**: Record it as a product decision or backlog item (e.g. a "declined" state or a rate limit). No code change now.
- **Decision**: FIXED — product decision queued in context/changes/hub-collaborations-handle/follow-ups/review-fixes.md (no code change)

### F6 — Hub e2e can miss its row when over 5 leftover pending requests exist

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/e2e/hub-collaborations.spec.ts:62-90
- **Detail**: Both widths drive the same seeded trainee, and pending rows sort first with 5 per page. More than 5 stale pending requests from failed runs (where cleanup didn't run) would push this run's row to page 2, and the trainee-side lookup would fail. CI uses a fresh database and a single worker, so the risk is local only.
- **Fix**: Leave as is, or before the trainee step have the test clean up stale `e2e-hub-trainer-*` requests (decline them from the trainee side).
- **Decision**: FIXED — `removeStaleHubTrainers` step in tests/e2e/hub-collaborations.spec.ts removes `e2e-hub-trainer-<ts>` links older than 10 minutes from the trainee side before the accept step; verified with a seeded stale pending request

### F7 — Misplaced comment and an unneeded fragment in CollaborationsList

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/hub/CollaborationsList.astro:27-30
- **Detail**: The comment "The toast only opens for a linked row on this page…" now sits above the `PartyIcon` line instead of above `confirming`. The non-empty branch also wraps a single element in a `<>…</>` fragment it no longer needs.
- **Fix**: Move the comment above `confirming` and drop the fragment.
- **Decision**: FIXED — comment moved above `confirming`, fragment removed
