<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Notification System Implementation Plan

- **Plan**: context/changes/notification-system/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4, 5
- **Date**: 2026-10-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 6 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated checks run on 2026-10-27, all passing: `npm run lint`, `npm run check:home-tokens`, `npx astro check` (0 errors), `npm test` (205/205), `npm run build`, `npm run migration-check` (this runs `supabase db reset`, which covers 1.1), `npm run smoke` (all steps), `npx playwright test` (12/12). The first Playwright run failed in `auth.setup.ts` because the reset had wiped the local E2E user. It passed after the user was recreated the same way as in CI's step.

## Findings

### F1 — Bell is shown at zero unread; plan, change.md and roadmap say hidden

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/lib/topbar.ts:35,88-99; src/components/TopbarActions.tsx:141; src/components/Topbar.astro:41-42
- **Detail**: The plan says `TopbarAccount.notifications` is `null` at `unreadCount === 0` and that with zero unread no bell is rendered. change.md:14 and roadmap S-39 say the bell is hidden too. In the code the value is never null, so every signed-in user sees a bell. At zero unread it has no badge, is labelled "Notifications, 0 unread", and its menu holds only "See all notifications". A failed read gives the same empty bell. This was deliberate: the p4 commit says "always present for a signed-in user", and topbar.test.ts, the E2E spec and kitchen-sink/home were written to match. The plan was never amended.
- **Fix A ⭐ Recommended**: Restore the planned behaviour: `topbarNotifications` returns `null` at zero unread or when there is no data, `TopbarActions` renders the bell only when it is set, and the unit test, E2E assertion ("bell disappears on reload") and the kitchen-sink state are updated.
  - Strength: Matches the requirement as the user wrote it (change.md:14), the plan and the roadmap.
  - Tradeoff: Four files change, and Hub → Notifications is then reachable only through the Hub tab while nothing is unread.
  - Confidence: HIGH — a narrow model change; the tests already cover both paths.
  - Blind spot: The reason for the change at implementation time was not recorded. It may have been a deliberate UX call.
- **Fix B**: Keep the always-on bell and add a plan addendum, then update change.md and roadmap S-39.
  - Strength: No code churn, and gives a stable way into Notifications.
  - Tradeoff: Goes against the user's stated requirement.
  - Confidence: MED — depends on the user's UX preference.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix B — added a plan addendum and reworded change.md Notes and roadmap (Intent, MS-30, S-39 row and outcome).

### F2 — A trainer can flood a trainee with notifications

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261027200000_notifications.sql:96-108
- **Detail**: Each request → withdraw cycle (`request_trainee_link` then `remove_trainer_link` on a pending row) writes two rows for the trainee: `link_requested` and `link_cancelled`. Nothing limits, dedupes or caps this, so a trainer can loop and fill the trainee's bell and table. The plan's "NOT doing" list rules out retention but does not name this abuse case.
- **Fix A ⭐ Recommended**: Record it as a known risk in the plan and open a roadmap follow-up for a rate limit or dedupe.
  - Strength: Keeps this release's scope. It is an abuse case and needs an existing trainer–trainee relationship to pursue.
  - Tradeoff: The risk stays live until the follow-up lands.
  - Confidence: MED — impact depends on how often trainers misbehave.
  - Blind spot: No rate limiting exists on the link RPCs either; not checked.
- **Fix B**: In the trigger, skip `link_requested` / `link_cancelled` when the same actor → recipient has an unread notification of that kind in the last N minutes.
  - Strength: Closes the flood at its only write path.
  - Tradeoff: Adds trigger logic and smoke cases, and the smoke re-request sequence may need adjusting.
  - Confidence: MED — straightforward SQL, but changes event semantics.
  - Blind spot: The smoke re-request → cancel steps may then expect fewer rows.
- **Decision**: FIXED via Fix A — known risk recorded in the plan addendum and in the S-39 Risk line of the roadmap; follow-up queued in follow-ups/review-fixes.md.

### F3 — Failed open loses page and size

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/notifications/open.ts:11
- **Detail**: On failure the route redirects to the bare `/hub/notifications?error=failed`. The sibling `read`/`delete` routes and `collaborations/remove.ts` keep `page`/`size`. A failed open from page 3 at size 15 drops the user back to page 1 at size 5.
- **Fix**: Post hidden `page`/`size` fields from table rows and build the failure path with `notificationsPath`. Bell items keep the defaults.
- **Decision**: FIXED — open.ts parses page/size leniently and fails to `notificationsPath`; table rows post page/size; the smoke open-failure expectations were updated to `notificationsListPath("error=failed")`.

### F4 — `ids` max hard-coded to 15

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/notifications/read.ts:10, src/pages/api/notifications/delete.ts:10
- **Detail**: `.max(15)` duplicates `pageSizes` from src/lib/measurement-page.ts. If a larger page size is added, select-all followed by an action would fail with a generic error.
- **Fix**: Use `.max(Math.max(...pageSizes))`.
- **Decision**: FIXED — both routes derive the max from `pageSizes`.

### F5 — Unread partial index lacks the `id desc` tie-breaker

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261027200000_notifications.sql:22-24
- **Detail**: The bell query orders by `created_at desc, id desc`, but the partial index is `(recipient_id, created_at desc) where read_at is null`, so Postgres needs an incremental sort. This is cheap at bell size, and the full index already includes `id desc`. The migration has not reached hosted Supabase (that only happens on `main`), so it can still be edited in place.
- **Fix**: Change the partial index to `(recipient_id, created_at desc, id desc) where read_at is null` in the unmerged migration.
- **Decision**: FIXED — partial index now ends with `id desc`, edited in place because the migration is not yet on `main`; the plan's Phase 1 contract was updated to match.

### F6 — `read_at` comes from the Worker clock and is unconstrained

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/notifications.ts:258,278; migration :38-52
- **Detail**: The plan says `read_at = now()`, but the service sends `new Date().toISOString()` from the Worker. The update stays idempotent (`.is("read_at", null)`). Separately, the column grant lets a user set `read_at` to any value, including null, on their own rows over REST. This only affects the user themselves.
- **Fix**: Accept as-is and add a one-line plan note. Optionally add a `read_at <= now() + interval '1 minute'` check.
- **Decision**: FIXED — accepted and documented in the plan addendum (no constraint added).

### F7 — Small undocumented deviations

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/hub/NotificationsTable.tsx:228-245; migration :121-129
- **Detail**: Two changes go beyond the plan, and both are benign:
  - "Entries per page" is a GET form with `aria-pressed` submit buttons rather than `<a>` links. The resulting URL is the same.
  - The trigger lowercases and trims the actor email, and skips the notification when the email is empty. The link change still goes through.
- **Fix**: Add a short "Deviations" note to the plan.
- **Decision**: FIXED — both deviations noted in the plan addendum.

### F8 — Failed bell read is silent

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/Topbar.astro:41-42
- **Detail**: When `readNotificationBell` fails, the page renders normally, which is intended, but nothing logs the failure. A broken notifications query in production would go unnoticed.
- **Fix**: `console.error` the failure (Workers logs) before falling back.
- **Decision**: FIXED differently — instead of logging (the repo has `no-console: warn` and no logging precedent), Topbar.astro renders a `PageErrorToasts` error toast "Could not load notifications" when the bell read fails, as the other errors do; the empty bell remains the fallback.
