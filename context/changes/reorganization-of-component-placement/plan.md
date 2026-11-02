# Reorganize the Avatar Menu Implementation Plan

## Overview

Drop the "Hello" greeting from the left of the top bar. The signed-in user's name, with a profile icon, becomes the first avatar-menu item and opens Profile. It replaces the separate Profile item. The theme choice moves from the standalone top-bar button into a Theme submenu in the avatar menu, just above Sign out. Roadmap item S-48 (MS-39), issue #177.

## Current State Analysis

- `src/lib/topbar.ts` builds the `TopbarModel`, which has `greeting` (`"Hello, guest"` / `"Hello,"` / `null`), `name`, `links` and `account`. `account.items` is Profile, Hub and Settings, and each one is marked current on its subpaths through `withCurrent(..., true)`. `role` is used only to decide the greeting.
- `src/components/TopbarActions.tsx` renders the greeting and name on the left. On the right it renders the nav links, the phone Menu, `<ThemeSwitch />` (every user), the bell and `AccountMenu`, which holds the items, then a separator, then Sign out.
- `src/components/ThemeSwitch.tsx` is a self-contained dropdown: a Sun/Moon trigger labelled "Theme" and a radio group (Light/Dark/System) driven by `useTheme` (`src/components/hooks/useTheme.ts`), which persists to localStorage and applies `.dark`.
- `src/components/ui/dropdown-menu.tsx` already exports `DropdownMenuSub`, `DropdownMenuSubTrigger` and `DropdownMenuSubContent`. The iOS first-tap fix (S-34) lives on `DropdownMenuTrigger` (around line 61), which the avatar menu keeps using.
- Tests that depend on the old shape: `src/lib/topbar.test.ts` (greeting, the `accountItems` helper with Profile); e2e `account-menu.spec.ts` (the "Profile" item, "Hello, guest" after sign-out); `profile-avatar.spec.ts` and `measurements-menus.spec.ts` (the "Profile" item); `theme.spec.ts` (the top-bar "Theme" button, both signed in and as a guest). `scripts/smoke.mjs` does not read the greeting.
- Docs and copy: the CLAUDE.md "Greeting copy" rule under UI, and the topbar prose in `src/pages/kitchen-sink/home.astro`.

## Desired End State

- **Signed-in top bar:** no text on the left; links (or the phone Menu), bell and avatar on the right. There is no standalone Theme button.
- **Avatar menu order:**
  1. Name item: the `UserRound` icon and the `topbarName()` text ("A. Lovelace", the one saved name, otherwise the email). It links to `/profile` and is marked (`aria-current="page"`, bold) on `/profile` and its subpaths.
  2. Separator.
  3. Hub and Settings.
  4. Theme: a Sun/Moon icon and the word "Theme", which opens a submenu of Light, Dark and System radio items.
  5. Separator.
  6. Sign out.
- **Guest top bar:** no "Hello, guest" text; Home, Sign in and Sign up links plus the standalone Theme button as today.
- Theme persistence and the head script that applies the theme before page load behave exactly as today.

Verify with `npm test`, `npm run lint`, `npx astro check`, `npx playwright test`, and a manual pass on `/kitchen-sink/home` and at 360px.

### Key Discoveries:

- `src/lib/topbar.ts:52-57`: `TopbarModel` carries `greeting` and `name` at the top level. A guest has no name, so the name belongs on `account`.
- `src/lib/topbar.ts:139-149`: the account items use `withCurrent(..., true)` for subpath marking. The name item reuses that rule.
- `src/components/ThemeSwitch.tsx:27-45`: the radio group can be extracted and shared by the guest button and the avatar submenu.
- `src/components/ui/dropdown-menu.tsx:214-273`: the Sub components are already available, so no shadcn install is needed.
- `src/components/hooks/useTheme.ts:24`: several theme controls on one page stay in sync through the `theme-change` event. The kitchen sink relies on this.
- `src/lib/services/profile-details.ts:83`: a comment says `role` is read "for the greeting".

## What We're NOT Doing

