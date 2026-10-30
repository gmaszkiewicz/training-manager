# Small Redesign: Lucide Icons and Dark Theme Implementation Plan

## Overview

Land the Lucide icon pass that already sits in the working tree, then add a dark theme on the existing `.dark` tokens. A Light / Dark / System switch sits in the top bar for guests and signed-in users; the choice lives in the browser and is applied before first paint so a server-rendered page never flashes light.

## Current State Analysis

- The icon pass is drafted but uncommitted: Lucide icons on top bar links and the avatar menu (`src/components/TopbarActions.tsx`), account tabs, Hub row actions, the notifications table, the measurement browser and the trainee search; a new token-only `src/components/Logo.astro` on the home card and home kitchen sink; a new `public/favicon.svg` (plus refreshed `favicon.png`), wired in `src/layouts/Layout.astro`; `Logo.astro` added to `scripts/check-home-tokens.mjs`; README title line dropped and `public/template.png` replaced.
- Dark tokens exist but nothing turns them on: `src/styles/global.css:48` defines `.dark`, and `src/styles/global.css:4` declares `@custom-variant dark (&:is(.dark *))`. No code sets `.dark`, and there is no theme switch, storage, or `color-scheme`.
- Views are almost token-clean (enforced by `check:home-tokens`). The only literal colours on rendered pages are in `src/components/Banner.astro:28-40` (hex per variant), which `Layout.astro` renders on every page when a config is missing. `src/components/ui/LibBadge.astro` uses palette utilities but is not imported anywhere.
- Every page renders through `src/layouts/Layout.astro`, so one `<head>` script covers the app, auth pages and kitchen sinks.
- The top bar is one React island, `TopbarActions` (`src/components/TopbarActions.tsx:127`), mounted by `src/components/Topbar.astro` with `client:load`. Its right-hand cluster renders for guests too; the bell and avatar render only with an account.
- `src/components/ui/dropdown-menu.tsx` already exports `DropdownMenuRadioGroup` / `DropdownMenuRadioItem`.

## Desired End State

- Every icon in the drafted set is committed, passes lint, token check, type check, tests and build.
- A Sun/Moon button in the top bar opens a menu with Light, Dark and System. Choosing one updates the page at once and survives reload and navigation in that browser.
- With no saved choice, or with System, the app follows the operating system and reacts live when it changes.
- A dark page is dark from the first frame: `<html>` carries `.dark` before the body paints. Native controls (scrollbars, inputs, date pickers) follow via `color-scheme`.
- The missing-config Banner is readable in both themes using role tokens.
- Verified by Vitest on a pure theme helper and one Playwright spec that checks the class on first paint for a guest and a signed-in user.

### Key Discoveries:

- `src/styles/global.css:4` — the `dark` variant keys off a `.dark` ancestor, so the class belongs on `<html>`.
- `src/layouts/Layout.astro:18-24` — the single `<head>` for every page; the pre-paint script goes here.
- `src/components/TopbarActions.tsx:139` — the right-hand cluster where the switch goes, before the bell and avatar.
- `src/components/ui/dropdown-menu.tsx:149-153` — radio group/item primitives for the three-way choice.
- `tests/e2e/account-menu.spec.ts:9-20` — retry-until-hydrated pattern for opening top bar menus in Playwright.
- `src/components/Logo.astro` uses `fill-primary`, `stroke-primary-foreground`, `stroke-chart-2`, so it inverts with the theme without changes.

## What We're NOT Doing

- No icons beyond the drafted set (auth submit buttons, measurement form actions and profile forms stay text-only).
- No saving the theme on the profile, no migration, no API, no cookie; the choice does not follow a user across devices.
- No Settings → Appearance tab and no avatar-menu item.
- No retuning of the `.dark` token values unless a screen is unreadable in manual review; the existing shadcn values are the baseline.
- `favicon.svg` keeps following the operating system (`prefers-color-scheme`), matching the browser tab strip rather than the app theme.
- `LibBadge.astro` is left alone (unused).

## Implementation Approach

