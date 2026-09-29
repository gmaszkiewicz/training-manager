# Product home Implementation Plan

## Overview

Replace the public starter welcome on `/` with a Training Manager page. A visitor sees what the product does and can sign in or sign up. A signed-in visitor sees the same explanation, without those two actions in the hero, and uses the bar to open the journal or sign out.

## Current State Analysis

`src/pages/index.astro` renders `Welcome.astro` inside `Layout` and does not pass a title, so the document title stays `10x Astro Starter` (`src/layouts/Layout.astro:10`). The hero, the purple-blue palette, the star field, and three starter feature panels live in `src/components/Welcome.astro`. The bar in `src/components/Topbar.astro` already splits signed-out links from email, Dashboard, and Sign out.

Role tokens already exist in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`). This view does not use them. It uses `bg-cosmic`, a hex utility that dashboard and the auth pages also use. The shared button is `src/components/ui/button.tsx`. The home actions are raw anchors. There is no Card component, and this plan does not add one.

Middleware protects only `/dashboard`. Sign-in goes to `/dashboard`. Sign-out returns to `/`. An earlier plan explicitly left signed-in visits on `/` instead of sending them to the journal.

## Desired End State

Opening `/` while signed out shows the heading Training Manager, one paragraph about the measurement difference and the trainer preview, and two actions: Sign in and Sign up. The browser title is Training Manager. The page uses role tokens and `Button`. The starter name, the cosmic shell, the orbs, the star field, and the three feature panels are gone from this view.

Opening `/` while signed in shows that same heading and paragraph. The hero does not offer Sign in or Sign up. The bar still shows the email, Dashboard, and Sign out. Sign out still posts to `/api/auth/signout` and lands on this new home.

Verify by reading `/` in both session states, tabbing to each action, and confirming dashboard and auth still use `bg-cosmic`.

### Key Discoveries:

- `Button` is the only imported UI primitive, and it already defines `focus-visible:ring-ring/50` (`src/components/ui/button.tsx:8`). Auth mounts React with `client:load` (`src/pages/auth/signin.astro:14`).
- `bg-cosmic` is shared (`src/styles/global.css:113-115`, `src/pages/dashboard.astro:73`, auth pages). Changing the utility would restyle those screens.
- Only `src/pages/index.astro` omits the `Layout` title prop. The other pages pass their own titles.
- The repo has Vitest and no screenshot test. The visual gate is a kitchen-sink page.

## What We're NOT Doing

- Redirecting a signed-in visit from `/` to `/dashboard`.
- Editing `@utility bg-cosmic`, `:root`, or `.dark`.
- Restyling dashboard, auth pages, or `SubmitButton`'s purple classes.
- Adding Card, running `shadcn init`, or introducing a second button primitive.
- Adding a dark-mode toggle.
- Changing the default title in `Layout.astro`.
- Putting measurement data or a journal on `/`.
- Installing Playwright or a new lint dependency.

## Implementation Approach

Use the button that already exists. A small React island receives `signedIn` from the server render, because `Button` is React and the session is already on `Astro.locals.user`. The home stops using `bg-cosmic` and palette classes and reads the existing role tokens. Copy stays English, matching Sign in, Sign up, Dashboard, and Sign out. The three starter panels are removed rather than rebuilt. A kitchen-sink route shows the states that apply and names the ones that do not.

## Critical Implementation Details

- **User experience spec** — When `signedIn` is true, the hero renders no Sign in and no Sign up. Do not invent a second Dashboard button in the hero. Dashboard stays on the bar.
- **Form submit** — Sign out stays a `type="submit"` button inside the existing `POST /api/auth/signout` form. A React island that replaces that control must still submit that form. Do not turn Sign out into a link.

## Phase 1: Library

### Overview

Give the home a single action island that uses the existing `Button`. Add no package and no Card.

### Changes Required:

#### 1. Home action island

**File**: `src/components/home/HomeActions.tsx`

**Intent**: Later phases need one place that renders the hero actions with the shared button, including the signed-in rule, without a second button built from anchors.

**Contract**: Export a React component with props `{ signedIn: boolean }`. It imports `Button` from `@/components/ui/button`. When `signedIn` is false, render Sign in as `Button` variant `default` with `asChild` linking to `/auth/signin`, and Sign up as `Button` variant `outline` with `asChild` linking to `/auth/signup`. When `signedIn` is true, render no actions. Do not pass palette classes or arbitrary sizes through `className`. Do not add a file under `src/components/ui/`. Do not change `package.json` dependencies.

### Success Criteria:

#### Automated Verification:

- Home action component imports Button from `@/components/ui/button` and does not define a second button primitive
- No card component is added under `src/components/ui` and `package.json` dependencies are unchanged
- `npm run lint` passes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Tokens

### Overview

Record the role tokens this view will use. Do not change their values, and do not change `bg-cosmic`.

### Changes Required:

#### 1. Token deposit

**File**: `context/changes/product-home/tokens.md`

**Intent**: The next session must reuse the existing roles instead of inventing colors for the home.

**Contract**: The file lists `background`, `foreground`, `muted-foreground`, `primary`, `primary-foreground`, `border`, and `ring`, and states that the values are the current ones in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`) and that this change does not edit them. Do not modify `src/styles/global.css`.

