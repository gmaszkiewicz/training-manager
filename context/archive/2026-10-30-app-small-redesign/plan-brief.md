# Small Redesign: Lucide Icons and Dark Theme — Plan Brief

> Full plan: `context/changes/app-small-redesign/plan.md`

## What & Why

Roadmap item S-45 (MS-36): show icons across the app drawn from Lucide through the shadcn/ui components, and let the user switch the whole app to a dark theme. The colour tokens already have a `.dark` set, but nothing turns it on, so the app is light only.

## Starting Point

The icon pass is drafted in the working tree but not committed: icons in the top bar, avatar menu, account tabs, Hub, notifications, measurement browser and trainee search, plus a new token-only Logo and an SVG favicon. `src/styles/global.css` defines `.dark` tokens and the `dark:` variant. There is no theme switch, no stored preference and no pre-paint script. The only literal colours on a rendered page are in `Banner.astro`.

## Desired End State

A Sun/Moon button in the top bar, shown to guests and signed-in users, offers Light, Dark and System. The choice is saved in the browser and applied before first paint, so dark pages never flash light. With no saved choice, the app follows the operating system and reacts live when it changes. Native controls and the missing-config Banner follow the theme.

## Key Decisions Made

| Decision        | Choice                                         | Why (1 sentence)                                                            |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| Switch location | Top bar icon button, shown to everyone         | One click away on every page, including for guests on home and auth pages.  |
| Default         | Follow the system, with Light/Dark/System menu | Dark-mode users get dark on the first visit and can always return to System. |
| Persistence     | Browser localStorage + inline head script      | Covers guests, needs no migration or API, and prevents a light flash.       |
| Icon scope      | Keep the drafted set and polish it             | Matches "small redesign"; auth and measurement form buttons stay text-only. |
| Favicon         | Keeps following the OS colour scheme           | The browser tab strip follows the OS, not the page.                         |
| Testing         | Unit tests on a theme helper + one E2E spec    | The flash-before-paint risk can only be shown in a real browser.            |

## Scope

**In scope:**

- Commit the drafted icon, Logo and favicon changes
- `src/lib/theme.ts` helper with unit tests; inline pre-paint script in `Layout.astro`
- `color-scheme` on `:root` / `.dark`; Banner moved to role tokens
- `useTheme` hook, `ThemeSwitch` in the top bar, token check and kitchen-sink entry
- `tests/e2e/theme.spec.ts` for guest and signed-in users

**Out of scope:**

- Icons on auth submit, measurement form and profile form buttons
- Saving the theme on the profile, cookies, migrations or APIs
- A Settings → Appearance tab or an avatar-menu item
- Retuning `.dark` token values (unless a screen is unreadable)
- `LibBadge.astro` (unused)

## Architecture / Approach

The pure logic (parse the stored value, resolve System against the OS) lives in `src/lib/theme.ts`. A few lines of `is:inline` script in the `Layout.astro` head repeat it to put `.dark` on `<html>` before paint. A bundled module would run too late, so the script can't import the helper. The React `ThemeSwitch` uses `useTheme` to save the choice, toggle the class and follow OS changes while on System. Its trigger icon switches only through `dark:` classes, so the server and client render the same markup.

## Phases at a Glance

| Phase           | What it delivers                                    | Key risk                                                    |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 1. Icon set     | Drafted icons, Logo and favicon committed and green | Hidden lint or E2E breakage in the drafted edits            |
| 2. Theme engine | Theme applied before paint; Banner on tokens        | The head script and the helper drifting apart (duplicated logic) |
| 3. Theme switch | Light/Dark/System menu in the top bar               | Hydration mismatch; top bar crowding at 360 px              |
| 4. E2E coverage | Playwright spec for persistence and no-flash        | Flaky clicks before the island hydrates                     |

**Prerequisites:** S-11 and S-35 done (shared top bar and avatar menu); the drafted working-tree changes are present.
**Estimated effort:** ~2 sessions across 4 small phases.

## Open Risks & Assumptions

- Assumes the existing shadcn `.dark` values read well on every screen. Chart colours and the `--canvas`/`--card` contrast need a manual check.
- The choice is per browser, so a signed-in user on a second device starts from the System default.

## Success Criteria (Summary)

- Any visitor can pick Light, Dark or System from the top bar, and the choice survives reload.
- A dark page shows no light flash on load.
- Every screen is readable in dark, and the lint, token, type, unit, build and E2E checks pass.