- No change to the phone hamburger menu. It holds only the nav links.
- No email or role line under the name. No avatar image in the name item.
- No in-place light/dark toggle and no Light→Dark→System cycle. The submenu keeps all three choices.
- No change to the `readTopbarProfile` query or to the theme storage or head script.
- No change to the guest links or the bell.

## Implementation Approach

Change the view model first, so the type checker points at every consumer. Then rebuild the avatar menu around the new `account.profile` field and extract the theme radio group, so one implementation serves both the guest button and the signed-in submenu. Update the e2e specs last, with every lookup of the "Profile" menu item switched to the user's name.

## Critical Implementation Details

- **User experience spec:** the Theme row is a `DropdownMenuSubTrigger`, not a `DropdownMenuItem`, so picking it doesn't close the avatar menu. Picking a radio item closes the menu, as in today's ThemeSwitch. At 360px the submenu must open on tap and stay inside the viewport (Radix flips it to the left side when there is no room).

## Phase 1: Top bar model and copy

### Overview

Reshape `TopbarModel`: no greeting, no Profile account item, and a new `account.profile` entry carrying the user's name. Update the unit tests and the CLAUDE.md copy rule.

### Changes Required:

#### 1. View model

**File**: `src/lib/topbar.ts`

**Intent**: Remove the greeting and move the user's name into the account, as the Profile entry that heads the avatar menu. `role` no longer affects the top bar, so drop it from the input.

**Contract**:

- `TopbarModel` becomes `{ links: TopbarLink[]; account: TopbarAccount | null }`. Both `greeting` and `name` are removed.
- `TopbarAccount` gains `profile: { name: string; href: "/profile"; current: boolean }`. `name` comes from `topbarName()`. `current` is true for `/profile` and any `/profile/...` path, but not for a path that only shares the prefix (for example `/profiles`).
- `TopbarAccountItem.id` becomes `"hub" | "settings"` and `label` becomes `"Hub" | "Settings"`. The items stay in that order.
- `TopbarModelInput.role` is removed.
- `topbarName` stays exported and unchanged.

#### 2. Unit tests

**File**: `src/lib/topbar.test.ts`

**Intent**: Match the new shape. Keep the coverage of the name rule and of current-page marking.

**Contract**:

- The guest model has `account: null` and no greeting.
- A signed-in user's `account.profile.name` follows the name rule, for any role and when the role is null.
- `profile.current` is true on `/profile` and `/profile/avatar`, and false on a path that only shares the prefix.
- `accountItems` lists only Hub and Settings.
- Tests that asserted the greeting are reworded around the name, or removed when they only checked the greeting.

#### 3. Call sites and comments

**Files**: `src/components/Topbar.astro`, `src/lib/services/profile-details.ts`

**Intent**: Stop passing `role` and the greeting props. Correct the "role for the greeting" comment.

**Contract**: `Topbar.astro` passes `links` and `account` to `TopbarActions`. The `readTopbarProfile` return shape is unchanged.

#### 4. Copy rule

**File**: `CLAUDE.md` (UI section)

**Intent**: Replace the "Greeting copy" bullet so the next agent doesn't bring the greeting back.

**Contract**: The top bar shows no greeting. The avatar menu's first item is the user's name (first initial and last name, the one saved name alone, otherwise their email) with a profile icon, linking to Profile. Guests keep a standalone Theme button. Signed-in users switch the theme from the avatar menu's Theme submenu. The measurements sentence stays.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Type checking passes: `npx astro check` (Phase 2 consumers may still fail until Phase 2 lands; Phases 1 and 2 are committed together if needed)
- Linting passes: `npm run lint`
- No greeting strings remain in `src/`: `git grep -n "Hello," -- src` returns nothing

#### Manual Verification:

- CLAUDE.md UI section describes the name item and the theme placement, and no longer mentions "Hello"

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Avatar menu UI

### Overview

Render the new avatar menu, share the theme radio group between the guest button and the signed-in submenu, and remove the left greeting. Update the kitchen sink copy.

### Changes Required:

#### 1. Shared theme radio group

**File**: `src/components/ThemeSwitch.tsx`

