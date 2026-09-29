---
date: 2026-09-29T20:09:58+02:00
researcher: Grok 4.7
git_commit: b53ae33d0e889ce7793d026820ad3dabc1503ac4
branch: main
repository: training-manager
topic: "Which design-system charges apply to the sign-in form, and which of them also sit on the copied sign-up shell?"
tags: [research, codebase, auth-signin-form, tokens, signin]
status: complete
last_updated: 2026-09-29T20:14:07+02:00
last_updated_by: Grok 4.7
last_updated_note: Include /auth/confirm-email in the same shell charge; the dashboard shell stays deferred.
---

# Research: Which design-system charges apply to the sign-in form, and which of them also sit on the copied sign-up shell?

**Date**: 2026-09-29T20:09:58+02:00
**Researcher**: Grok 4.7
**Git Commit**: b53ae33d0e889ce7793d026820ad3dabc1503ac4
**Branch**: main
**Repository**: training-manager

## Research Question

For change `auth-signin-form`, which design-system charges — missing tokens, missing shared component, accidental architecture — apply to `/auth/signin`, with a file, a line, and the effect on the person signing in? The request also names the registration form. Which of those charges are the same markup copied onto `/auth/signup`?

## Summary

Contract variant: existing design system. Role values live in `src/styles/global.css` `:root` (`src/styles/global.css:6-39`), `.dark` (`src/styles/global.css:41-73`), and `@theme inline` (`src/styles/global.css:75-111`). Shared components live in `src/components/ui`. On this inspection that directory contains `button.tsx` and `LibBadge.astro` and does not contain Input, Label, or Card. `components.json` sets `"style": "new-york"` and `"cssVariables": true`. Extend this system. Do not add a second palette, and do not run `shadcn init` again.

The named view is `/auth/signin`. A hardcoded-value scan of the six files that render that view — `src/pages/auth/signin.astro`, `src/components/auth/SignInForm.tsx`, `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`, `src/components/auth/PasswordToggle.tsx` — returned 25 matches (7, 0, 9, 4, 3, and 2). A search of `src/pages/auth/signin.astro` and `src/components/auth` for `bg-primary`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-background`, `text-destructive`, and `text-card-foreground` returned no matches. Changing `--primary` does not change this screen.

`CLAUDE.md` already tells agents to use those tokens and `src/components/ui`, and names the home kitchen sink at `/kitchen-sink/home`. The rule does not invite arbitrary values. The check that enforces the rule, `scripts/check-home-tokens.mjs`, lists five home files and does not list the auth files.

Sign-up copies the sign-in card. The same scan returned 7 matches in `src/pages/auth/signup.astro` and 5 in `src/components/auth/SignUpForm.tsx`. `SignUpForm.tsx` also sets `accent-purple-400` on the two role radios (`src/components/auth/SignUpForm.tsx:152`, `src/components/auth/SignUpForm.tsx:168`); that class sits outside the scan pattern. Treat the copied shell as the same charge. The dashboard shell stays deferred.

Superseded on 2026-09-29: the previous sentence in this summary deferred `confirm-email` together with the dashboard. The follow-up below puts `/auth/confirm-email` on this charge. The dashboard deferral stands.

`FormField`, `SubmitButton`, and `ServerError` are also imported by `src/components/measurements/MeasurementForm.tsx:3-5`, which renders inside the cosmic dashboard card (`src/pages/dashboard.astro:73`, `src/pages/dashboard.astro:86`). A field restyle that assumes a light `bg-card` surface will sit on that dark glass until the dashboard leaves `bg-cosmic`.

## Charges

### 1. Missing tokens — sign-in shell — active

`src/pages/auth/signin.astro:9` sets `bg-cosmic`. `src/pages/auth/signin.astro:10` sets `border-white/10 bg-white/10 text-white`. `src/pages/auth/signin.astro:11` sets `from-blue-200 to-purple-200`. `src/pages/auth/signin.astro:15` sets `text-blue-100/60`. `src/pages/auth/signin.astro:17` sets `text-purple-300`. The person signing in sees the starter glass card and a blue-to-purple heading. Editing `--primary` does not change this screen, because these classes do not reference that variable.

The same five classes are copied at `src/pages/auth/signup.astro:9-17`. `/auth/confirm-email` copies the shell with the same scan classes at `src/pages/auth/confirm-email.astro:6` (`bg-cosmic`), `src/pages/auth/confirm-email.astro:7` (`border-white/10 bg-white/10 text-white`), `src/pages/auth/confirm-email.astro:9` (`from-blue-200 to-purple-200`), `src/pages/auth/confirm-email.astro:12` (`text-blue-100/80`), and `src/pages/auth/confirm-email.astro:15` (`text-purple-300`). One charge, three routes. The page has no fields: after a sign-up that returns no session, `src/pages/api/auth/signup.ts:32` redirects here.

### 2. Missing tokens — field, error, and focus — active

`src/components/auth/FormField.tsx:6` sets `bg-white/10 text-white` and `focus:outline-none`. `src/components/auth/FormField.tsx:39` sets `text-blue-100/80`. `src/components/auth/FormField.tsx:56` sets `border-red-400/60 focus:ring-red-400` or `border-white/20 focus:ring-purple-400`. `src/components/auth/FormField.tsx:62` sets `text-red-300`. `src/components/auth/ServerError.tsx:11` sets `border-red-500/30 bg-red-900/30 text-red-300`. `src/components/auth/PasswordToggle.tsx:13` sets `text-white/40 hover:text-white/70` and has no focus ring.

A person who submits an empty email sees a red glass message, and keyboard focus on the field is a purple ring. Neither uses `destructive` or `--ring`. The password control's name is present (`aria-label` at `src/components/auth/PasswordToggle.tsx:14`); its focus treatment is not.

### 3. Missing shared component — submit paints over Button — active

`src/components/auth/SubmitButton.tsx:3` imports `Button` from `src/components/ui/button.tsx`. `src/components/auth/SubmitButton.tsx:18` then sets `bg-purple-600 text-white hover:bg-purple-500`. The Sign in control looks like the starter purple button. The home actions use `Button` without that override (`src/components/home/HomeActions.tsx:14`). Pending state still uses the spinner at `src/components/auth/SubmitButton.tsx:22`, including `border-white/30`.

### 4. Missing shared component — raw input and raw card — active

`src/components/auth/FormField.tsx:44` renders a native `<input>` with the classes in charge 2. `src/pages/auth/signin.astro:10` renders the panel as a `div`. On this inspection, `src/components/ui` has `button.tsx` and `LibBadge.astro` and does not have Input, Label, or Card. The person signing in gets a one-off field and a one-off panel. Add a missing control with `npx shadcn@latest add` (input, and label if the field uses it). A Card is optional: product-home kept a `div` and applied role classes, and that path stays available here.

`src/components/auth/SignUpForm.tsx:141` and `src/components/auth/SignUpForm.tsx:157` render native radios with `accent-purple-400`. Same charge on the registration form.

### 5. Accidental architecture — shared fields and a home-only check — active

`src/components/measurements/MeasurementForm.tsx:3-5` imports `FormField`, `ServerError`, and `SubmitButton`. The dashboard still wraps that form in `bg-cosmic` (`src/pages/dashboard.astro:73`) and glass text (`src/pages/dashboard.astro:74`). If those three components move to light-surface role colors while the dashboard card stays dark glass, the trainee cannot read the measurement fields.

`scripts/check-home-tokens.mjs:7-13` scans five home files. A palette class added on the sign-in view does not fail that check. `CLAUDE.md` already forbids literal colours in views; the check does not cover this view.

Logged-out entry is not this charge. `src/middleware.ts:4` protects `/dashboard` and `src/middleware.ts:20` redirects an anonymous request to `/auth/signin`, which renders the form. A direct open of `/auth/signin` renders the same form. `?error=` is passed into `ServerError` (`src/pages/auth/signin.astro:5`, `src/pages/auth/signin.astro:14`).

## Detailed Findings

### Token source and who reads it

`body` applies `bg-background text-foreground` (`src/styles/global.css:121-123`). `signin.astro` then covers the viewport with `bg-cosmic` (`src/pages/auth/signin.astro:9`). The utility is a hex gradient `#0a0e1a, #0f1529, #0a0e1a` (`src/styles/global.css:113-115`).