### Success Criteria:

#### Automated Verification:

- `context/changes/product-home/tokens.md` names the home role tokens and states they come from `src/styles/global.css` unchanged
- `src/styles/global.css` `@utility bg-cosmic` and the `:root` color variables are unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: View

### Overview

Replace the starter welcome with the Training Manager home and point the document title at this page only.

### Changes Required:

#### 1. Document title

**File**: `src/pages/index.astro`

**Intent**: The browser tab should name the product on `/` without changing the default title other pages already override.

**Contract**: Pass `title="Training Manager"` to `Layout`. Keep rendering the home component inside `Layout`. Do not change `src/layouts/Layout.astro`.

#### 2. Home body

**File**: `src/components/Welcome.astro`

**Intent**: A visitor should read what Training Manager does, not a description of the Astro starter.

**Contract**: Remove the cosmic shell, orbs, star field, gradient heading, and the three feature panels. The shell uses `bg-background` and `text-foreground`. The heading text is `Training Manager`. The paragraph text is `A trainee records body measurements and sees the up/down difference versus the previous entry. A trainer who linked that trainee can preview that list.` Mount `HomeActions` with `client:load` and `signedIn` set from whether `Astro.locals.user` is present. The file must not contain `10x Astro Starter`, `bg-cosmic`, palette color utilities, hex or `rgb` colors, or arbitrary `px`/`rem` sizes. `Welcome.astro` stays the component `index.astro` renders. Its only current importer is `index.astro`.

#### 3. Bar

**File**: `src/components/Topbar.astro`

**Intent**: The bar should use the same tokens and the same button focus ring as the hero, and keep the signed-in actions where they are.

**Contract**: Replace palette and white-glass classes with role tokens (`border-border`, `bg-card`, `text-muted-foreground`, `text-foreground`). Signed out: the text `Not signed in`, plus Sign in and Sign up as `Button` islands (`ghost` or `link`, `asChild`) to `/auth/signin` and `/auth/signup`. Signed in: the user email, a Dashboard `Button` island to `/dashboard`, and Sign out as `Button` `type="submit"` inside the existing form that posts to `/api/auth/signout`. Do not add a hero Dashboard action here. Do not link to the kitchen sink.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- Hardcoded-value scan of `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` returns 0 matches
- `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` do not contain `10x Astro Starter`
- `src/pages/index.astro` passes `title="Training Manager"` to `Layout`

#### Manual Verification:

- Signed-out `/` shows the product explanation, Sign in, and Sign up, and not the starter cards
- Signed-in `/` shows the same explanation, no Sign in or Sign up in the hero, and the bar shows email, Dashboard, and Sign out
- Sign out from that bar returns to the new home
- Dashboard and the auth pages still use the cosmic shell

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: States

### Overview

Show the states this view actually has, record the ones it does not, and leave a guard so the next change keeps using tokens and `Button`.

### Changes Required:

#### 1. Kitchen sink

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: One page should show every state of this view, including the states that do not apply, so review does not depend on the happy path alone.

**Contract**: Public route `/kitchen-sink/home`, not added to `PROTECTED_ROUTES` and not linked from the bar. Show default (signed-out home), hover (the `Button` hover treatment), and focus-visible (the `Button` ring). Mark these as N/A with these reasons, in the page:

- disabled — no control on `/` is disabled
- error — `/` has no field and no failing action; the layout config banner is unchanged and out of scope
- empty — `/` has no list; the explanation is always present
- loading — the session is resolved before HTML; this view does not fetch

#### 2. Token check

**File**: `package.json` and `.github/workflows/ci.yml`

**Intent**: A later edit that puts palette classes back on the home should fail a check, without a new lint package.

**Contract**: Add `check:home-tokens` with no new dependency. It scans only `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` for hex colors, `rgb`/`hsl`/`oklch`, arbitrary `px`/`rem` sizes, and Tailwind palette color utilities, and exits non-zero when it finds one. Add `npm run check:home-tokens` to `.github/workflows/ci.yml` beside the existing `npm run lint` step. Do not scan dashboard or auth. Do not change the `lint` script into this scan.

#### 3. Agent rule

**File**: `CLAUDE.md`

**Intent**: The next agent should look up tokens and components before styling a view.

**Contract**: Add a short UI block to `CLAUDE.md`. This file has no `10x-cli` marker block to avoid. State that tokens live in `src/styles/global.css`, components live in `src/components/ui`, check that directory before creating a component, add a missing one with `npx shadcn@latest add`, do not use literal colours or arbitrary values in views, and the home kitchen sink is `/kitchen-sink/home`. Do not create a second rules file.

