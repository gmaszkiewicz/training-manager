# Password Reminder Link Fix Implementation Plan

## Overview

Make production send the repo's `token_hash` reset link so that opening the link does not use it up. The link stays valid for 15 minutes. Move auth email to custom SMTP (Resend) so a second link can be sent within the hour, and tell the user plainly when a send limit refused the email and how long to wait. The hosted auth settings become versioned in `supabase/config.toml` under a `[remotes.production]` override and are applied through a reviewed `supabase config diff` → `supabase config push`.

## Current State Analysis

The frame (`context/changes/password-reminder-fix/frame.md`, confidence HIGH) settled the cause:

- The repo's recovery template already links to `{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery` (`supabase/templates/recovery.html:6`). That link spends the token only on the password submit (`src/pages/api/auth/reset-password/confirm.ts:93`), so it can be opened any number of times until it expires or is used.
- Hosted Supabase never received that template. Its default `{{ .ConfirmationURL }}` verifies, and so spends, the token on the first GET. A second open returns `#error=access_denied&error_code=otp_expired`. `ResetPasswordHashError.tsx:7-8` turns that into "This reset link is no longer valid." Item 1.8 of the archived `handle-change-and-reset-pass` plan was ticked without the hosted template ever being changed, and that plan scoped hosted settings out.
- Lifetime is not the cause. The default email OTP expiry is 3600 s (`supabase/config.toml:233`), and the user came back within minutes.
- A second link is blocked by the built-in mailer's project-wide limit of 2 emails per hour. There is also a 60 s per-user `/recover` cooldown. Both arrive as `over_email_send_rate_limit`. `resetRequestResult` maps it to `email-failed` (`src/lib/auth-reset.ts:64-69`), and the user reads "We could not send the reset email. Try again later." (`src/pages/api/auth/reset-password.ts:21`).
- The resend UI already exists: an expired link lands on the email form (`src/pages/auth/reset-password.astro:42-46`).

## Desired End State

- A production reset email links to `<production origin>/auth/reset-password?token_hash=…&type=recovery`, is sent through Resend, and can be opened, left and reopened for 15 minutes. Once it is older than 15 minutes, saving a password from it shows "This reset link is no longer valid." and the email form.
- A visitor can request another reset email within the hour. The project-wide limit is 30 emails per hour.
- When a send limit refuses the email, the page shows a rate-limit message. It includes the wait in seconds when Supabase gives one. Other send failures keep "We could not send the reset email. Try again later."
- `npx supabase config diff` against the linked production project shows no differences, and the README tells a maintainer how to review and push hosted auth settings.

### Key Discoveries:

- `supabase config push` (CLI 2.121.0, `npx supabase config push --help`) pushes **every property `config.toml` declares**. It shows the diff and prompts for each resource. `supabase config diff` is read-only.
- The base `[auth]` block is local-only: `site_url = "http://localhost:4321"` (`supabase/config.toml:158`), `enable_confirmations = false` (`:224`), `email_sent = 2` (`:197`). The README says production may turn confirmations on in the dashboard (`README.md:141`). A push without overrides would point production emails at localhost and could turn confirmation off.
- Reported but not officially documented: a `[remotes.<name>]` block whose `project_id` matches the linked ref overrides auth values for that project only. `SUPABASE_AUTH_*` environment variables beat the remote block. A key missing from the file may be pushed as a CLI default.
- Smoke covers the unknown-email request and a dead token (`scripts/smoke.mjs:973-987`). By design it does not send recovery mail for a real account.
- `resetRequestResult` already has unit tests for the rate-limit code (`src/lib/auth-reset.test.ts:15-28`). Those expectations change in Phase 1.

## What We're NOT Doing

- Sending a user who has a leftover recovery session back to the new-password form. Once the hosted template sends the `token_hash` link, the recovery hash path only remains for emails sent before the push.
- Pushing hosted auth settings automatically from Workers Builds or GitHub Actions. `scripts/workers-build.mjs` stays unchanged.
- Configuring hosted settings by hand in the dashboard without a matching `config.toml` entry.
- A Send Email hook or any provider other than Resend.
- Changing local mail. Local Supabase keeps Mailpit and `email_sent = 2`.
- Sending recovery mail from `scripts/smoke.mjs`, or a Playwright test that opens a mailbox.
- Revealing whether an email address has an account. `user_not_found` still reads as sent.
- Changing the other email templates (signup confirmation, email change, magic link).

## Implementation Approach

Code first, then config, then rollout. Phase 1 is a self-contained, deployable code change: a Worker with the new message works with either mailer. Phase 2 commits the production settings to `config.toml` and documents the push. It does not touch the hosted project. Phase 3 is the one outward-facing step. Pin production's current values until a read-only diff shows only the intended changes, then push, then verify on production.