**Intent**: Extract the Light/Dark/System radio group, wired to `useTheme`, into a component the avatar menu can render inside a submenu. `ThemeSwitch` (the standalone button) keeps working unchanged for guests.

**Contract**: Add a named export (for example `ThemeRadioItems`) that renders `DropdownMenuRadioGroup` with the three items and the same `onValueChange`. The default export `ThemeSwitch` keeps its trigger (`aria-label="Theme"`, Sun/Moon via the `dark:` classes) and renders the extracted group.

#### 2. Avatar menu and top bar

**File**: `src/components/TopbarActions.tsx`

**Intent**: Build the menu in the agreed order and drop the left-side greeting. The standalone theme button renders only when there is no account (a guest).

**Contract**:

- `Props` is `TopbarModel`: `{ links, account }`.
- Avatar menu content, in order:
  1. `DropdownMenuItem asChild` with an `<a href={account.profile.href}>` containing `UserRound` and `account.profile.name`. It gets `aria-current` and `linkClassName(current)` like the other items, and truncates on narrow widths.
  2. `DropdownMenuSeparator`.
  3. The Hub and Settings items.
  4. `DropdownMenuSub` with a `DropdownMenuSubTrigger` showing the Sun/Moon icons (the same `dark:` class trick) and the text "Theme", plus a `DropdownMenuSubContent` holding the shared radio group.
  5. `DropdownMenuSeparator`.
  6. The Sign out form.
- `sectionIcons` drops the `profile` key (or keeps `UserRound` for the name item explicitly).
- The left `min-w-0` greeting block is removed, and the right cluster stays right-aligned.
- `<ThemeSwitch />` renders only when `account` is null.

#### 3. Kitchen sink

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Bring the topbar prose in line with the new bar: no "Hello …" captions; the avatar opens the name, Hub, Settings, Theme and Sign out; guests have the Theme button. The previews themselves need no input change beyond dropping `role` if `TopbarModelInput` no longer accepts it.

**Contract**: The section intro (around lines 29-36) and each preview caption that quotes a greeting or "opening Profile, Hub, Settings, Sign out" are updated. The preview objects compile against the new `TopbarModelInput`.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Token check passes: `npm run check:home-tokens`
- Unit tests pass: `npm test`
- Build succeeds: `npm run build`

#### Manual Verification:

- Signed in on `/` at desktop width: no text on the left, no standalone Theme button, and the avatar menu reads name (with icon), separator, Hub, Settings, Theme, separator, Sign out
- Clicking the name opens `/profile`; on `/profile/avatar` the name item is bold
- Theme submenu: choosing Dark applies it at once and it survives a reload, both by mouse and by keyboard (ArrowRight opens the submenu)
- At 360px (or an iPhone in Safari) the avatar menu opens on the first tap, and the Theme submenu opens on tap and stays inside the screen
- As a guest: no "Hello, guest" text, and the standalone Theme button still works
- `/kitchen-sink/home` previews and captions match the new bar in light and dark mode

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: E2E specs

### Overview

Point every Playwright spec that relied on the "Profile" menu item, the "Hello, guest" text or the signed-in top-bar Theme button at the new menu.

### Changes Required:

#### 1. Account menu spec

**File**: `tests/e2e/account-menu.spec.ts`

**Intent**: Open Profile through the name item. Assert the new menu contents. Assert the guest bar after sign-out without the greeting.

**Contract**:

- `openAccountMenu` waits for the first menu item, a `menuitem` whose name is the E2E user's displayed name. That name is the email unless names are saved; match it with a stable locator, for example the first `menuitem` in the menu, or a name read from the seeded user.
- It also asserts Hub, Settings, Theme and Sign out are visible.
- The Profile test clicks the name item and checks `aria-current` on it.
- After sign-out, the test asserts a guest marker (for example the "Sign in" link) and that "Account menu" is absent.

#### 2. Profile avatar and measurements menus specs

**Files**: `tests/e2e/profile-avatar.spec.ts`, `tests/e2e/measurements-menus.spec.ts`

**Intent**: Replace each `menuitem "Profile"` lookup with the name item, using the same locator approach as the account-menu spec.

