# Forgot password and Profile password change Implementation Plan

## Overview

A signed-out person can request a password reset from sign-in and choose a new password from the email link. A signed-in trainee or trainer can change their password on Profile, in the menu between Measurements and Sign out. The reset link does not leave a session. The Profile change keeps this browser signed in and signs out the others.

## Current State Analysis

Sign-in is a card on `/auth/signin` (`src/pages/auth/signin.astro`). `SignInForm` posts `email` and `password` to `POST /api/auth/signin`, which calls `signInWithPassword` and redirects to `/measurements` or back to `/auth/signin?error=` (`src/pages/api/auth/signin.ts`). The only other link on the card is Sign up. There is no reset route, no `resetPasswordForEmail`, no `updateUser`, and no `verifyOtp` anywhere in `src/`.

The signed-in menu comes from `topbarModel` (`src/lib/topbar.ts`): Home, Measurements, then Sign out as a separate form in `TopbarActions`. Guest links are Home, Sign in, Sign up. `PROTECTED_ROUTES` is only `/measurements` (`src/middleware.ts`). There is no `/profile` page. The `profiles` table is the trainee/trainer role, unrelated to this screen.

Sign-up already requires a password of at least 6 characters and a matching confirmation on the client (`src/components/auth/SignUpForm.tsx`). Local Supabase uses the same minimum (`supabase/config.toml`). `secure_password_change` is false, so the app has to check the current password itself. `additional_redirect_urls` is only `http://localhost:4321`. `[auth.rate_limit] email_sent` is 2 per hour. A running local stack does not reload `config.toml` until `npx supabase stop` and `npx supabase start`. Mailpit is `http://127.0.0.1:54324`. Hosted auth settings are not in this repo.

## Desired End State

From sign-in, Forgot password opens `/auth/reset-password`. Submitting an email always shows "Check your email for a password reset link." when the send is accepted or the account is missing. The mail link opens that same page with a one-time token. Submitting a new password ends the recovery session and opens `/auth/signin` with "Your password was reset. Sign in with the new password." The old password fails. An expired or used link shows "This reset link is no longer valid." and the email form.

A signed-in user opens Profile between Measurements and Sign out. The form asks for the current password, the new password, and a confirmation. Success stays on `/profile` with "Your password was changed." Other sessions for that user are signed out. A wrong current password stays on Profile and leaves this session signed in.

### Key Discoveries:

- Auth APIs are POST form handlers that redirect. Server errors ride on `?error=`. There is no Zod on those routes (`src/pages/api/auth/signin.ts`).
- Sign out is rendered after the link list, so Profile is a third signed-in link (`src/components/TopbarActions.tsx`, `src/lib/topbar.ts`).
- Several `topbarModel` tests assert the signed-in link array exactly (`src/lib/topbar.test.ts`).
- `scripts/check-home-tokens.mjs` only scans a fixed file list. New views are ungated until they are added.
- Smoke keeps one cookie jar and finishes signed in as the original trainee with `password` (`scripts/smoke.mjs`). New password steps need their own user and jars.
- The default Supabase recovery link verifies on the auth server and returns a PKCE code tied to the browser that requested the mail. That signs the user in before they choose a password, and it fails on another device.

## What We're NOT Doing

- Any Profile section besides changing the password.
- Emailing the current password, or signing the person in from the reminder.
- Telling the visitor whether an email address has an account.
- Raising the 6-character minimum, or turning on `secure_password_change` or email confirmations.
- A password-changed notification email.
- Changing the guest menu.
- A Playwright test that opens Mailpit. The live link stays a manual check.
- Sending recovery mail from `scripts/smoke.mjs`.
- Committing hosted Supabase dashboard settings. Production redirect and template updates stay a manual check.

## Implementation Approach

`/auth/reset-password` is both the request page and the set-password page. The recovery template links to `{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery`. The page renders the set-password form when that token is present. `verifyOtp` runs only on the submit that also sets the new password, then the route signs that session out and redirects to sign-in. A mail client that only GETs the link does not consume the token and does not create a session.

Missing accounts use the same sent notice as a real send. Rate limits and other send failures stay visible. Profile is `/profile`, protected like Measurements, with the same password rules as sign-up. The current password is proved with `signInWithPassword` on the existing client. Failure leaves that session in place. Success replaces this browser's session, then other sessions are signed out. On success this browser stays on Profile.