## Critical Implementation Details

### Pin production before the first push

Run `npx supabase config diff` against the linked production project before writing the remote block, and copy every production value that differs from the base config into `[remotes.production]`. The only exceptions are the intended changes: the recovery template, `otp_expiry`, SMTP, `email_sent`, and the reset redirect URL if it is missing. Repeat until the diff lists only those. Unset any `SUPABASE_AUTH_*` variables in the shell first, because they override the remote block.

### OTP expiry is shared

`otp_expiry` covers every email OTP, not only recovery. With 900 s, production signup confirmation and email-change links also expire after 15 minutes. That is accepted as part of the lifetime decision. The README states it next to the setting.

## Phase 1: Rate-limit message

### Overview

A reset request refused by a send limit gets its own result, its own page error, and the wait in seconds when Supabase supplies it.

### Changes Required:

#### 1. Reset result and copy

**File**: `src/lib/auth-reset.ts`

**Intent**: Tell a rate limit apart from other send failures, and pull out the per-user cooldown seconds so the page can say how long to wait.

**Contract**: `ResetRequestResult` gains `"rate-limited"`. `resetRequestResult(error: { code?: string | null; message?: string | null } | null)` returns `"rate-limited"` for `over_email_send_rate_limit` and `over_request_rate_limit`. `user_not_found` and no error stay `"sent"`, and everything else stays `"email-failed"`. A new `resetWaitSeconds(message)` returns the positive integer from Supabase's "…only request this after N seconds" text, or `null`. A new `resetLimitError(wait: number | null)` returns:

- `wait` 1 → "Too many reset emails were requested. Wait 1 second and try again."
- `wait` N > 1 → "Too many reset emails were requested. Wait N seconds and try again."
- `null` → "Too many reset emails were sent. Try again in a few minutes."

The fallback string is exported as `RESET_LIMIT_ERROR`. Example: `resetWaitSeconds("For security purposes, you can only request this after 52 seconds.")` → `52`. Use a tolerant match such as `/after (\d+) seconds?/`.

#### 2. Request route

**File**: `src/pages/api/auth/reset-password.ts`

**Intent**: Send a rate-limited request to the reset page with its own error code and optional wait.

**Contract**: `"rate-limited"` → `authPage(context, "/auth/reset-password?error=reset-limit[&wait=N]", resetLimitError(N))`, with `wait` present only when `resetWaitSeconds` found one. `"sent"` and `"email-failed"` redirects stay unchanged.

#### 3. Reset page

**File**: `src/pages/auth/reset-password.astro`

**Intent**: Show the rate-limit message above the email form.

**Contract**: With `error=reset-limit`, `serverError` is `resetLimitError(wait)`. `wait` comes from the `wait` query and is accepted only as a positive integer; anything else is treated as `null`. The email form stays the visible form.

#### 4. Tests

**File**: `src/lib/auth-reset.test.ts`

**Intent**: Pin the new mapping and wording.

**Contract**: Update the existing rate-limit case: `over_email_send_rate_limit` and `over_request_rate_limit` → `"rate-limited"`, `unexpected_failure` → `"email-failed"`. Add cases: `resetWaitSeconds` for "after 52 seconds", "after 1 second", a message with no number, and `null`. `resetLimitError` for 1, 52 and `null` with the exact strings above.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including the rate-limited mapping, the wait-seconds parsing, and the exact rate-limit messages for 1, 52 and no wait
- `npm run lint` passes
- `npx astro check` passes
- `npm run smoke` passes against a running local server, including the unknown-email request and the dead reset link

#### Manual Verification:

- Locally, two reset requests for the same existing account less than 60 s apart show "Too many reset emails were requested. Wait N seconds and try again." on the second, with the email form still shown
- Locally, a third reset email within the hour shows the wait message or "Too many reset emails were sent. Try again in a few minutes.", never "We could not send the reset email. Try again later."
- `/auth/reset-password?error=reset-limit&wait=abc` shows "Too many reset emails were sent. Try again in a few minutes."

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Auth config as code

### Overview

`config.toml` holds the 15-minute lifetime locally and the full production auth configuration under `[remotes.production]`. The README explains how to review and push it. Nothing is pushed in this phase.

### Changes Required:

#### 1. Local lifetime

**File**: `supabase/config.toml`

**Intent**: Local reset links expire after 15 minutes, as in production.

**Contract**: `[auth.email] otp_expiry = 900`. The comment above it states that this covers every email OTP.

#### 2. Production remote block

**File**: `supabase/config.toml`

**Intent**: Declare the hosted project's auth settings in git, overriding only what differs from local.

**Contract**: A `[remotes.production]` block with `project_id = "<production project ref>"` (the subdomain of the production `SUPABASE_URL`), plus:

- `[remotes.production.auth]`: `site_url` = production origin. `additional_redirect_urls` = production's current list, which must include `<production origin>/auth/reset-password`.
- `[remotes.production.auth.email]`: `otp_expiry = 900`, plus every production value that differs from the base block (at least `enable_confirmations` as production has it).
- `[remotes.production.auth.email.smtp]`: `enabled = true`, `host = "smtp.resend.com"`, `port = 465`, `user = "resend"`, `pass = "env(RESEND_SMTP_PASS)"`, `admin_email` = a sender address on the verified Resend domain, `sender_name = "Training Manager"`.
- `[remotes.production.auth.rate_limit]`: `email_sent = 30`.
- The recovery template is inherited from the base `[auth.email.template.recovery]`. If the reviewed diff shows the remote does not inherit it, repeat it under `[remotes.production.auth.email.template.recovery]`.

Exact production values (ref, origin, redirect list, pinned keys) come from the dashboard and from the read-only `config diff`. See "Pin production before the first push".

#### 3. Runbook

**File**: `README.md` (Supabase Configuration section), `CLAUDE.md` (Environment), `.env.example`

**Intent**: Make hosted auth drift visible and the push repeatable, so a hosted setting can no longer be ticked off without being applied.

**Contract**: The README gets a "Hosted auth settings" subsection covering the following:

- Settings live in `[remotes.production]`.
- Steps: `npx supabase link --project-ref <ref>`, unset `SUPABASE_AUTH_*`, export `RESEND_SMTP_PASS`, `npx supabase config diff`, review that only intended keys change, `npx supabase config push`, then `config diff` again, which must show no differences.
- The 15-minute shared OTP expiry and the 30-per-hour limit.
- Never push from CI.

`CLAUDE.md` Environment gets one line pointing to it. `.env.example` gains an empty `RESEND_SMTP_PASS=`.

### Success Criteria:

#### Automated Verification:

- `npx supabase stop && npx supabase start` starts the local stack with the edited `config.toml`
- `npm run lint` passes
- `npm run smoke` passes against a running local server
- `git grep -n "RESEND_SMTP_PASS" -- supabase/config.toml .env.example README.md` lists all three files, and no SMTP password value is committed

#### Manual Verification:

- After the local restart, the Mailpit reset link opens the new-password form, reopening the same link opens it again, and saving a new password opens sign-in with the reset notice
- A local reset link opened more than 15 minutes after it was sent shows "This reset link is no longer valid." and the email form on save
- A reviewer reading the README can say which command is read-only, which writes to production, and which keys the remote block is allowed to change

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Hosted rollout and verification

### Overview

Set up Resend, review the diff until only the intended changes remain, push to production, and check the reported journey on the real site. Phase 1 should be live on production before this push, so a hit limit already shows the new message.

### Changes Required:

#### 1. Resend sender

**File**: none (Resend dashboard and DNS)

**Intent**: A verified sending domain and an API key used as the SMTP password.

**Contract**: The Resend domain is verified with its SPF and DKIM records. The API key exists only in the pusher's shell as `RESEND_SMTP_PASS`. `admin_email` in the remote block uses that domain.

#### 2. Reviewed push

**File**: `supabase/config.toml` (pinned values only, if the diff shows more)

**Intent**: Apply exactly the intended hosted changes.

**Contract**: The `config diff` before the push lists only the recovery template, `otp_expiry`, SMTP, `email_sent`, and the reset redirect URL if it was missing. `config push` is confirmed per resource. A `config diff` after the push shows no differences. Any pinned values added to `config.toml` are committed.

### Success Criteria:

#### Automated Verification:

- `npx supabase config diff` against the linked production project reports no differences after the push
- `npm run lint` passes

#### Manual Verification:

- Before the push, a fresh production reset email's link points at `https://<ref>.supabase.co/auth/v1/verify?…`
- Before the push, the reviewed `config diff` lists only the recovery template, `otp_expiry`, SMTP, `email_sent`, and the reset redirect URL
- After the push, a production reset email arrives from the Resend domain with a link to `<production origin>/auth/reset-password?token_hash=…&type=recovery`
- On production, opening the link, closing the tab, and reopening the same email link within 15 minutes shows the new-password form; saving opens sign-in with the reset notice
- On production, a reset link older than 15 minutes shows "This reset link is no longer valid." on save, and an immediate new request delivers a new email
- On production, three reset requests for different accounts within one hour all deliver an email
- On production, two reset requests for the same account less than 60 s apart show the wait message with seconds on the second
- Sign-up and sign-in on production behave as before the push, including the email-confirmation setting

**Implementation Note**: This phase writes to the production auth configuration. Pause for the human to review the diff before running `config push`.

---

## Testing Strategy

### Unit Tests:

