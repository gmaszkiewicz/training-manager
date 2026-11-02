# Reorganize the Avatar Menu — Plan Brief

> Full plan: `context/changes/reorganization-of-component-placement/plan.md`

## What & Why

The top bar spends its left side on a "Hello, …" greeting and carries a separate theme button. Identity and preferences belong with the account. This change moves the user's name into the avatar menu as its first item, which opens Profile, and moves the theme choice into that menu. Roadmap S-48 (MS-39), issue #177.

## Starting Point

`src/lib/topbar.ts` builds a model with a `greeting`, a top-level `name`, and avatar items Profile, Hub and Settings. `TopbarActions.tsx` shows the greeting on the left and a standalone `ThemeSwitch` (Light/Dark/System) for every user. Four e2e specs and the unit tests find the menu by the "Profile" item or by "Hello, guest".

## Desired End State

A signed-in user sees no text on the left of the bar. Their avatar menu reads:

1. Their name with a profile icon, which opens Profile
2. Separator
3. Hub and Settings
4. Theme (a submenu with Light, Dark and System)
5. Separator
6. Sign out

A guest also sees no greeting but keeps the standalone Theme button. Theme persistence works as today.

## Key Decisions Made

| Decision           | Choice                                                         | Why (1 sentence)                                                                  |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Theme item         | Submenu with Light / Dark / System radios                      | Keeps all three choices and the existing `useTheme` persistence; Sub components already exist in `ui/`. |
| Guest bar          | Drop "Hello, guest", keep the standalone Theme button          | A guest has no avatar menu but must still be able to switch the theme.            |
| Name item content  | `UserRound` icon + `topbarName()` (A. Lovelace / one name / email) | Reuses the tested name rule and the icon the Profile item used.               |
| Marking & a11y     | `aria-current` + bold on `/profile` and its subpaths; accessible name = visible name | Same "you are here" rule Profile had.                   |
| Model shape        | Name moves to `account.profile`; `greeting`, top-level `name`, the Profile item and the `role` input are removed | Only signed-in users have a name to show; `role` only fed the greeting. |

## Scope

**In scope:**

- The `topbar.ts` model and its unit tests
- The avatar menu in `TopbarActions.tsx`
- Extracting the theme radio group from `ThemeSwitch`
- The `Topbar.astro` props
- The CLAUDE.md copy rule
- The `/kitchen-sink/home` copy
- The e2e specs: account-menu, profile-avatar, measurements-menus and theme

**Out of scope:**

- The phone hamburger menu
- An email or role line in the name item
- An avatar image in the name item
- An in-place toggle or a cycling theme item
- Profile query changes
- Theme storage or head-script changes

## Architecture / Approach

The view model changes first, so the type checker flags every consumer. `TopbarActions` then renders the name item from `account.profile`, the Hub and Settings items, and a `DropdownMenuSub` "Theme" whose content is the radio group extracted from `ThemeSwitch`. The guest bar keeps rendering `ThemeSwitch` as is. Both controls share the `useTheme` hook, so they stay in sync.

## Phases at a Glance

| Phase                        | What it delivers                                               | Key risk                                                        |
| ---------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| 1. Top bar model and copy    | New `TopbarModel` shape, unit tests, CLAUDE.md rule            | `astro check` fails until Phase 2 updates the consumers          |
| 2. Avatar menu UI            | Name item, Theme submenu, separators, guest-only theme button, kitchen sink | Submenu tap and viewport fit at 360px / iOS Safari   |
| 3. E2E specs                 | Specs open Profile via the name and the theme via the avatar submenu | Stable locator for the E2E user's displayed name            |

**Prerequisites:** S-35 and S-45 done (roadmap); local Supabase for the e2e runs.
**Estimated effort:** about one session across 3 small phases.

## Open Risks & Assumptions

- The E2E user's displayed name is assumed to be the email unless the seed saves names. The specs need a locator that doesn't hard-code it.
- A Radix submenu on touch is assumed to open on tap. If iOS Safari misbehaves, the S-34-style fix may need to extend to `DropdownMenuSubTrigger`.

## Success Criteria (Summary)

- No "Hello" text appears anywhere in the top bar, for guests or signed-in users.
- A signed-in user reaches Profile by clicking their name, and changes the theme from the avatar menu.
- A guest can still change the theme, and the choice persists across reloads for everyone.