## Critical Implementation Details

### Token lifetime

Call `verifyOtp` only on the password POST. A GET that verifies the token lets a mail client consume it while prefetching, and it writes a session before a new password exists. After a successful verify, sign out even when the password update fails, so the recovery session does not remain.

### Current password proof

Prove the current password with `signInWithPassword` on the cookie-backed client, using the session user's email. A failed call does not write a session, so the existing cookies stay. A successful call replaces this browser's session with a new one for the same user. Then call `updateUser` on that session, then `signOut({ scope: "others" })`.

### Recovery email shape

The default Supabase link verifies on the auth server and returns a PKCE code. The code verifier cookie lives on the browser that requested the reset, and exchanging the code signs the user in. The recovery template must use the `token_hash` link below. Hosted Supabase does not read `supabase/config.toml`. The hosted template and redirect allow list have to match, or production mail cannot finish this flow.

### Local mail budget

`email_sent` is 2 per hour. Smoke covers an unknown address and a dead token. It does not request a reset for an account that exists.

## Phase 1: Password reminder

### Overview

Sign-in gains Forgot password. `/auth/reset-password` requests the mail and accepts a new password from the link. An unknown address looks like a sent mail. An expired link offers another request. A finished reset returns to sign-in with the session ended.

### Changes Required:

#### 1. Sign-in entry and notice

**File**: `src/pages/auth/signin.astro`

**Intent**: Add the reminder entry and a success notice that is separate from the existing error line.

**Contract**: A "Forgot password?" link to `/auth/reset-password` sits above the Sign up line and uses the same classes as that link (`text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring`). `notice=password-reset` renders exactly "Your password was reset. Sign in with the new password." in `text-muted-foreground`. Any other `notice` value renders nothing. `error` stays the existing server-error display.

#### 2. Auth kitchen sink

**File**: `src/pages/kitchen-sink/auth.astro`

**Intent**: Keep the review copy of the sign-in card aligned with the product card.

**Contract**: The Default sign-in card includes the same Forgot password link. The focus-visible note includes that link in the tab order after the submit button and before the sign-up link.

#### 3. Recovery page

**File**: `src/pages/auth/reset-password.astro`

**Intent**: One public page for requesting a link and for setting the new password, using the sign-in shell.

**Contract**: `Layout`, `Topbar`, and the same `max-w-sm rounded-2xl border border-border bg-card p-8` card as sign-in. The heading is "Reset password". When `token_hash` and `type=recovery` are present and `error` is not `reset-link`, show the new-password form. `error=reset-link`, a missing token, or any other `type` shows the email form. `notice=reset-sent` renders exactly "Check your email for a password reset link." `error=reset-email` renders exactly "We could not send the reset email. Try again later." `error=reset-link` renders exactly "This reset link is no longer valid." `error=password-short` renders exactly "Password must be at least 6 characters." `error=password-mismatch` renders exactly "Passwords do not match." Notices use `text-muted-foreground`. Errors use the existing `ServerError` treatment. This GET does not call `verifyOtp` and does not write a session.

#### 4. Request and set-password forms

**File**: `src/components/auth/ResetPasswordRequestForm.tsx`

**File**: `src/components/auth/ResetPasswordForm.tsx`

**Intent**: Reuse the auth field, toggle, and submit pieces so client checks match sign-up.

**Contract**: The request form posts `email` to `POST /api/auth/reset-password`. Client messages match sign-in: "Email is required" and "Enter a valid email address". The set-password form posts `token_hash`, `type`, `password`, and `confirmPassword` to `POST /api/auth/reset-password/confirm`. Client messages match sign-up: "Password is required", "Password must be at least 6 characters", "Please confirm your password", and "Passwords do not match". Submit pending text is "Sending reset email..." or "Saving password...".

#### 5. Reset request route

**File**: `src/pages/api/auth/reset-password.ts`

**Intent**: Send the recovery email without revealing whether the address is registered, and without touching the current session.

**Contract**: `POST` reads `email`. A missing client redirects to `/auth/reset-password?error=reset-email`. `resetPasswordForEmail` uses `redirectTo` of the request origin plus `/auth/reset-password`. A pure helper maps the auth result: no error, and an error that means the account is missing, both redirect to exactly `/auth/reset-password?notice=reset-sent`. A rate limit or any other send failure redirects to exactly `/auth/reset-password?error=reset-email`. The helper is unit-tested with those three inputs. This route does not set or clear auth cookies.

