---
date: 2026-09-29T19:10:50+02:00
researcher: Grok 4.7
git_commit: e60e203968663264e526a7903c22d4986ebc1512
branch: cursor/product-home
repository: training-manager
topic: "Which design-system charges apply when replacing the starter welcome on / with the Training Manager public home?"
tags: [research, codebase, product-home, welcome, tokens]
status: complete
last_updated: 2026-09-29
last_updated_by: Grok 4.7
---

# Research: Which design-system charges apply when replacing the starter welcome on / with the Training Manager public home?

**Date**: 2026-09-29T19:10:50+02:00
**Researcher**: Grok 4.7
**Git Commit**: e60e203968663264e526a7903c22d4986ebc1512
**Branch**: cursor/product-home
**Repository**: training-manager

## Research Question

For change `product-home` (roadmap S-07, MS-01), which design-system charges — missing tokens, missing shared component, accidental architecture — apply to the public page `/`, with a file, a line, and the effect on the visitor?

## Summary

On branch `cursor/product-home` at commit `e60e203`, `src/pages/index.astro` renders `Welcome.astro` inside `Layout.astro` and does not pass a title, so the document title stays the layout default `10x Astro Starter` (`src/layouts/Layout.astro:10`, `src/pages/index.astro:6-8`). The hero heading in that component is the same starter name (`src/components/Welcome.astro:22-26`). A visitor who opens `/` while signed out is not redirected: `PROTECTED_ROUTES` in `src/middleware.ts:4` is `["/dashboard"]`, and the redirect at `src/middleware.ts:18-21` runs when the path starts with that route and `context.locals.user` is missing.

The token values for this repo live in `src/styles/global.css` `:root` (`src/styles/global.css:6-39`), `.dark` (`src/styles/global.css:41-73`), and `@theme inline` (`src/styles/global.css:75-111`). A search of `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` for `bg-primary`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-background`, and `bg-destructive` returned no matches. On 2026-09-29, a Select-String pass over those three files with the hardcoded-value pattern (hex, `rgb`/`hsl`/`oklch`, arbitrary `px`/`rem` brackets, and Tailwind palette color utilities) returned 40 matches in `Welcome.astro`, 13 in `Topbar.astro`, and 0 in `index.astro`.

`src/components/ui/` contains `button.tsx` and `LibBadge.astro`. A search of `src` for `from "@/components/ui"` returned one match, `src/components/auth/SubmitButton.tsx:3`. The home CTAs are raw anchors (`src/components/Welcome.astro:29-39`).

Contract for the plan: extend this shadcn token file. Do not add a second palette, and do not run `shadcn init` again. `components.json` sets `"style": "new-york"` and `"ui": "@/components/ui"`.

## Charges

### 1. Missing tokens — active

`src/components/Welcome.astro:22` paints the heading with `from-blue-200 via-purple-200 to-pink-200`, and `src/components/Welcome.astro:31` paints Sign In with `bg-purple-600`. The page background is `bg-cosmic` (`src/components/Welcome.astro:5`), whose utility is a hex gradient `#0a0e1a, #0f1529, #0a0e1a` (`src/styles/global.css:113-115`). A visitor sees the starter's purple-blue page, and changing `--primary` in `:root` does not change this screen, because these classes do not reference that variable.

### 2. Missing shared component — active

Sign In and Sign Up on the home are `<a>` elements with hand-written button classes (`src/components/Welcome.astro:29-39`). The repo button is `Button` in `src/components/ui/button.tsx:35`, and its base classes include `focus-visible:ring-ring/50` (`src/components/ui/button.tsx:8`). Those home anchors have no `focus-visible` class, so a keyboard user on the home actions does not get the `--ring` treatment that `Button` already defines. `Button` accepts `asChild` (`src/components/ui/button.tsx:39-45`), so a link can use that component. The same gap is on the signed-out top bar links (`src/components/Topbar.astro:24-28`).

