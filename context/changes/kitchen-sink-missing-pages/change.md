---
change_id: kitchen-sink-profile
title: Kitchen sinks for profile, sign-up, and reset password
status: new
created: 2026-10-24
updated: 2026-10-24
archived_at: null
---

## Notes

Add public review surfaces for the product pages that still lack a kitchen sink: `/profile`, `/auth/signup`, and `/auth/reset-password`.

- Profile: change-password card and Topbar; Cover ChangePasswordForm states (default, server error, success notice, loading/disabled). The home sink already shows only the Profile-marked Topbar preview.
- Sign-up: SignUpForm shell and states; today auth sink only links to `/auth/signup`.
- Reset password: request form, sent notice, new-password form, and link/hash error paths; today auth sink only links "Forgot password?".

List each new sink in CLAUDE.md and `scripts/check-home-tokens.mjs` like the existing sinks. Prefer extending `/kitchen-sink/auth` for signup and reset-password when that keeps one auth review surface; use a dedicated `/kitchen-sink/profile` for the profile page.

https://github.com/gmaszkiewicz/training-manager/issues/127