**Contract**: The specs follow the same open-and-retry pattern. They make the same `aria-current` assertion on the name item on `/profile/avatar`.

#### 3. Theme spec

**File**: `tests/e2e/theme.spec.ts`

**Intent**: Keep the persistence-before-hydration coverage for both contexts. The signed-in context reaches the radios through Account menu → Theme. The guest context keeps the top-bar Theme button.

**Contract**:

- `openThemeMenu` branches by context: guest clicks `button "Theme"`; signed in opens "Account menu" (with retry) and then the `menuitem "Theme"` submenu trigger.
- It waits for the `menuitemradio` items as before.
- The signed-in case also asserts that `button "Theme"` has count 0 in the bar.

### Success Criteria:

#### Automated Verification:

- E2E suite passes locally against local Supabase: `npx playwright test`
- No spec references the removed item or greeting: `git grep -nE 'name: "Profile"|Hello, guest' -- tests` returns nothing
- Linting passes: `npm run lint`

#### Manual Verification:

- CI `e2e` job is green on the PR

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- The guest model has no account and no greeting.
- The name rule shows through `account.profile.name`: both names, one name, email only.
- `profile.current` on `/profile`, `/profile/avatar`, and a prefix-only path.
- The account items are Hub and Settings only.

### Integration Tests:

- Playwright: the account menu at desktop and 360×800 (name → Profile, Hub, Settings, Sign out, current marking).
- Playwright: avatar upload via the name item.
- Playwright: the phone menus on `/measurements`.
- Playwright: theme persistence signed in (avatar submenu) and as a guest (bar button).

### Manual Testing Steps:

1. Sign in, open the avatar menu, check the order and both separators, click the name and land on Profile.
2. Theme → Dark, reload, and check there is no flash. Theme → System follows the OS.
3. Repeat on a phone-width viewport and, if available, on iOS Safari.
4. Sign out and check the guest bar has no greeting but keeps the Theme button.
5. Keyboard: Tab to the avatar, press Enter, use the arrows to reach Theme, ArrowRight into the submenu, then Enter on Light.

## Performance Considerations

None. The change is rendering-only, with the same data reads.

## Migration Notes

None. There is no schema or storage change, and the theme localStorage key is unchanged.

## References

- Roadmap: `context/foundation/roadmap.md` S-48 (MS-39), issue #177
- Theme hook: `src/components/hooks/useTheme.ts:46`
- iOS first-tap fix: `src/components/ui/dropdown-menu.tsx:61`
- Current menu: `src/components/TopbarActions.tsx:91-126`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Top bar model and copy

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — a840721
- [x] 1.2 Type checking passes: `npx astro check` — a840721
- [x] 1.3 Linting passes: `npm run lint` — a840721
- [x] 1.4 No greeting strings remain in `src/` — a840721

#### Manual

- [x] 1.5 CLAUDE.md UI section describes the name item and the theme placement — a840721

### Phase 2: Avatar menu UI

#### Automated

- [x] 2.1 Type checking passes: `npx astro check` — a840721
- [x] 2.2 Linting passes: `npm run lint` — a840721
- [x] 2.3 Token check passes: `npm run check:home-tokens` — a840721
- [x] 2.4 Unit tests pass: `npm test` — a840721
- [x] 2.5 Build succeeds: `npm run build` — a840721

#### Manual

- [x] 2.6 Signed-in desktop bar and avatar menu order are correct — a840721
- [x] 2.7 Name opens Profile and is marked on /profile subpaths — a840721
- [x] 2.8 Theme submenu applies and persists by mouse and keyboard — a840721
- [x] 2.9 At 360px / iOS Safari the menu and submenu open on first tap — a840721
- [x] 2.10 Guest bar has no greeting and a working Theme button — a840721
- [x] 2.11 Kitchen sink previews and captions match in light and dark — a840721

### Phase 3: E2E specs

#### Automated

- [x] 3.1 E2E suite passes: `npx playwright test`
- [x] 3.2 No spec references the removed item or greeting
- [x] 3.3 Linting passes: `npm run lint`

#### Manual

- [ ] 3.4 CI e2e job is green on the PR
