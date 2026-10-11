# Forgot password and Profile password change — Plan Brief

> Full plan: `context/changes/handle-change-and-reset-pass/plan.md`

## What & Why

A person who forgot their password can ask for a reset link from sign-in and choose a new password from that email. A signed-in trainee or trainer can change their password from Profile, in the menu between Measurements and Sign out. Profile stays a small page so later account settings have a place to land.

## Starting Point

Sign-in posts email and password to `/api/auth/signin` and the card only links to Sign up. The signed-in menu is Home, Measurements, and Sign out. Nothing in the app sends a reset email or updates a password. Sign-up already requires at least 6 characters. Local Supabase can deliver mail to Mailpit, and it allows two of those emails an hour.

## Desired End State

Forgot password on sign-in opens a reset page. Submitting an email shows the same check-your-inbox notice whether or not an account exists. The mail link opens that page, the new password is saved, and the visitor returns to sign-in signed out. The old password no longer works. An expired link shows an error and the email form again.

Profile sits between Measurements and Sign out. The change form asks for the current password. Success stays on Profile. Other signed-in browsers for that user are sent to sign-in.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Reminder | Email a reset link and set a new password in the app | A forgotten password is replaced, and the old one stops working |
| Current password | Required on Profile, checked before the update | An open browser session alone must not be able to change the password |
| After Profile change | Stay on Profile and sign out other sessions | This browser keeps working, and a leftover phone session ends |
| After email reset | Sign out and return to sign-in | The email link must not leave a standing session or open the journal |
| Unknown email | Same check-your-inbox notice | The form must not reveal which addresses are registered |
| Expired link | Error plus the email form on the recovery page | Another email can be requested without going back to sign-in |
| When the token is checked | Only on submit of the new password | A mail client that only opens the link must not consume it or create a session |
| Smoke and mail | Smoke never requests a reset for a real account | Local auth allows two recovery emails an hour |

## Scope

**In scope:**

- Forgot password on the sign-in card and the auth kitchen sink
- `/auth/reset-password` for the request and for setting the new password
- Local recovery template using `token_hash`, plus the local redirect allow list
- `/profile` in the signed-in menu, protected, with only the password form
- Smoke for the unknown email, a dead link, and the Profile change including a second session
- A manual hosted-template check

**Out of scope:**

- Further Profile settings, email change, and a password-changed notification
- Revealing whether an email is registered
- A stronger password rule than the existing 6 characters
- Sending recovery mail from smoke, or a Playwright Mailpit test
- Editing hosted Supabase settings from the repo

## Architecture / Approach

The recovery email points at `/auth/reset-password?token_hash=…&type=recovery`. The page shows the set-password form, and the server verifies the token only when that form is submitted, updates the password, signs out, and redirects to sign-in. Profile posts the current password, the new password, and a confirmation. The current password is checked with `signInWithPassword` on the existing client. A wrong password leaves the session in place. A correct one replaces this browser's session, updates the password, and signs the other sessions out.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Password reminder | Reset request, set-password from the link, enumeration-safe notice, expired-link retry | A prefetch or an early verify could consume the token or leave a session |
| 2. Profile password change | Profile in the menu, current password required, this browser stays, other sessions end | A successful check replaces this browser's session before the other sessions are signed out |

**Prerequisites:** S-08 and S-11 are done. Local Supabase must be restarted before the new recovery template is used. The hosted template and redirect URL are a manual follow-through on phase 1.
**Estimated effort:** About two sessions, one per phase.

## Open Risks & Assumptions

- Hosted Supabase ignores `supabase/config.toml`. Until the dashboard template and redirect allow list match, production reset mail cannot finish this flow.
- Repeating the manual Mailpit check inside the same hour can hit the local limit of two emails and show the send-failure sentence.
- A scanner that submits the reset form could consume the token. A scanner that only opens the link does not.

## Success Criteria (Summary)

- From sign-in, a reset email leads to a new password, sign-in shows the reset notice, and the old password fails.
- An unknown email and a real email show the same sent notice. An expired link can request another email on the same page.
- Profile, between Measurements and Sign out, changes the password for the signed-in user, keeps this browser signed in, and signs the other browsers out.
