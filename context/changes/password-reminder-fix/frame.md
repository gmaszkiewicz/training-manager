# Frame Brief: Password reminder link dies after one open, and a new one cannot be sent

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

In production, the user clicked the password reminder link from the email and closed the tab without resetting the password. A few minutes later they clicked the same email link again, and the page said "This reset link is no longer valid." They could only get another reset email about an hour later.

## Initial Framing (preserved)

- **User's stated cause or approach**: the link expires as soon as it is clicked and the page is left, because its lifetime is too short.
- **User's proposed direction**: keep the link valid for a set time (e.g. 15 minutes), and make it possible to send a second link when the first has expired.
- **Pre-dispatch narrowing**: production; the user clicked the *same mail link* again; seconds to a few minutes passed between the two opens; "I clicked the link, closed the tab without resetting the password, and could only get another one an hour later."

## Dimension Map

1. **Token used up on the first open.** The hosted recovery email still uses Supabase's default `{{ .ConfirmationURL }}`. That link verifies, and so spends, the one-time token on the auth server at the first GET.
2. **Token lifetime is too short** ← initial framing
3. **No way back to the new-password form.** The first open leaves a recovery-session cookie, but returning to the page shows the email form.
4. **Resend blocked by the email send limit.** The built-in mailer allows only a few emails per hour, and the error does not say why or for how long.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1: first open uses up the token | GoTrue `verify.go` `verifyGet` → `recoverVerify` → `User.Recover()` clears the token. A second GET returns 403 `otp_expired`, which reaches the app as `#error=access_denied&error_code=otp_expired`. `ResetPasswordHashError.tsx:7-8` + `auth-reset.ts:19-26` turn that into exactly "This reset link is no longer valid." (`auth-reset.ts:8`). Hosted Supabase ignores `config.toml`/`templates/` (archive `plan.md:63,309`). Commit `bd56203` (Oct 11): "The hosted reset link puts the session in the URL hash". That is the default-template behaviour, a day after progress item 1.8 ("hosted template uses token_hash") was ticked against unrelated commit `adcc2fb`. Supabase docs (auth-email-templates): "`{{ .ConfirmationURL }}` … will be consumed instantly". | STRONG |
| 2: lifetime too short | Default email OTP expiry is 3600 s (docs, auth-email-passwordless); local `config.toml:233` `otp_expiry = 3600`. The user returned within minutes. The repo's `token_hash` template (`recovery.html:6`) only spends the token on submit (`confirm.ts:93`), so with it the link would have opened twice. A 15-minute lifetime would be *shorter* than today's. | NONE (as a cause) |
| 3: no way back to the form | `reset-password.astro:20` shows the new-password form only with `token_hash`, `recovery=1`, or a retry error. With a recovery cookie and no query, or after `?error=reset-link`, it shows the email form. The cookie from the first open is never offered back. But the user closed the tab and came in through the mail link, which hits dimension 1 first. | WEAK (contributing, not root) |
| 4: resend blocked by the limit | No custom SMTP anywhere in the repo or foundation docs. Supabase docs (rate-limits): "2 emails per hour with the built-in email provider", raisable only with custom SMTP or a Send Email hook. The limit is project-wide (`mail.go` `sendEmail`). There is also a 60 s per-user `/recover` cooldown. The error `over_email_send_rate_limit` maps to the generic "We could not send the reset email. Try again later." (`auth-reset.ts:64-69`, `reset-password.ts:21`), which gives no wait time. The resend UI already exists: an expired link shows the email form (`reset-password.astro:42-46`). | STRONG |

## Narrowing Signals

- The user returned within minutes, which is far inside the 1-hour expiry. That rules out lifetime as the cause.
- They re-clicked the *same mail link*, not the page URL. The error text matches the `otp_expired` hash path exactly, and not a submit-time failure.
- "Could only get another one after an hour" matches the built-in 2-per-hour project-wide email limit. The first request plus any other auth email in that hour, such as a sign-up confirmation, is enough to hit it.
- Requesting a new recovery email replaces the earlier token (GoTrue `sendPasswordRecovery`), so several outstanding links can never coexist.

## Cross-System Convention

Supabase's documented pattern is a `token_hash` link to the app, with `verifyOtp` called on POST, specifically so that a mail scanner or a first open does not spend the token. Production email goes through custom SMTP, because the built-in mailer is for testing. This repo already adopted the first half locally (archive plan, `recovery.html`). The hosted dashboard was apparently never switched, and no SMTP decision was ever recorded.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: production does not use the repo's reset-link design. The hosted recovery email still sends the default link, which spends the token on the first open. The built-in mailer's project-wide 2-per-hour limit then blocks the follow-up email, behind a generic error.

The link does not "expire too fast"; it is single-use from the first open. Making the hosted template match the repo's `token_hash` link makes reopening work for the whole existing lifetime (1 h by default). After that, choosing a lifetime such as 15 minutes is an independent security setting, not the fix. "Send a second link" already exists in the UI. What breaks it is the email quota, plus a message that does not tell the user to wait.

## Confidence

**HIGH** — strong code-level and documentation evidence, matches Supabase's own convention, and decisive narrowing signals (minutes, same link, one hour).

One cheap check before or at the start of planning: open a fresh production reset email and look at the link. If it points at `https://<ref>.supabase.co/auth/v1/verify?...`, the reframe is confirmed. If it already points at `/auth/reset-password?token_hash=...`, go back to frame. Also read the current Auth → Rate Limits, Email OTP Expiration, and SMTP settings in the dashboard.

## What Changes for /10x-plan

The plan should cover these:

- Make the hosted auth config match the repo: the recovery template, plus redirect URLs if needed. Make that drift visible or checkable so it cannot be silently "ticked" again.
- Decide how emails get past the built-in 2/hour limit (custom SMTP or another option).
- Make the rate-limited resend tell the user what happened and how long to wait.
- Treat the lifetime (keep 1 h vs set 15 min) as an explicit, separate setting.
- Optionally: when a valid recovery session already exists, return the user to the new-password form.

It should not be about extending a token's lifetime.

## References

- Source files: `supabase/templates/recovery.html:6`, `supabase/config.toml:196-198,229,233,250-252`, `src/pages/auth/reset-password.astro:17-20,42-46`, `src/components/auth/ResetPasswordHashError.tsx:7-8`, `src/lib/auth-reset.ts:8,19-26,64-69`, `src/pages/api/auth/reset-password.ts:16-21`, `src/pages/api/auth/reset-password/confirm.ts:93`, `src/lib/supabase.ts:34`
- Prior change: `context/archive/2026-10-10-handle-change-and-reset-pass/` (`plan.md:28,63,309,338`; `plan-brief.md:67`); commits `bd56203`, `adcc2fb`
- Supabase: GoTrue `internal/api/verify.go`, `internal/models/user.go` (`Recover`), `internal/api/mail.go`; docs `guides/auth/rate-limits`, `guides/auth/auth-email-templates`, `guides/auth/auth-email-passwordless`
- Investigation: Supabase-behaviour sub-agent; blind codebase sub-agent (independently reached hypotheses 1 and 4)