A search of `src` for `class="dark"`, `className="dark"`, and a `.dark` selector found the selector and `@custom-variant` in `src/styles/global.css:4` and `src/styles/global.css:41` and no other file. On this inspection, no view adds the `dark` class, so the `.dark` block is not what `/auth/signin` shows.

Home files that already use role classes include `src/components/Topbar.astro:7` (`border-border bg-card text-muted-foreground`), `src/components/Welcome.astro:14` (`text-muted-foreground`), and `src/components/home/HomeActions.tsx:1` (`Button`). The sign-in files in the Summary search do not.

### Callers of the auth primitives

On this inspection, importers of `FormField` are `src/components/auth/SignInForm.tsx:3`, `src/components/auth/SignUpForm.tsx:3`, and `src/components/measurements/MeasurementForm.tsx:3`. Importers of `SubmitButton` are those three forms at `SignInForm.tsx:5`, `SignUpForm.tsx:5`, and `MeasurementForm.tsx:5`. Importers of `ServerError` match that same set (`SignInForm.tsx:6`, `SignUpForm.tsx:6`, `MeasurementForm.tsx:4`). `PasswordToggle` is imported by `SignInForm.tsx:4` and `SignUpForm.tsx:4`.

A search of `src` for `bg-cosmic` found the utility plus `src/pages/auth/signin.astro:9`, `src/pages/auth/signup.astro:9`, `src/pages/auth/confirm-email.astro:6`, and `src/pages/dashboard.astro:73`.

### States already present in code

