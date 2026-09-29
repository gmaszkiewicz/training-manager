# Product home — Plan Brief

> Full plan: `context/changes/product-home/plan.md`
> Research: `context/changes/product-home/research.md`

## What & Why

`/` still introduces 10x Astro Starter. A visitor, including someone who just signed out, cannot tell this product records body measurements. S-07 replaces that welcome with Training Manager's own public home.

## Starting Point

The page is `Welcome.astro` inside `Layout`, with a cosmic shell, palette-colored anchors, and three starter cards. Role tokens and `Button` already exist and this view does not use them. `/dashboard` is the only protected route. Sign-out returns to `/`.

## Desired End State

Signed out, `/` shows Training Manager, one paragraph about the measurement difference and the trainer preview, and Sign in plus Sign up. Signed in, the same paragraph stays, the hero drops those two actions, and the bar keeps email, Dashboard, and Sign out. The tab title is Training Manager. Dashboard and auth stay on the cosmic shell.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Route | `/` stays public; no redirect to the journal | A prior plan left signed-in visits on the home, and sign-in already opens `/dashboard` | Research |
| Tokens | Read existing roles; do not edit values or `bg-cosmic` | The utility is shared with dashboard and auth | Research |
| Components | Existing `Button`; no Card | The three starter panels are removed, not rebuilt | Research |
| Signed-in `/` | Same explanation; no Sign in or Sign up in the hero; bar keeps email, Dashboard, and Sign out | Chosen so the hero has no dead auth actions and the journal link stays on the bar | Plan |
| Title | `title="Training Manager"` on `index.astro` only | Other pages already pass their own titles | Research |
| Visual gate | Kitchen sink at `/kitchen-sink/home` | The repo has no screenshot test | Plan |
| Copy | English paragraph locked in the plan | The surrounding UI labels are English | Plan |

## Scope

**In scope:**

- Home action island using `Button`
- Token note in the change folder
- Replacement of the starter markup on `/` and the bar
- Kitchen sink, a home-only token check in CI, and a short UI block in `CLAUDE.md`

**Out of scope:**

- Redirecting signed-in `/` to `/dashboard`
- Dashboard, auth, `SubmitButton`, `bg-cosmic`, and dark mode
- Card, a new palette, Playwright, and a new lint dependency

## Architecture / Approach

The server page reads `Astro.locals.user` and passes `signedIn` into a React island, the same `client:load` pattern as the sign-in form. The island renders `Button` links. Sign out remains a submit button in the existing sign-out form. The home uses background, foreground, muted, primary, border, and ring. It does not use `bg-cosmic`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Library | `HomeActions` on the existing `Button` | A second button primitive sneaks in |
| 2. Tokens | A note of the roles, values untouched | Editing `bg-cosmic` restyles dashboard and auth |
| 3. View | The Training Manager home and bar | Signed-in hero still shows Sign in |
| 4. States | Kitchen sink, CI check, agent rule | Sign-out island no longer submits the form |

**Prerequisites:** S-07 is `ready`. `Button` and the token file are already in the repo. No new package.
**Estimated effort:** one implementation pass across 4 phases.

## Open Risks & Assumptions

- A React submit button inside the Astro sign-out form must still post to `/api/auth/signout`. If hydration breaks that, keep the submit control in Astro and style it only through `Button`'s classes by rendering `Button` in place, not as a detached control.
- `/kitchen-sink/home` is public and unlinked. It is review evidence, not a product route.
- The paragraph text is fixed in the plan. Changing the wording later is a plan edit, not an implementer choice.

## Success Criteria (Summary)

- A signed-out visitor can tell what Training Manager does and can open sign-in or sign-up.
- A signed-in visitor sees that same explanation, no hero auth actions, and can open Dashboard or sign out back to this page.
- The home files no longer use the starter palette, and dashboard plus auth are unchanged.