### Success Criteria:

#### Automated Verification:

- `src/pages/kitchen-sink/home.astro` shows default, hover, and focus-visible, and marks disabled, error, empty, and loading as N/A with the reasons in this plan
- `npm run check:home-tokens` exits 0 and `.github/workflows/ci.yml` runs it
- `CLAUDE.md` states where tokens live, where components live, to check `src/components/ui` before adding a component with `npx shadcn@latest add`, not to use literal colours or arbitrary values in views, and that the kitchen sink is `/kitchen-sink/home`
- `npm run lint` passes

#### Manual Verification:

- Kitchen sink viewed at desktop width and at one mobile width
- Keyboard focus on Sign in, Sign up, Dashboard, and Sign out shows the Button focus ring

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- No new unit test. The home has no branching data logic beyond `signedIn`, and that branch is covered by the manual session checks and the kitchen sink.

### Integration Tests:

- Existing `npm run lint` stays green.
- `npm run check:home-tokens` guards the three home files after Phase 4.
- Do not add a Playwright screenshot test. The repo does not have one.

### Manual Testing Steps:

1. Open `/` signed out. Confirm the Training Manager heading, the measurement paragraph, Sign in, and Sign up. Confirm the starter cards and the starter name are gone.
2. Sign in, then open `/` directly. Confirm the same copy, no hero Sign in or Sign up, and the bar with email, Dashboard, and Sign out.
3. Sign out from that bar. Confirm the browser returns to the new home.
4. Open `/dashboard` and `/auth/signin`. Confirm they still use the cosmic shell.
5. Tab through Sign in, Sign up, Dashboard, and Sign out. Confirm the focus ring.
6. Open `/kitchen-sink/home` at a desktop width and at one narrow width.

## Performance Considerations

`/` stays a server render. The session is already resolved in middleware. This plan adds no data fetch and no measurement query.

## Migration Notes

No data migration. No schema change. Existing sessions keep working: sign-in still redirects to `/dashboard`, and sign-out still redirects to `/`.

## References

- Related research: `context/changes/product-home/research.md`
- Roadmap slice: `context/foundation/roadmap.md` S-07, MS-01
- Shared button: `src/components/ui/button.tsx`
- Prior route split: `context/archive/2026-09-26-trainee-signup/plan.md` (home stays public; do not redirect signed-in `/` to the journal)
- React island pattern: `src/pages/auth/signin.astro`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Library

#### Automated

- [x] 1.1 Home action component imports Button from `@/components/ui/button` and does not define a second button primitive — 4fdb9e6
- [x] 1.2 No card component is added under `src/components/ui` and `package.json` dependencies are unchanged — 4fdb9e6
- [x] 1.3 `npm run lint` passes — 4fdb9e6

### Phase 2: Tokens

#### Automated

- [x] 2.1 `context/changes/product-home/tokens.md` names the home role tokens and states they come from `src/styles/global.css` unchanged — 8735e05
- [x] 2.2 `src/styles/global.css` `@utility bg-cosmic` and the `:root` color variables are unchanged — 8735e05

### Phase 3: View

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 Hardcoded-value scan of `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` returns 0 matches
- [x] 3.3 `src/components/Welcome.astro`, `src/components/Topbar.astro`, and `src/pages/index.astro` do not contain `10x Astro Starter`
- [x] 3.4 `src/pages/index.astro` passes `title="Training Manager"` to `Layout`

#### Manual

- [x] 3.5 Signed-out `/` shows the product explanation, Sign in, and Sign up, and not the starter cards
- [x] 3.6 Signed-in `/` shows the same explanation, no Sign in or Sign up in the hero, and the bar shows email, Dashboard, and Sign out
- [x] 3.7 Sign out from that bar returns to the new home
- [x] 3.8 Dashboard and the auth pages still use the cosmic shell

### Phase 4: States

#### Automated

- [ ] 4.1 `src/pages/kitchen-sink/home.astro` shows default, hover, and focus-visible, and marks disabled, error, empty, and loading as N/A with the reasons in this plan
- [ ] 4.2 `npm run check:home-tokens` exits 0 and `.github/workflows/ci.yml` runs it
- [ ] 4.3 `CLAUDE.md` states where tokens live, where components live, to check `src/components/ui` before adding a component with `npx shadcn@latest add`, not to use literal colours or arbitrary values in views, and that the kitchen sink is `/kitchen-sink/home`
- [ ] 4.4 `npm run lint` passes

#### Manual

- [ ] 4.5 Kitchen sink viewed at desktop width and at one mobile width
- [ ] 4.6 Keyboard focus on Sign in, Sign up, Dashboard, and Sign out shows the Button focus ring
