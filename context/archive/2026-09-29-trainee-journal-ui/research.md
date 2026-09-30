---
date: 2026-09-29T21:24:14+02:00
researcher: Grok 4.7
git_commit: 4fdc52eb5d840746ee31141d8a1f93818140eeb0
branch: main
repository: training-manager
topic: "Which design-system charges apply to the trainee journal on /dashboard?"
tags: [research, codebase, trainee-journal, dashboard, tokens]
status: complete
last_updated: 2026-09-29
last_updated_by: Grok 4.7
---

# Research: Which design-system charges apply to the trainee journal on /dashboard?

**Date**: 2026-09-29T21:24:14+02:00
**Researcher**: Grok 4.7
**Git Commit**: 4fdc52eb5d840746ee31141d8a1f93818140eeb0
**Branch**: main
**Repository**: training-manager

## Research Question

For change `trainee-journal-ui`, which design-system charges — missing tokens, missing shared component, accidental architecture — apply to the trainee journal on `/dashboard`, with a file, a line, and the effect on the trainee?

## Summary

On branch `main` at commit `4fdc52eb5d840746ee31141d8a1f93818140eeb0`, a signed-in trainee's journal is the `role === "trainee"` branch in `src/pages/dashboard.astro:78-97`, rendered inside the shared shell at `src/pages/dashboard.astro:73-76`. That shell is `bg-cosmic` plus a glass card (`border-white/10`, `bg-white/10`, `text-white`) and a heading painted with `from-blue-200 to-purple-200` (`src/pages/dashboard.astro:73-75`). The same page's sign-in sibling already uses `border-border bg-card text-card-foreground` (`src/pages/auth/signin.astro:10-11`).

Contract for the plan: extend the existing shadcn token file. Values live in `src/styles/global.css` `:root` (`src/styles/global.css:6-39`), `.dark` (`src/styles/global.css:41-73`), and `@theme inline` (`src/styles/global.css:75-111`). Do not add a second palette, and do not run `shadcn init` again.

On 2026-09-29, a Select-String pass with the hardcoded-value pattern (hex, `rgb`/`hsl`/`oklch`, arbitrary `px`/`rem` brackets, and Tailwind palette color utilities) returned 29 matches on 19 lines in `src/pages/dashboard.astro`, 4 matches on 3 lines in `src/components/measurements/MeasurementList.astro`, and 0 matches in `src/components/measurements/MeasurementForm.tsx`. A search of `src/pages/dashboard.astro` for `bg-primary`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-background`, and `text-destructive` returned no matches. `MeasurementForm.tsx` already uses those role classes (`src/components/measurements/MeasurementForm.tsx:18`, `src/components/measurements/MeasurementForm.tsx:74`, `src/components/measurements/MeasurementForm.tsx:118`).

`src/components/ui/` in this pass contains `button.tsx`, `input.tsx`, `label.tsx`, and `LibBadge.astro`. There is no `card.tsx` and no `textarea.tsx`.

## Charges

### 1. Missing tokens — active

`src/pages/dashboard.astro:73` paints the journal with `bg-cosmic`, whose utility is the hex gradient `#0a0e1a, #0f1529, #0a0e1a` (`src/styles/global.css:113-115`). The card around the journal is `border-white/10 bg-white/10 text-white` (`src/pages/dashboard.astro:74`), and the heading is `from-blue-200 to-purple-200` (`src/pages/dashboard.astro:75`). Welcome, empty, and load-failure copy use `text-blue-100/80` or `text-blue-100/50` (`src/pages/dashboard.astro:80`, `src/pages/dashboard.astro:89`, `src/pages/dashboard.astro:95`). Each measurement row uses `border-white/10 bg-white/5`, `text-white`, and `text-blue-100/80` (`src/components/measurements/MeasurementList.astro:28`, `src/components/measurements/MeasurementList.astro:29`, `src/components/measurements/MeasurementList.astro:48`).

A trainee who just signed in sees the starter glass page, with a token-colored form card sitting inside it (`src/components/measurements/MeasurementForm.tsx:118` is `border-border bg-card`). Changing `--primary` in `:root` does not change this shell or the list, because those classes do not reference that variable. The load-failure sentence uses the same `text-blue-100/80` as the welcome line (`src/pages/dashboard.astro:80` and `src/pages/dashboard.astro:95`), while a field error already uses `text-destructive` (`src/components/measurements/MeasurementForm.tsx:74`), so a failed load reads as a caption.

The role classes to use are the ones on the sign-in card: `border-border bg-card text-card-foreground` and `text-muted-foreground` (`src/pages/auth/signin.astro:10-13`). `body` already applies `bg-background text-foreground` (`src/styles/global.css:121-123`).

### 2. Missing shared component — active