The pure decision logic (parse a stored value, resolve System against the OS) lives in `src/lib/theme.ts` and is unit-tested. A tiny `is:inline` script in `Layout.astro` repeats that logic in plain JS to set `.dark` before paint, because a bundled module runs too late. The React switch reads and writes the same storage key through a hook, toggles the class, and listens to the OS media query while on System. The trigger shows Sun or Moon purely through the `dark:` variant so the server and client render identical markup.

## Critical Implementation Details

- **Timing & lifecycle** — the head script must be `<script is:inline>` placed before the stylesheet-dependent body renders, and must be wrapped in `try/catch` (storage can throw in private modes, falling back to System). It cannot import from `src/lib/theme.ts`; keep the storage key and allowed values identical in both places and note the duplication in a one-line comment in each.
- **Hydration** — the switch must not render the current theme from state on the server pass (the server cannot know it). Show both icons and hide one with `dark:hidden` / `hidden dark:block`; read the stored preference for the radio selection only after mount.

## Phase 1: Icon set

### Overview

Verify and commit the icon pass already in the working tree as its own reviewable step.

### Changes Required:

#### 1. Drafted icon, logo and favicon changes

**File**: `src/components/TopbarActions.tsx`, `src/components/account/AccountTabs.tsx`, `src/components/hub/CollaborationRowActions.tsx`, `src/components/hub/NotificationsTable.tsx`, `src/components/measurements/MeasurementBrowser.tsx`, `src/components/trainer/TraineeEmailSearch.tsx`, `src/components/Welcome.astro`, `src/components/Logo.astro`, `src/pages/kitchen-sink/home.astro`, `src/layouts/Layout.astro`, `public/favicon.svg`, `public/favicon.png`, `public/template.png`, `scripts/check-home-tokens.mjs`, `README.md`

**Intent**: Keep the drafted changes as they are; fix only what the checks flag. Icons stay decorative (`aria-hidden`) so accessible names, and the E2E selectors that rely on them, are unchanged.

**Contract**: Lucide icons via `lucide-react` inside shadcn `Button` / `DropdownMenuItem` / tabs; `Logo.astro` uses role tokens only and is listed in `check-home-tokens`; `Layout.astro` declares the SVG favicon first with the PNG as fallback.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`
- Unit tests pass: `npm test`
- Build succeeds: `npm run build`
- Existing Playwright specs pass: `npx playwright test`

#### Manual Verification:

- Icons appear in the top bar links, avatar menu, phone hamburger menu, account tabs, Hub rows, notifications and measurement browser, aligned with their labels
- The Logo shows on the signed-out home card and in `/kitchen-sink/home`
- The browser tab shows the new favicon

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Theme engine

### Overview

Apply the stored or system theme before first paint, make native controls follow it, and remove the last literal colours from a rendered page.

### Changes Required:

#### 1. Theme helper

**File**: `src/lib/theme.ts` (new), `src/lib/theme.test.ts` (new)

**Intent**: One tested source for the storage key, allowed values and resolution rule that the hook and the head script both follow.

**Contract**: `type ThemePreference = "light" | "dark" | "system"`; `THEME_STORAGE_KEY = "theme"`; `parseThemePreference(value: unknown): ThemePreference` (anything other than `"light"`/`"dark"`/`"system"` → `"system"`); `resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark"`. Tests cover each stored value, `null`, garbage strings, and System with the OS both ways.

#### 2. Pre-paint script

**File**: `src/layouts/Layout.astro`

**Intent**: Set `.dark` on `<html>` before the body paints, from the stored preference or the OS when none is stored.

**Contract**: An inline `<head>` script that reads `localStorage["theme"]`, resolves it as in `resolveTheme` using `matchMedia("(prefers-color-scheme: dark)")`, and toggles `document.documentElement.classList` `"dark"`; on any storage error it resolves as System.

#### 3. Native control colours

**File**: `src/styles/global.css`

**Intent**: Let scrollbars, inputs and date pickers follow the theme.

**Contract**: `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark`.

#### 4. Banner on role tokens

**File**: `src/components/Banner.astro`

**Intent**: Make the missing-config banner readable in both themes without literal colours.