Default is the glass card. Hover on the submit control is `hover:bg-purple-500` (`src/components/auth/SubmitButton.tsx:18`). Focus on the input is `focus:ring-2` plus a purple or red ring (`src/components/auth/FormField.tsx:6`, `src/components/auth/FormField.tsx:56`), which is `focus`, not `focus-visible`. Disabled is `disabled={pending}` on `Button` (`src/components/auth/SubmitButton.tsx:17`); `button.tsx` includes `disabled:opacity-50` (`src/components/ui/button.tsx:8`). Error copy exists for an empty email (`src/components/auth/SignInForm.tsx:21`) and for `serverError`. Empty, for this form, is the initial `""` state (`src/components/auth/SignInForm.tsx:13`). Loading is the pending label and spinner (`src/components/auth/SubmitButton.tsx:20-23`). None of those states is rendered on a kitchen-sink route for this view. The existing sink is `/kitchen-sink/home` (`src/pages/kitchen-sink/home.astro`).

## Code References

- `src/pages/auth/signin.astro:9-17` — cosmic shell, glass card, gradient heading, purple link
- `src/pages/auth/signup.astro:9-17` — same shell
- `src/pages/auth/confirm-email.astro:6-15` — same shell, no fields; 7 scan matches
- `src/pages/api/auth/signup.ts:32` — redirect here when sign-up returns no session
- `src/components/auth/FormField.tsx:6` — glass input base and `focus:outline-none`
- `src/components/auth/FormField.tsx:56` — red or purple focus ring
- `src/components/auth/SubmitButton.tsx:18` — purple override on `Button`
- `src/components/auth/ServerError.tsx:11` — red glass server message
- `src/components/auth/PasswordToggle.tsx:13-14` — white icon button, accessible name, no focus ring
- `src/components/auth/SignUpForm.tsx:152` — `accent-purple-400` on the trainee radio
- `src/styles/global.css:113-115` — `bg-cosmic` hex utility
- `src/components/measurements/MeasurementForm.tsx:3-5` — journal form imports the auth primitives
- `scripts/check-home-tokens.mjs:7-13` — token check file list

## Architecture Insights

The public home already left the cosmic shell. Auth and the dashboard did not. `FormField` is the shared input for sign-in, sign-up, and the journal, so its colors are not private to `/auth/signin`.

The plan can add Input (and Label) through `npx shadcn@latest add` because `components.json` already points `ui` at `@/components/ui`. That is an extension of this system, not a second init. Card remains a choice: add it the same way, or put `bg-card text-card-foreground border-border` on the existing `div`, which is what the home top bar does.

Do not edit `@utility bg-cosmic` in this change. Superseded on 2026-09-29: this paragraph used to say confirm-email still depends on that utility, so the plan should leave the page alone. The follow-up includes the page. The plan stops `/auth/confirm-email` from using the utility, the same way it stops sign-in and sign-up. `src/pages/dashboard.astro:73` still depends on it.

## Historical Context (from prior changes)

- `context/archive/2026-09-29-product-home/research.md` — Supported on this point: charge 4 deferred `bg-cosmic` on sign-in, sign-up, confirm-email, and dashboard, and told that change to stop `/` from depending on the utility rather than edit it. The home has since moved to role tokens (`src/components/Welcome.astro:14`, `src/components/Topbar.astro:7`). The four deferred routes still reference `bg-cosmic` at the lines in Code References and `src/pages/auth/confirm-email.astro:6`.
- `context/archive/2026-09-29-product-home/plan.md` — Supported on this point: the plan refused to edit `:root`, `.dark`, or `bg-cosmic`, and refused to add Card. Those constraints still match the files above. This change can add Input without contradicting that plan, because that plan was scoped to `/`.
- `context/archive/2026-09-29-product-home/reviews/impl-review.md` — Supported on this point: the token check was narrowed to home files, and a later note says a palette class outside that list leaves `npm run check:home-tokens` green. `scripts/check-home-tokens.mjs:7-13` still lists the home set.

## Related Research

- `context/archive/2026-09-29-product-home/research.md` — token audit of `/`, including the deferred auth shells

## Follow-up (2026-09-29)

The request now includes the email confirmation page. A hardcoded-value scan of `src/pages/auth/confirm-email.astro` returned 7 matches: `border-white`, `bg-white`, and `text-white` on line 7; `from-blue` and `to-purple` on line 9; `text-blue` on line 12; `text-purple` on line 15. Line 6 is `bg-cosmic`. A search of that file for the role classes listed in the Summary returned no matches.

The page is static copy plus one link (`src/pages/auth/confirm-email.astro:15`). It does not import `FormField`, `SubmitButton`, or `ServerError`. Hover and focus apply to that link. Disabled, error, empty, and loading do not apply on this page: there is no control to disable, no error slot, no data list, and no pending state. The envelope character on line 8 is content, not a color literal.

This supersedes the deferral of `confirm-email` in the Summary and in Architecture Insights. The dashboard shell stays deferred.

## Open Questions

- Whether the sign-in panel becomes a shadcn Card or a `div` with `bg-card`. Both stay inside the current system. The plan picks one.
- How the plan keeps `MeasurementForm` readable if `FormField`, `ServerError`, or `SubmitButton` change color. The dashboard card is still dark glass. That is a constraint, not a second view to restyle.