Sign out is a raw `<button>` with glass classes (`src/pages/dashboard.astro:165-169`). `Button` already defines the focus ring, hover, and disabled opacity (`src/components/ui/button.tsx:8-12`), and the journal's submit control already uses it through `SubmitButton` (`src/components/auth/SubmitButton.tsx:3`, `src/components/auth/SubmitButton.tsx:17`). A keyboard user on Sign out does not get that component's ring.

The date field is a raw `<input>` with a local `controlClass`, and its label is a raw `<label>` (`src/components/measurements/MeasurementForm.tsx:17-18`, `src/components/measurements/MeasurementForm.tsx:120-134`). The note is a raw `<textarea>` with the same class and a raw label (`src/components/measurements/MeasurementForm.tsx:156-169`). Weight and circumferences already go through `FormField`, which renders `Label` and `Input` (`src/components/auth/FormField.tsx:38-43`). `FormField` requires an `icon` (`src/components/auth/FormField.tsx:17`), so date and note cannot use that wrapper without a decorative icon. Date can use `Input` and `Label` directly. This pass found no `textarea.tsx` under `src/components/ui/`; the note control should be added with `npx shadcn@latest add textarea` rather than keeping `controlClass`.

Do not add a `Card` for this view. The centered panel the journal should match is a `div` with token classes (`src/pages/auth/signin.astro:10`), and `src/components/ui/` has no card file. List rows should use those same role classes (charge 1), not a new card primitive.

### 3. Accidental architecture — active

One shell wraps both roles. `src/pages/dashboard.astro:73-76` opens the glass card, the trainee branch starts at `src/pages/dashboard.astro:78`, and the trainer branch starts at `src/pages/dashboard.astro:98`. Editing that wrapper's classes changes the trainer panel in the same edit. The trainee branch needs its own shell that reads the tokens from charge 1. The trainer branch stays on the current glass markup until its own change.

Someone who opens `/dashboard` logged out is redirected to `/auth/signin` (`src/middleware.ts:4`, `src/middleware.ts:18-21`). That entry is already guarded. This charge is the shared shell, not the redirect.

The page passes `title="Dashboard"` (`src/pages/dashboard.astro:72`), so the document title is not the layout default `10x Astro Starter` (`src/layouts/Layout.astro:10`).

`CLAUDE.md` already tells agents where tokens and components live and forbids literal colours in views (`CLAUDE.md:47-49`). This pass did not find a rule that invites arbitrary palette values. The journal shell and list ignore that rule. `scripts/check-home-tokens.mjs` lists `MeasurementForm.tsx` (`scripts/check-home-tokens.mjs:23`) and does not list `dashboard.astro` or `MeasurementList.astro` (the `FILES` array is `scripts/check-home-tokens.mjs:7-23`), so the glass classes are not gated.

### 4. Deferred — trainer-only markup in the same file

These lines render when `role === "trainer"` (`src/pages/dashboard.astro:98`) and are outside this view: the trainer welcome and error (`src/pages/dashboard.astro:100-103`), the link form (`src/pages/dashboard.astro:108-123`), the trainee links (`src/pages/dashboard.astro:134-135`), the trainer empty and load-failure sentences (`src/pages/dashboard.astro:146`, `src/pages/dashboard.astro:151`), and the trainees-load failure (`src/pages/dashboard.astro:158`). Reason: one view per change. The trainer panel gets its own change after this one.

`MeasurementList` is also rendered for a selected trainee (`src/pages/dashboard.astro:148`). Charge 1 still applies to that component, because the trainee journal renders it at `src/pages/dashboard.astro:91`. A trainer who already has entries will see the restyled list inside the old shell until the trainer change. That side effect is accepted here; duplicating the list to avoid it is not.

### 5. Deferred — `bg-cosmic` utility and a theme toggle

Leave `@utility bg-cosmic` in place (`src/styles/global.css:113-115`) while the trainer branch still uses the shell that references it (`src/pages/dashboard.astro:73`). A search of `src` for `bg-cosmic` in this pass returned those two hits. Home no longer uses it (`src/components/Welcome.astro:8` is `bg-background text-foreground`).

A search of `src` for `class="dark"`, `className="dark"`, and `class='dark'` returned no matches. `.dark` values exist (`src/styles/global.css:41-73`). Wiring a toggle is not this view.

## Detailed Findings

### Token source versus this view

`:root` stores role variables including `--primary`, `--background`, `--foreground`, `--card`, `--muted`, `--destructive`, `--border`, and `--ring` (`src/styles/global.css:6-25`). `@theme inline` publishes them as `--color-*` (`src/styles/global.css:80-97`). `.dark` repeats the same names with different values (`src/styles/global.css:41-59`).

The form's inner card and the measurement `FormField`s already read that system. The page shell, the empty sentence, the load-failure sentence, the sign-out button, and `MeasurementList` do not.

### What a trainee sees in each data branch