**Contract**: The three variants use CSS variables from `global.css` (e.g. `--destructive` for error, `--chart-4` accent for warning, `--muted`/`--border` for info) instead of hex; markup, roles and `role="alert"`/`"status"` stay the same.

### Success Criteria:

#### Automated Verification:

- Theme helper unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`
- Build succeeds: `npm run build`
- No hex colours remain in `src/components/Banner.astro`

#### Manual Verification:

- With the OS in dark mode and no stored value, every page loads dark with no light flash on hard reload
- Setting `localStorage.theme = "light"` in devtools and reloading forces light while the OS is dark
- The Banner (force a missing config locally) is readable in both themes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Theme switch

### Overview

Give every top bar visitor a Light / Dark / System control.

### Changes Required:

#### 1. Theme hook

**File**: `src/components/hooks/useTheme.ts` (new)

**Intent**: Hold the preference after mount, persist changes, apply the class, and follow OS changes while on System.

**Contract**: `useTheme(): { preference: ThemePreference | null; setPreference(next: ThemePreference): void }` — `null` until mounted; writes `THEME_STORAGE_KEY` (ignoring storage errors), applies `resolveTheme` to `<html>`, and subscribes to the `prefers-color-scheme` media query only while the preference is `"system"`.

#### 2. Switch component

**File**: `src/components/ThemeSwitch.tsx` (new)

**Intent**: A ghost icon button showing Sun in light and Moon in dark, opening a radio menu of Light, Dark and System with Lucide icons (`Sun`, `Moon`, `Monitor`).

**Contract**: Trigger is `Button variant="ghost" size="icon"` with `aria-label="Theme"`; icons toggle through `dark:` classes only; menu uses `DropdownMenuRadioGroup` / `DropdownMenuRadioItem` bound to `useTheme`. Role tokens only.

#### 3. Top bar wiring

**File**: `src/components/TopbarActions.tsx`

**Intent**: Show the switch for guests and signed-in users at every width.

**Contract**: `ThemeSwitch` renders in the right-hand cluster after the hamburger/links and before the bell and avatar, outside the `account` condition.

#### 4. Token check and kitchen sink

**File**: `scripts/check-home-tokens.mjs`, `src/pages/kitchen-sink/home.astro`

**Intent**: Keep the new component under the token guard and visible in the home kitchen sink.

**Contract**: `src/components/ThemeSwitch.tsx` added to `FILES`; the home kitchen sink shows the switch in its top bar section.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Type check passes: `npx astro check`
- Unit tests pass: `npm test`
- Build succeeds: `npm run build`
- Existing Playwright specs pass: `npx playwright test`

#### Manual Verification:

- The switch shows as a guest on `/` and `/auth/signin`, and signed in on `/measurements`, at desktop width and at 360×800, without crowding the hamburger, bell and avatar
- Choosing Dark, Light and System updates the page immediately; System follows an OS change live
- Every screen (home, auth, measurements with charts, profile, settings, Hub, notifications, trainer preview) is readable in dark, including dropdowns, toasts, tables and chart colours
- No hydration warning appears in the console on load in dark

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: E2E coverage

### Overview

Lock in the switch and the no-flash guarantee in a real browser.

### Changes Required:

#### 1. Theme spec

**File**: `tests/e2e/theme.spec.ts` (new)

**Intent**: Prove the choice persists and is applied before the app hydrates, for a guest and for the signed-in setup user.

**Contract**: For a signed-in context (default storage state) and a guest context (empty storage state): open the Theme menu with the retry-until-hydrated pattern, pick Dark, assert `<html>` has class `dark`; reload and assert `dark` is present on `domcontentloaded` (before hydration); pick Light and assert it is gone; with `colorScheme: "dark"` emulation and no stored value, a fresh load has `dark`.

### Success Criteria:

#### Automated Verification:

- New spec passes: `npx playwright test tests/e2e/theme.spec.ts`
- Full Playwright suite passes: `npx playwright test`
- Lint passes: `npm run lint`

#### Manual Verification:

- The spec fails when the head script in `Layout.astro` is temporarily removed (deliberate-break check)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `parseThemePreference` for `"light"`, `"dark"`, `"system"`, `null`, `undefined`, and unknown strings
- `resolveTheme` for each preference with the OS light and dark

### Integration Tests:

- `tests/e2e/theme.spec.ts`: Dark persists across reload and is on `<html>` at `domcontentloaded`, as a guest and signed in; Light clears it; OS dark with no stored value loads dark

### Manual Testing Steps:

1. With the OS in dark mode, open `/` in a fresh profile and confirm it is dark without a flash
2. Pick Light, navigate to `/measurements`, confirm it stays light; pick System, confirm it returns to dark
3. Walk every screen in dark, including menus, toasts, charts and tables, at desktop and 360×800

## Performance Considerations

The head script is a few lines of synchronous JS with no network access; it blocks rendering only for that time and removes the need for any server-side variation.

## Migration Notes

None. No database or API changes.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-45 (MS-36)
- Dark tokens: `src/styles/global.css:48`
- Top bar island: `src/components/TopbarActions.tsx:127`
- Menu E2E pattern: `tests/e2e/account-menu.spec.ts:9`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Icon set

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — cab044f
- [x] 1.2 Token check passes: `npm run check:home-tokens` — cab044f
- [x] 1.3 Type check passes: `npx astro check` — cab044f
- [x] 1.4 Unit tests pass: `npm test` — cab044f
- [x] 1.5 Build succeeds: `npm run build` — cab044f
- [x] 1.6 Existing Playwright specs pass: `npx playwright test` — cab044f

#### Manual

- [x] 1.7 Icons appear in the top bar links, avatar menu, phone hamburger menu, account tabs, Hub rows, notifications and measurement browser, aligned with their labels — cab044f
- [x] 1.8 The Logo shows on the signed-out home card and in `/kitchen-sink/home` — cab044f
- [x] 1.9 The browser tab shows the new favicon — cab044f

### Phase 2: Theme engine

#### Automated

- [x] 2.1 Theme helper unit tests pass: `npm test` — 85c3e84
- [x] 2.2 Lint passes: `npm run lint` — 85c3e84
- [x] 2.3 Token check passes: `npm run check:home-tokens` — 85c3e84
- [x] 2.4 Type check passes: `npx astro check` — 85c3e84
- [x] 2.5 Build succeeds: `npm run build` — 85c3e84
- [x] 2.6 No hex colours remain in `src/components/Banner.astro` — 85c3e84

#### Manual

- [x] 2.7 With the OS in dark mode and no stored value, every page loads dark with no light flash on hard reload — 85c3e84
- [x] 2.8 Setting `localStorage.theme = "light"` in devtools and reloading forces light while the OS is dark — 85c3e84
- [x] 2.9 The Banner (force a missing config locally) is readable in both themes — 85c3e84

### Phase 3: Theme switch

#### Automated

- [x] 3.1 Lint passes: `npm run lint`
- [x] 3.2 Token check passes: `npm run check:home-tokens`
- [x] 3.3 Type check passes: `npx astro check`
- [x] 3.4 Unit tests pass: `npm test`
- [x] 3.5 Build succeeds: `npm run build`
- [x] 3.6 Existing Playwright specs pass: `npx playwright test`

#### Manual

- [x] 3.7 The switch shows as a guest on `/` and `/auth/signin`, and signed in on `/measurements`, at desktop width and at 360×800, without crowding the hamburger, bell and avatar
- [x] 3.8 Choosing Dark, Light and System updates the page immediately; System follows an OS change live
- [x] 3.9 Every screen (home, auth, measurements with charts, profile, settings, Hub, notifications, trainer preview) is readable in dark, including dropdowns, toasts, tables and chart colours
- [x] 3.10 No hydration warning appears in the console on load in dark

### Phase 4: E2E coverage

#### Automated

- [ ] 4.1 New spec passes: `npx playwright test tests/e2e/theme.spec.ts`
- [ ] 4.2 Full Playwright suite passes: `npx playwright test`
- [ ] 4.3 Lint passes: `npm run lint`

#### Manual

- [ ] 4.4 The spec fails when the head script in `Layout.astro` is temporarily removed (deliberate-break check)
