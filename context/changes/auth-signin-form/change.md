---
change_id: auth-signin-form
title: Sign-in form reads the existing design tokens
status: implementing
created: 2026-09-29
updated: 2026-09-29
archived_at: null
---

## Notes

modyfikacja wygladu formularza logowania oraz rejestracji

View: `/auth/signin` (`src/pages/auth/signin.astro`, `src/components/auth/SignInForm.tsx`).
Token source: existing system in `src/styles/global.css` (`:root` / `.dark`, published via `@theme inline`). Shared components: `src/components/ui`.

Sign-up (`src/pages/auth/signup.astro`) and email confirmation (`src/pages/auth/confirm-email.astro`) copy the same card. This change names sign-in as the one view. The duplicated shell is the same charge, not a second motif. The dashboard shell stays out of this change.

Roadmap: S-08 in `context/foundation/roadmap.md`. Change ID `auth-signin-form`. Scope anchor MS-02.
