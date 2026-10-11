<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Forgot password and Profile password change

- **Plan**: context/changes/handle-change-and-reset-pass/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-11
- **Verdict**: REJECTED
- **Findings**: 1 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | WARNING |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Unknown email is told it has no account

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/reset-password.ts:15
- **Detail**: The plan says a missing account and a real send both redirect to exactly `/auth/reset-password?notice=reset-sent`, and "What We're NOT Doing" forbids telling the visitor whether an email has an account. Migration Notes say there is no SQL migration. `POST /api/auth/reset-password` calls `email_is_registered` and, when that returns false, redirects to `/auth/reset-password?error=unknown-email` ("No account with that email."). `resetRequestResult` maps `user_not_found` to `"unknown"` (`src/lib/auth-reset.ts:29`). Smoke expects that error URL (`scripts/smoke.mjs:661`). The new function is `security definer` and `grant execute` goes to `anon` and `authenticated` (`supabase/migrations/20261010150700_email_is_registered.sql:17`). Sibling functions `link_trainee_by_email` and `measurement_months` revoke `anon` and do not grant it back. The publishable anon key can call `/rest/v1/rpc/email_is_registered` directly, which also skips the auth email rate limit. This branch is `cursor/handle-change-and-reset-pass`; commit `3ae9397` is not on `main`.
- **Fix A ⭐ Recommended**: Restore the identical sent notice and drop the lookup
  - Strength: Matches the plan, the phase 1 tests as written, and the sibling functions that do not expose `auth.users` to `anon`. Removes the public oracle, not only the page copy.
  - Tradeoff: A visitor with a typo sees "Check your email for a password reset link." and gets no mail. The migration file has to come out before this branch reaches hosted Supabase, or a later migration has to drop the function.
  - Confidence: HIGH — the plan states this rule in the desired end state, the phase contract, and the not-doing list, and the grant is in the new migration.
  - Blind spot: None significant. This commit is not on `main`, so the function is not on the hosted project from this branch.
- **Fix B**: Keep the distinct error and amend the plan
  - Strength: Preserves commit `3ae9397`, which made this the product behavior on purpose.
  - Tradeoff: Account existence stays public. The anon grant still has to go, and the server would need a key that is not the publishable anon key, which this route does not have today.
  - Confidence: MEDIUM — the commit is explicit, but the plan's security rule was not revised with it.
  - Blind spot: Have not checked whether hosted Supabase already has this function applied outside this branch.
- **Decision**: Fixed via Fix A

### F2 — Other sessions can stay signed in after a reported password change

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/password.ts:48
- **Detail**: After `updateUser` succeeds, `signOut({ scope: "others" })` is awaited and its error is ignored. The route always redirects to `/profile?notice=password-changed`. If that logout fails, this browser stays signed in and the notice still claims the change finished, while another session can keep working. The plan's success path is update, then sign out others, then that notice. Reset confirm does call `signOut()` when `updateUser` returns an error (`src/pages/api/auth/reset-password/confirm.ts`).
- **Fix**: If `signOut({ scope: "others" })` returns an error, do not redirect to `notice=password-changed`. The new password is already stored, so do not use `password-unchanged` either. Surface a result that does not claim the other sessions ended, and leave this session in place.
  - Strength: The success notice stays true. This session is not signed out by mistake.
  - Tradeoff: Needs one new sentence. The plan has no copy for "password changed, other sessions still open."
  - Confidence: MEDIUM — `@supabase/auth-js` returns the logout error without revoking other sessions, and this route drops that error. Have not reproduced a failed `scope: "others"` call against local GoTrue.
  - Blind spot: Have not forced a logout failure in this app.
- **Decision**: Fixed via Fix now

### F3 — Checked reset rows describe the sent notice the route no longer returns

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/handle-change-and-reset-pass/plan.md:319
- **Detail**: Progress 1.7 is `[x]` for "Check your email for a password reset link." Progress 1.1 is `[x]` for "a missing account both mean sent." Fix A restored that behavior: a missing account is `"sent"`, and smoke expects `/auth/reset-password?notice=reset-sent`. The checked rows now match the route. `npm run smoke` was not re-run: nothing answered on `http://localhost:4321`.
- **Fix**: After F1 is decided, rewrite 1.1 and 1.7 so the checked rows match the behavior that ships. Do not leave 1.7 checked for the sent sentence while the route returns `unknown-email`.
- **Decision**: DISMISSED — Fix A restored the sent notice, so 1.1 and 1.7 already match the route.

### F4 — Unplanned redirect for an expired recovery hash

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/auth/ResetPasswordHashError.tsx:7
- **Detail**: The plan's expired link is `error=reset-link` on the query string. `ResetPasswordHashError` rewrites a Supabase hash (`error=access_denied` or `error_code=otp_expired`) to that query. It does not call `verifyOtp`. `createCookieFreeClient` in `src/lib/supabase.ts` is also an unplanned file; the reset route uses it so that request does not write cookies, which the plan required.
- **Fix**: Leave the hash redirect and the cookie-free client. Add one sentence to the reset-page contract describing the hash rewrite.
- **Decision**: Fixed via Fix now