The three feature panels are separate copies of the same `div` (`src/components/Welcome.astro:46`, `src/components/Welcome.astro:68`, `src/components/Welcome.astro:91`). No `card` file is in `src/components/ui/` (that directory's listing in this pass is `button.tsx` and `LibBadge.astro`). A visitor reads three equal panels about authentication, the stack, and developer tooling (`src/components/Welcome.astro:62`, `src/components/Welcome.astro:85`, `src/components/Welcome.astro:107`) instead of one product explanation.

### 3. Accidental architecture — active

The visible page sells the starter: heading `10x Astro Starter` and the sentence about authentication, tooling, and a cosmic developer experience (`src/components/Welcome.astro:22-26`), and the browser title falls back to `10x Astro Starter` (`src/layouts/Layout.astro:10`) because `src/pages/index.astro:6-8` does not pass `title`. Someone who opens the site, or who signs out (`src/pages/api/auth/signout.ts:9` redirects to `/`), cannot tell this product records body measurements.

`/` stays public on purpose. The archived trainee-signup plan lists, as out of scope, "Redirecting every signed-in visit to `/` onto the journal. Home stays the public welcome" (`context/archive/2026-09-26-trainee-signup/plan.md:41`). Current sign-in still redirects to `/dashboard` (`src/pages/api/auth/signin.ts:19`). Replacing the starter copy on `/` is the change; sending signed-in visits from `/` to the journal is not.

### 4. Deferred — other screens that share `bg-cosmic`

`bg-cosmic` is also the shell class on `src/pages/dashboard.astro:73`, `src/pages/auth/signin.astro:9`, `src/pages/auth/signup.astro:9`, and `src/pages/auth/confirm-email.astro:6`. Editing the utility in `src/styles/global.css:113-115` would change those screens in the same edit. This change is one view (`/`). Leave the utility in place for those routes, and stop the home from depending on it.

### 5. Deferred — submit buttons and dark mode outside this view

`SubmitButton` imports `Button` and then passes `bg-purple-600` and `text-white` (`src/components/auth/SubmitButton.tsx:15-18`). That override is on the auth forms, not on `/`. `.dark` is defined (`src/styles/global.css:41-73`) and the dark variant is `(&:is(.dark *))` (`src/styles/global.css:4`). A search of `src` for `class="dark"` on `html` or `body` found no match in this pass, and `src/layouts/Layout.astro:14-21` does not set that class. There is no theme toggle to exercise, so wiring `.dark` is a later change.

`CLAUDE.md:37-38` tells agents to use `cn()` and to add shadcn components under `src/components/ui/` with `npx shadcn@latest add`. Those lines do not tell agents to use arbitrary palette values. A written ban on palette classes in views belongs to the later guard step, not to a pixel change on `/`.

## Detailed Findings

### Token source versus this view

`:root` stores role variables including `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--destructive`, `--border`, and `--ring` (`src/styles/global.css:6-25`). `@theme inline` publishes them as `--color-*` (`src/styles/global.css:80-97`), which is what makes utilities such as `bg-primary` exist. `.dark` repeats the same variable names with different values (`src/styles/global.css:41-59`).

`body` applies `bg-background text-foreground` (`src/styles/global.css:121-123`). `Welcome.astro` then covers the viewport with `bg-cosmic` (`src/components/Welcome.astro:5`), so the body token is not what the visitor sees on `/`.

A search of `src/**/*.{astro,tsx,ts,css}` for the strings `bg-card` and `text-muted-foreground` returned no matches. Those role utilities are defined by the theme block and unused in that searched set.

The home also sets an inline star-field gradient with three `rgba(255,255,255,…)` stops (`src/components/Welcome.astro:14`).

### Shared components

`Button` variants use semantic classes: default is `bg-primary text-primary-foreground` (`src/components/ui/button.tsx:12`). A search of `src` for `from "@/components/ui"` returned one match, the auth `SubmitButton` (`src/components/auth/SubmitButton.tsx:3`). A search of `src/**/*.{astro,tsx,ts,css}` for the string `LibBadge` returned no matches, so this pass did not find a consumer of `src/components/ui/LibBadge.astro`.

### Entry to `/`

Unauthenticated `/` calls `next()` after the dashboard guard (`src/middleware.ts:18-24`). `Welcome.astro:2` renders `Topbar`. When `Astro.locals.user` is absent, that bar shows "Not signed in" and links to sign-in and sign-up (`src/components/Topbar.astro:20-29`). When a user is present, the same bar shows the email and a Dashboard link (`src/components/Topbar.astro:6-11`). This research did not load `/` in a browser.

`Welcome.astro` is imported from `src/pages/index.astro:2`. This pass did not find a second import.

## Code References

- `src/pages/index.astro:1-8` — `/` renders `Welcome` inside `Layout` with no title prop
- `src/components/Welcome.astro:5` — `bg-cosmic` shell
- `src/components/Welcome.astro:14` — inline `rgba` star field
- `src/components/Welcome.astro:22-39` — starter heading and raw Sign In / Sign Up anchors
- `src/components/Welcome.astro:46` — first of three copied feature panels
- `src/components/Topbar.astro:5-28` — glass bar and palette-colored links
- `src/styles/global.css:6-111` — `:root`, `.dark`, `@theme inline`
- `src/styles/global.css:113-115` — `bg-cosmic` hex utility
- `src/components/ui/button.tsx:8-18` — `Button` focus ring and semantic variants
- `src/middleware.ts:4-24` — only `/dashboard` is protected
- `src/pages/api/auth/signout.ts:9` — sign-out redirects to `/`
- `src/pages/api/auth/signin.ts:19` — sign-in redirects to `/dashboard`
- `src/layouts/Layout.astro:10` — default title `10x Astro Starter`

## Architecture Insights

The public page and the journal are different routes. A successful sign-in redirects to `/dashboard` (`src/pages/api/auth/signin.ts:19`). Sign-out redirects to `/` (`src/pages/api/auth/signout.ts:9`). The starter motif (`bg-cosmic` plus purple and blue utilities) is also on the dashboard and auth shells, listed under deferred charge 4. Replacing the home means new markup on `/` that reads `src/styles/global.css` roles and `src/components/ui/button.tsx`, not an edit to the shared utility.

`context/foundation/prd.md` has no MS-01 and no public-home requirement. The closest access rule is "Unauthenticated users do not get the journal" (`context/foundation/prd.md:107`). The home outcome is the roadmap charter: MS-01 and S-07 (`context/foundation/roadmap.md:29`, `context/foundation/roadmap.md:151-160`).

## Historical Context (from prior changes)

- Supported, as a recorded exclusion: trainee-signup refused redirecting signed-in visits from `/` to the journal and kept the home as the public welcome (`context/archive/2026-09-26-trainee-signup/plan.md:41`). Current `src/middleware.ts:4` and `src/pages/api/auth/signin.ts:19` match that split.
- Supported, as a recorded intent: the same plan's phase text says replace the dashboard welcome stub with the empty journal (`context/archive/2026-09-26-trainee-signup/plan.md:128`). This research did not re-read the dashboard body. A grep of `src/pages/dashboard.astro` for `welcome` / `Welcome` / `10x Astro` hit greeting lines at `src/pages/dashboard.astro:81` and `src/pages/dashboard.astro:101`, and did not hit `10x Astro`. Those greetings are not the public starter page.
- Partial: S-07's risk line says the public home still describes the starter (`context/foundation/roadmap.md:160`). That matches `src/components/Welcome.astro:22-26` on this commit. The roadmap line does not describe signed-in behavior on `/` after the replacement. `src/components/Topbar.astro:6-18` is the current signed-in branch.

No `research.md` exists under `context/archive/` or other `context/changes/` folders in this pass (glob `context/**/research.md` returned no files).

## Related Research

Not applicable. No earlier `research.md` was found under `context/`.

## Open Questions

1. Signed-in `/` after the copy change — non-blocking. S-07 does not say whether a signed-in visitor sees the same explanation plus the existing Dashboard link (`src/components/Topbar.astro:6-11`) or a shorter signed-in state. The archived plan forbids redirecting that visit to the journal (`context/archive/2026-09-26-trainee-signup/plan.md:41`). The plan can keep the current top-bar split.
2. Sentence-level marketing copy beyond the roadmap outcome — non-blocking. S-07 already states the visitor sees what Training Manager does and how to sign in or sign up (`context/foundation/roadmap.md:153`). The vision recap names the up/down difference versus the previous entry and the trainer preview (`context/foundation/roadmap.md:32`).
