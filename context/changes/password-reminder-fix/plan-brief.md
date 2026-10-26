# Password Reminder Link Fix — Plan Brief

> Full plan: `context/changes/password-reminder-fix/plan.md`
> Frame brief: `context/changes/password-reminder-fix/frame.md`

## What & Why

> **The actual problem to plan around is**: production does not use the repo's reset-link design. The hosted recovery email still sends the default link, which spends the token on the first open. The built-in mailer's project-wide 2-per-hour limit then blocks the follow-up email, behind a generic error.

The user asked for a link that lasts a set time (e.g. 15 minutes) and for a way to send a second one. Both come from fixing the hosted config and the mailer, not from changing a lifetime in code.

## Starting Point

The repo's `token_hash` template (`supabase/templates/recovery.html:6`) only spends the token on submit, but it was never applied to the hosted project. The resend form already exists. A rate limit shows "We could not send the reset email. Try again later." (`src/lib/auth-reset.ts:64-69`).

## Desired End State

A production reset link can be opened, left and reopened for 15 minutes, and it comes from Resend. A second email can be requested within the hour, because the limit is now 30 per hour. When a limit does refuse a send, the user reads "Too many reset emails were requested. Wait N seconds and try again." or "Too many reset emails were sent. Try again in a few minutes." Hosted auth settings live in `config.toml`, and `supabase config diff` against production shows no differences.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Root cause | Hosted template spends the token on first open; mail limit blocks resend | Code, GoTrue and docs evidence; the user returned within minutes | Frame |
| Hosted config sync | `[remotes.production]` in `config.toml`, manual `config diff` → `config push` | Versioned and checkable, so a hosted setting can't be ticked without being applied; no unreviewed CI push | Plan |
| Email delivery | Custom SMTP via Resend, `email_sent = 30` | Supabase's production path; removes the 2-per-hour wall | Plan |
| Link lifetime | 15 minutes (`otp_expiry = 900`), local and production | Matches the request and shortens exposure of a link that can be reopened | Plan |
| Rate-limit message | Separate message, with wait seconds when Supabase gives them | Tells the user why and how long; falls back if the text changes | Plan |
| Return-to-form for a leftover recovery session | Out of scope | Only affects emails sent before the push | Plan |

## Scope

**In scope:**
- A rate-limited result, `reset-limit` page error and unit tests
- `otp_expiry = 900` and the `[remotes.production]` auth block (site URL, redirects, SMTP, rate limit, pinned production values)
- README runbook, a CLAUDE.md pointer, `RESEND_SMTP_PASS` in `.env.example`
- Resend domain setup, the reviewed push, and production verification

**Out of scope:**
- Auto-pushing config from Workers Builds or CI
- Returning a leftover recovery session to the new-password form
- A Send Email hook or another provider; changes to local Mailpit or `email_sent = 2` locally
- Smoke or Playwright steps that send real recovery mail
- Other email templates

## Architecture / Approach

There are no new routes and no data model change. The request route maps `over_email_send_rate_limit` and `over_request_rate_limit` to `?error=reset-limit&wait=N`, and the page renders the message. Production auth is declared in `config.toml`. The base block stays local; `[remotes.production]` overrides only what differs. One person runs the read-only diff, then the push, against the linked project.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Rate-limit message | A clear, tested limit message | Supabase changes its "after N seconds" wording; covered by the fallback |
| 2. Auth config as code | A 15-minute lifetime locally; production settings in git; runbook | The remote block's override behaviour is not officially documented |
| 3. Hosted rollout and verification | Resend SMTP, `token_hash` link and 30/h live on production | A push that changes unintended keys (site URL, confirmations) |

**Prerequisites:** a domain whose DNS you control, for Resend; a Supabase access token with access to the production project; Phase 1 deployed before the push.
**Estimated effort:** ~1–2 sessions: a small code change, then a supervised config rollout.

## Open Risks & Assumptions

- `config push` sends every declared key. Production values must be pinned in `[remotes.production]` until the diff shows only the intended changes, and `SUPABASE_AUTH_*` env vars must be unset when pushing.
- `otp_expiry` is shared, so production signup-confirmation and email-change links also expire after 15 minutes.
- The production project ref is committed in `config.toml`. It is already part of the production `SUPABASE_URL`.
- Emails sent before the push still carry the old link until they expire.

## Success Criteria (Summary)

- A production reset link reopened within 15 minutes still opens the new-password form.
- A second reset email within the hour arrives. When a limit refuses one, the user is told why and how long to wait.
- `npx supabase config diff` against production is empty after the push.