#### 6. Set-password route

**File**: `src/pages/api/auth/reset-password/confirm.ts`

**Intent**: Turn a still-valid recovery token into a new password, then leave the visitor signed out.

**Contract**: `POST` reads `token_hash`, `type`, `password`, and `confirmPassword`. A missing token or a `type` other than `recovery` redirects to exactly `/auth/reset-password?error=reset-link` and does not call `verifyOtp`. A password shorter than 6 characters, or a confirmation that differs, redirects to `/auth/reset-password` with the same `token_hash`, `type=recovery`, and `error=password-short` or `error=password-mismatch`, and does not call `verifyOtp`. Otherwise call `verifyOtp({ token_hash, type: "recovery" })`, then `updateUser({ password })`, then `signOut()` on that session, then redirect to exactly `/auth/signin?notice=password-reset`. If verify fails, redirect to exactly `/auth/reset-password?error=reset-link` and write no session. If verify succeeds and `updateUser` fails, `signOut()` still runs, then redirect to `/auth/reset-password?error=reset-link`.

#### 7. Outcome helper

**File**: `src/lib/auth-reset.ts`

**Intent**: Keep the enumeration rule testable without calling GoTrue.

**Contract**: Export the request-result helper used by the reset route, and the fixed notice and error sentences used by the reset and sign-in pages, so the copy above has one source. Unit tests live next to it.

#### 8. Local recovery template and redirect

**File**: `supabase/templates/recovery.html`

**File**: `supabase/config.toml`

**Intent**: Make the local mail link open our page with a token hash, and allow that redirect.

**Contract**: `[auth.email.template.recovery]` points at `./supabase/templates/recovery.html`. The link href is exactly:

```html
{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery
```

`additional_redirect_urls` includes the exact URL `http://localhost:4321/auth/reset-password` and still includes `http://localhost:4321`. Do not change `email_sent`, `minimum_password_length`, `enable_confirmations`, or `secure_password_change`.

#### 9. Token gate and smoke

**File**: `scripts/check-home-tokens.mjs`

**File**: `scripts/smoke.mjs`

**Intent**: Cover the new views with the token gate, and prove the reminder redirects without sending mail.

**Contract**: Add the new reset page and both reset form components to the scanned file list. Smoke gains three checks that do not request a reset for an existing account: `GET /auth/signin` contains `Forgot password?` and `href="/auth/reset-password"`; a `POST /api/auth/reset-password` for an address with no account redirects to exactly `/auth/reset-password?notice=reset-sent`; a `POST /api/auth/reset-password/confirm` with an unusable token redirects to exactly `/auth/reset-password?error=reset-link`. Run the two POSTs on the existing end-of-file session and then assert `GET /measurements` is still 200, so a reminder cannot sign that user out. Do not change the existing steps' user, password, or cookie jar.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including the reset-request cases: no error and a missing account both mean sent, and a rate limit or other send failure means email-failed
- `npm run lint` passes
- `npm run check:home-tokens` passes with the new reset views on the scanned file list
- `npm run smoke` passes, including the unknown-email request, the dead reset link, and the existing session still on `/measurements`

#### Manual Verification:

- After a local Supabase restart, Mailpit shows one reset mail, its link opens the set-password form while `/measurements` still redirects to sign-in, saving a new password opens sign-in with the reset notice, the old password fails, and the new password opens `/measurements`
- Opening that same link again shows "This reset link is no longer valid." and the email form
- Requesting a reset for an address with no account shows "Check your email for a password reset link."
- The hosted project's recovery template uses the same `token_hash` link, and its redirect allow list includes the production origin plus `/auth/reset-password`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Profile password change

### Overview

Profile appears between Measurements and Sign out for every signed-in user. Changing the password requires the current password, keeps this browser on Profile, and signs out other sessions.

### Changes Required:

#### 1. Menu item

**File**: `src/lib/topbar.ts`

**File**: `src/lib/topbar.test.ts`

**Intent**: Put Profile in the signed-in menu without changing the guest menu or the greeting.