When `measurementsLoaded` is true and `entries.length === 0`, the branch renders the form and the sentence "No measurements yet" (`src/pages/dashboard.astro:83-89`). When `entries.length > 0`, it renders `MeasurementList` (`src/pages/dashboard.astro:91`). When `measurementsLoaded` is false, it renders "Could not load your measurements" and does not render the form (`src/pages/dashboard.astro:94-96`). This pass did not find a separate loading branch in that markup. Submit pending is `SubmitButton`, which disables `Button` while the form posts (`src/components/auth/SubmitButton.tsx:13-17`).

### Shared components the journal already reaches

`MeasurementForm` imports `FormField`, `ServerError`, and `SubmitButton` (`src/components/measurements/MeasurementForm.tsx:3-5`). It does not import from `@/components/ui`. `ServerError` uses `border-destructive`, `bg-destructive/10`, and `text-destructive` (`src/components/auth/ServerError.tsx:11`). `dashboard.astro` does not import from `@/components/ui`.

`Input` includes `focus-visible:border-ring` and `aria-invalid:border-destructive` (`src/components/ui/input.tsx:12-13`). The date `controlClass` sets `focus-visible:ring-ring` and adds `border-destructive` only through `cn` when that field has an error (`src/components/measurements/MeasurementForm.tsx:18`, `src/components/measurements/MeasurementForm.tsx:133`). It does not set `aria-invalid`.

## Code References

- `src/pages/dashboard.astro:72-97` — journal title, glass shell, trainee branch
- `src/pages/dashboard.astro:165-169` — raw Sign out button, outside both role branches
- `src/components/measurements/MeasurementList.astro:26-48` — glass list rows
- `src/components/measurements/MeasurementForm.tsx:17-18` — local `controlClass`
- `src/components/measurements/MeasurementForm.tsx:118-178` — token card, raw date and note, token submit
- `src/pages/auth/signin.astro:9-16` — centered card already on role tokens
- `src/styles/global.css:6-115` — tokens, `@theme inline`, `bg-cosmic`
- `src/components/ui/button.tsx:8-17` — `Button` focus ring and default variant
- `src/components/ui/input.tsx:5-18` — `Input`
- `src/middleware.ts:4-21` — `/dashboard` redirects when no user
- `scripts/check-home-tokens.mjs:7-23` — token scan that includes the form and excludes the shell and the list
- `CLAUDE.md:47-51` — token path, component path, kitchen sinks for home and auth

## Architecture Insights

The nearest migrated centered screen is sign-in, not the public home. Home is a full-width `bg-background` page with `Topbar` (`src/components/Welcome.astro:7-10`). Sign-in is a centered `max-w-sm` card without `bg-cosmic` (`src/pages/auth/signin.astro:9-10`). The journal is a centered `max-w-2xl` glass card (`src/pages/dashboard.astro:73-74`) with no `Topbar`. Matching sign-in's role classes on a shell that belongs to the trainee branch is the change. Matching the home hero is not.

There is no journal kitchen sink. This pass found `src/pages/kitchen-sink/home.astro` and `src/pages/kitchen-sink/auth.astro`. The states phase of the plan needs one for this view. `CLAUDE.md:50-51` names the home and auth sinks and does not name a journal sink.

## Historical Context (from prior changes)

- Supported, as a constraint that the current shell still shows: S-08's risk says that slice must not restyle the dashboard shell (`context/foundation/roadmap.md:175`). `src/pages/dashboard.astro:73` still uses `bg-cosmic`. S-08 status in that file is `done` (`context/foundation/roadmap.md:176`).
- Contradicted, for the auth screens on this commit: the same risk sentence says the three auth screens still use the starter glass card (`context/foundation/roadmap.md:175`). A search of `src` for `bg-cosmic` returned `src/styles/global.css:113` and `src/pages/dashboard.astro:73`. `src/pages/auth/signin.astro:9-10` uses `border-border bg-card` and does not include `bg-cosmic`.
- Supported, as the reason the form is already clean: `scripts/check-home-tokens.mjs:23` includes `MeasurementForm.tsx`, and the Select-String pass on that file returned 0 matches. The shell and the list are outside that array.
- Partial, as a description of an older tree: `context/archive/2026-09-29-product-home/research.md` describes `Welcome.astro` at commit `e60e203` as the starter gradient. This pass read `src/components/Welcome.astro:8` on `4fdc52eb5d840746ee31141d8a1f93818140eeb0` and it uses `bg-background text-foreground`.

No `context/foundation/lessons.md` was found in this pass (glob for that path returned no file).

## Related Research

- `context/archive/2026-09-29-product-home/research.md` — charges for `/` before that view moved onto tokens
- `context/archive/2026-09-29-auth-signin-form/research.md` — charges for the auth screens; the form token scan above is the part that still constrains this change

## Open Questions

None that block a plan. The trainer shell stays deferred (charge 4). The list component is in scope (charge 1), including the side effect on a trainer who is previewing entries.
