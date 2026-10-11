<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Forgot password and Profile password change

- **Plan**: context/changes/handle-change-and-reset-pass/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-11
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Failed recovery check can leave a session cookie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/reset-password/session.ts:27
- **Detail**: The plan says a `setSession` result that is not a recovery access token redirects to `/auth/reset-password?error=reset-link`. `isRecoveryAccessToken` only base64-decodes `amr`; GoTrue is what accepts the token. In `@supabase/auth-js`, an expired access token (or one with no `exp`) goes through `_callRefreshToken`, which calls `_saveSession` before `setSession` returns. If that refresh succeeds and the new access token fails `isRecoveryAccessToken`, this route redirects to `error=reset-link` and does not call `signOut`. The browser keeps the refreshed session. A forged `amr` alone is not stored; a refresh token GoTrue accepts is required.
- **Fix**: On the failure branch, call `signOut()` before redirecting to `error=reset-link`.
  - Strength: The rejection matches the contract. A refresh that GoTrue already wrote does not remain after the recovery check fails.
  - Tradeoff: An extra sign-out on a path that usually has no session. Have not reproduced the expired-token refresh against local GoTrue.
  - Confidence: MEDIUM — the cookie write is in `GoTrueClient._callRefreshToken` before it returns to `_setSession`; this route never clears it.
  - Blind spot: Have not forced an expired recovery access token plus a valid refresh token through the running app.
- **Decision**: Fixed via Fix now

### F2 — Rejected recovery hash stays on the opening line

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/auth/ResetPasswordHashError.tsx:12
- **Detail**: `reset-password.astro` hides the form and shows "Opening your reset link..." whenever the hash contains `access_token=` and `type=recovery`. `recoverySessionFromHash` returns null when `refresh_token` is missing or `amr` is not `otp` without `password`. The component then returns without posting and without replacing the location, so the opening line never clears. An expired hash (`error=access_denied` or `error_code=otp_expired`) still redirects to `error=reset-link`.
- **Fix**: When the hash contains `access_token` and `type=recovery` but `recoverySessionFromHash` returns null, replace the location with `/auth/reset-password?error=reset-link`.
- **Decision**: Fixed via Fix now

### F3 — Profile sign-out failure is outside the written contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/auth/password.ts:50
- **Detail**: The Profile contract says a successful `updateUser` then `signOut({ scope: "others" })` redirects to exactly `/profile?notice=password-changed`. If that sign-out returns an error, the route redirects to `/profile?error=other-sessions`. `profilePageError` renders "Your password was changed. We could not sign out your other sessions." through `ServerError`. That sentence is not in the plan. `updateUser` failure still avoids signing out other sessions and uses `password-unchanged`.
- **Fix**: Add `error=other-sessions` and that sentence to the Profile page contract.
- **Decision**: Fixed via Fix now

### F4 — Reset confirm ignores a failed sign-out

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/auth/reset-password/confirm.ts:32
- **Detail**: After `updateUser` succeeds, `commitPassword` calls `signOut()` and always redirects to `/auth/signin?notice=password-reset`. The plan asks for that redirect and does not mention a sign-out error. Profile does not claim the other sessions ended when `signOut({ scope: "others" })` fails. Default `signOut()` scope is `global`.
- **Fix**: If `signOut()` returns an error, do not redirect to `notice=password-reset`.
- **Decision**: Fixed via Fix now

### F5 — Smoke was not re-run

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: `npm test` passed (71 tests), including the sent/missing-account mapping and the `amr` / `recoverySessionFromHash` cases. `npm run lint` and `npm run check:home-tokens` passed. `npm run smoke` did not run: nothing is listening on `http://localhost:4321`. Progress 1.4 and 2.4 are already checked from an earlier run.
- **Fix**: Re-run `npm run smoke` against a local preview before archive.
- **Decision**: Fixed via Fix now