**Contract**: `TopbarLink` gains id `profile` and label `Profile`. Signed-in links are Home `/`, Measurements `/measurements`, Profile `/profile`, in that order, for trainee, trainer, and null role. `current` stays an exact pathname match, so `/profile` marks Profile. Guest links stay Home, Sign in, Sign up. Update every signed-in exact link expectation. Add a case that marks Profile on `/profile`. The trainer case asserts the same three links.

#### 2. Home kitchen sink

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Show the new signed-in bar state on the session-free review page.

**Contract**: The topbar section copy counts six product outcomes. Add a preview for a signed-in trainee on `/profile`: greeting "Hello," plus the sample email, Profile marked, href `/profile`.

#### 3. Profile page

**File**: `src/pages/profile.astro`

**Intent**: Give the password change a page of its own so later Profile sections have a place to land.

**Contract**: Same outer wrapper as `measurements.astro`: `Layout` title "Profile", `p-4 sm:p-8`, and `Topbar`. Below that, a centered card with the auth card classes. The page heading is "Profile". The section heading is "Change password". Both roles see this page. It does not read or write `profiles`. Sentences come from `src/lib/auth-reset.ts`, which gains the Profile lines in this phase. `notice=password-changed` renders exactly "Your password was changed." in `text-muted-foreground`. `error=current-password` renders exactly "Current password is incorrect." `error=password-unchanged` renders exactly "Your password was not changed." `error=password-short` renders exactly "Password must be at least 6 characters." `error=password-mismatch` renders exactly "Passwords do not match."

#### 4. Change-password form

**File**: `src/components/auth/ChangePasswordForm.tsx`

**Intent**: Collect the current password and the new pair with the same client rules as sign-up.

**Contract**: Posts `currentPassword`, `password`, and `confirmPassword` to `POST /api/auth/password`. There is no email field. Client messages: "Current password is required", plus the sign-up password and confirmation messages. Pending text is "Saving password...".

#### 5. Password route and protection

**File**: `src/pages/api/auth/password.ts`

**File**: `src/middleware.ts`

**Intent**: Change only the signed-in user's password, and only after the current password checks out.

**Contract**: `PROTECTED_ROUTES` includes `/profile` beside `/measurements`, so a signed-out `GET /profile` redirects to `/auth/signin`. The POST requires `context.locals.user`. When it is missing, redirect to `/auth/signin`. The address checked is that user's email. Prove `currentPassword` with `signInWithPassword` on the cookie-backed client. Failure redirects to exactly `/profile?error=current-password` and leaves the existing session in place. Success calls `updateUser({ password: newPassword })` on the session that sign-in just stored, then `signOut({ scope: "others" })`, then redirects to exactly `/profile?notice=password-changed`. Reject a new password shorter than 6 characters, or a confirmation that differs, before any auth call, redirecting to exactly `/profile?error=password-short` or `/profile?error=password-mismatch`. If `updateUser` fails, do not sign out other sessions, leave this session in place, and redirect to exactly `/profile?error=password-unchanged`.

#### 6. Token gate and smoke

**File**: `scripts/check-home-tokens.mjs`

**File**: `scripts/smoke.mjs`

**Intent**: Gate the new Profile view, and prove the password change against a real session without disturbing the existing smoke user.

**Contract**: Add `src/pages/profile.astro` and `src/components/auth/ChangePasswordForm.tsx` to the scanned file list. Beside the anonymous measurements redirect, `GET /profile` returns 302 to `/auth/signin`. Append steps that create a new user and two cookie jars. They must not change the existing `email`, `password`, or jar. Jar A and jar B both sign in. A's `POST` with the wrong current password redirects to exactly `/profile?error=current-password`, and B can still `GET /profile` with 200. A's `POST` with the right current password redirects to exactly `/profile?notice=password-changed`, A's next `GET /profile` is 200, and B's next `GET /profile` is 302 to `/auth/signin`. After A signs out, the old password redirects to `/auth/signin?error=` and the new password redirects to `/measurements`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including signed-in Profile after Measurements and guest links unchanged
- `npm run lint` passes
- `npm run check:home-tokens` passes with the Profile view on the scanned file list
- `npm run smoke` passes, including a wrong current password, a successful change, the other session ending, and the old password failing

#### Manual Verification:

- A trainee and a trainer each see Home, Measurements, Profile, Sign out, and Profile is marked on `/profile`
- A wrong current password leaves this browser on Profile and still signed in
- A successful change stays on Profile with "Your password was changed." and another browser signed in as the same user is sent to sign-in
- The home kitchen sink shows the Profile-marked bar

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Reset-request mapping: no error → sent; missing account → sent; rate limit or other send failure → email-failed.
- `topbarModel`: guest links unchanged; signed-in links are Home, Measurements, Profile for trainee, trainer, and null role; `/profile` marks Profile.

### Integration Tests:

- Smoke, against the running app and local Supabase: unknown-email reset notice, dead confirm link, existing session preserved, anonymous `/profile` redirect, wrong current password, successful change, second session rejected, old password rejected.
- Smoke does not send a recovery email to an existing account.

### Manual Testing Steps:

1. Restart local Supabase so the recovery template and redirect URL load. Request a reset for a real user. Open the Mailpit link at `http://127.0.0.1:54324`.
2. Before submitting, open `/measurements` in that browser and confirm it still redirects to sign-in.
3. Set a new password. Confirm sign-in shows the reset notice, the old password fails, and the new password opens `/measurements`.
4. Open the same mail link again. Confirm the invalid-link sentence and the email form.
5. Request a reset for an address that has no account. Confirm the sent sentence.
6. As a trainee and as a trainer, confirm the menu order and the marked Profile item.
7. Change the password with a wrong current password, then with the right one, from a second signed-in browser. Confirm the first browser stays on Profile and the second is sent to sign-in.
8. On the hosted project, set the recovery template to the `token_hash` link and allow the production `/auth/reset-password` URL.

## Performance Considerations

Each Profile change adds one `signInWithPassword` besides `updateUser`. Reset mail stays on Supabase's existing auth mail path. Local auth still allows two emails an hour, so repeated manual sends in that hour can be refused with "We could not send the reset email. Try again later."

## Migration Notes

No SQL migration. Existing sessions and passwords keep working. The previous Worker does not know `/profile` or `/auth/reset-password`; those URLs arrive with this Worker, so there is no old-code dependency on a new schema.

Local mail uses the new template only after `npx supabase stop` and `npx supabase start`. Hosted Supabase needs the same recovery template and the production redirect URL in the dashboard. Until that is done, production reset mail cannot complete this flow.

## References

- Issue: https://github.com/gmaszkiewicz/training-manager/issues/80
- Roadmap slice S-25 and MS-17: `context/foundation/roadmap.md`
- Sign-in redirect pattern: `src/pages/api/auth/signin.ts`
- Password rules: `src/components/auth/SignUpForm.tsx`
- Menu model: `src/lib/topbar.ts`
- Local auth limits: `supabase/config.toml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Password reminder

#### Automated

- [x] 1.1 `npm test` passes, including the reset-request cases: no error and a missing account both mean sent, and a rate limit or other send failure means email-failed
- [x] 1.2 `npm run lint` passes
- [x] 1.3 `npm run check:home-tokens` passes with the new reset views on the scanned file list
- [x] 1.4 `npm run smoke` passes, including the unknown-email request, the dead reset link, and the existing session still on `/measurements`

#### Manual

- [ ] 1.5 After a local Supabase restart, Mailpit shows one reset mail, its link opens the set-password form while `/measurements` still redirects to sign-in, saving a new password opens sign-in with the reset notice, the old password fails, and the new password opens `/measurements`
- [ ] 1.6 Opening that same link again shows "This reset link is no longer valid." and the email form
- [ ] 1.7 Requesting a reset for an address with no account shows "Check your email for a password reset link."
- [ ] 1.8 The hosted project's recovery template uses the same `token_hash` link, and its redirect allow list includes the production origin plus `/auth/reset-password`

### Phase 2: Profile password change

#### Automated

- [ ] 2.1 `npm test` passes, including signed-in Profile after Measurements and guest links unchanged
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run check:home-tokens` passes with the Profile view on the scanned file list
- [ ] 2.4 `npm run smoke` passes, including a wrong current password, a successful change, the other session ending, and the old password failing

#### Manual

- [ ] 2.5 A trainee and a trainer each see Home, Measurements, Profile, Sign out, and Profile is marked on `/profile`
- [ ] 2.6 A wrong current password leaves this browser on Profile and still signed in
- [ ] 2.7 A successful change stays on Profile with "Your password was changed." and another browser signed in as the same user is sent to sign-in
- [ ] 2.8 The home kitchen sink shows the Profile-marked bar