- `resetRequestResult`: no error and `user_not_found` → sent; both rate-limit codes → rate-limited; any other code → email-failed.
- `resetWaitSeconds`: 52 seconds, 1 second, no number, null.
- `resetLimitError`: 1 → singular "second", 52 → plural, null → fallback.

### Integration Tests:

- Existing smoke: unknown-email request looks sent; a dead token redirects to `?error=reset-link`. No smoke step sends recovery mail for a real account.

### Manual Testing Steps:

1. Local: send a reset email, open it, close it, reopen it, then save a password.
2. Local: request twice within 60 s for one account and read the wait message.
3. Production, before the push: inspect a reset email's link host.
4. Production, after the push: repeat steps 1–2, then let a link pass 15 minutes and resend.

## Performance Considerations

None. Each reset request still makes one auth call. The page reads one extra query parameter.

## Migration Notes

No SQL migration. The previous Worker keeps working with the new hosted settings: it shows the generic send error for a rate limit and handles the `token_hash` link already. Emails sent before the push still carry the default link and the hash fallback until they expire. Rollback means reverting the remote block to the pinned previous values and running `config push`. Worker rollback does not touch auth settings.

## References

- Frame: `context/changes/password-reminder-fix/frame.md`
- Prior change: `context/archive/2026-10-10-handle-change-and-reset-pass/plan.md` (Recovery email shape, Local mail budget, item 1.8)
- Roadmap slice S-37, MS-29: `context/foundation/roadmap.md`
- Reset code: `src/lib/auth-reset.ts:64-91`, `src/pages/api/auth/reset-password.ts:16-21`, `src/pages/auth/reset-password.astro:10-21`
- Config: `supabase/config.toml:154-252`, `supabase/templates/recovery.html:6`
- Remote override examples (practitioner, not official docs): https://github.com/mhacks/dashboard/blob/main/supabase/config.toml, https://github.com/supabase/cli/pull/7074

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Rate-limit message

#### Automated

- [x] 1.1 `npm test` passes, including the rate-limited mapping, the wait-seconds parsing, and the exact rate-limit messages for 1, 52 and no wait
- [x] 1.2 `npm run lint` passes
- [x] 1.3 `npx astro check` passes
- [x] 1.4 `npm run smoke` passes against a running local server, including the unknown-email request and the dead reset link

#### Manual

- [ ] 1.5 Locally, two reset requests for the same existing account less than 60 s apart show "Too many reset emails were requested. Wait N seconds and try again." on the second, with the email form still shown
- [ ] 1.6 Locally, a third reset email within the hour shows the wait message or "Too many reset emails were sent. Try again in a few minutes.", never "We could not send the reset email. Try again later."
- [ ] 1.7 `/auth/reset-password?error=reset-limit&wait=abc` shows "Too many reset emails were sent. Try again in a few minutes."

### Phase 2: Auth config as code

#### Automated

- [ ] 2.1 `npx supabase stop && npx supabase start` starts the local stack with the edited `config.toml`
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run smoke` passes against a running local server
- [ ] 2.4 `git grep -n "RESEND_SMTP_PASS" -- supabase/config.toml .env.example README.md` lists all three files, and no SMTP password value is committed

#### Manual

- [ ] 2.5 After the local restart, the Mailpit reset link opens the new-password form, reopening the same link opens it again, and saving a new password opens sign-in with the reset notice
- [ ] 2.6 A local reset link opened more than 15 minutes after it was sent shows "This reset link is no longer valid." and the email form on save
- [ ] 2.7 A reviewer reading the README can say which command is read-only, which writes to production, and which keys the remote block is allowed to change

### Phase 3: Hosted rollout and verification

#### Automated

- [ ] 3.1 `npx supabase config diff` against the linked production project reports no differences after the push
- [ ] 3.2 `npm run lint` passes

#### Manual

- [ ] 3.3 Before the push, a fresh production reset email's link points at `https://<ref>.supabase.co/auth/v1/verify?…`
- [ ] 3.4 Before the push, the reviewed `config diff` lists only the recovery template, `otp_expiry`, SMTP, `email_sent`, and the reset redirect URL
- [ ] 3.5 After the push, a production reset email arrives from the Resend domain with a link to `<production origin>/auth/reset-password?token_hash=…&type=recovery`
- [ ] 3.6 On production, opening the link, closing the tab, and reopening the same email link within 15 minutes shows the new-password form; saving opens sign-in with the reset notice
- [ ] 3.7 On production, a reset link older than 15 minutes shows "This reset link is no longer valid." on save, and an immediate new request delivers a new email
- [ ] 3.8 On production, three reset requests for different accounts within one hour all deliver an email
- [ ] 3.9 On production, two reset requests for the same account less than 60 s apart show the wait message with seconds on the second
- [ ] 3.10 Sign-up and sign-in on production behave as before the push, including the email-confirmation setting
