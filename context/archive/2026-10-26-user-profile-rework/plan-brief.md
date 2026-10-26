# Avatar menu with Profile Details and Settings — Plan Brief

> Full plan: `context/changes/user-profile-rework/plan.md`

## What & Why

The top bar today mixes navigation (Home, Measurements) with account actions (Profile, Sign out). This change moves the account actions into an avatar menu — Profile, Settings, Sign out — and splits the account screens: Profile holds the user's details (read-only email, editable first and last name), Settings holds the password change. Roadmap S-35 (MS-27), issue #129.

## Starting Point

`/profile` shows "Profile" and "Change password" headings and the password form; the top bar lists Home, Measurements, Profile and a Sign out button (inline on desktop, in the hamburger on a phone). `profiles` stores only the role, with no update policy, so names can't be stored or edited yet.

## Desired End State

A signed-in user sees Home, Measurements and an initials avatar; on a phone the hamburger (Home, Measurements) sits with the avatar to its right. The avatar menu opens Profile, Settings, and Sign out, with the current page marked. `/profile` opens on a centered Details tab with the name form; `/settings` opens on a centered Change password tab with today's form. No page headings on either.

## Key Decisions Made

| Decision            | Choice                                             | Why (1 sentence)                                                                  |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Starting code       | Plan from `main`                                   | The earlier uncommitted Profile/Settings work is no longer in the tree.            |
| Horizontal menu     | shadcn Tabs                                        | Marks the selected option and takes later tabs as one more trigger.               |
| Tab alignment       | Centered on Profile and Settings                   | Both screens open from the same avatar menu and should look the same.             |
| Avatar content      | Name initials, else first letter of the email      | Shows whose account it is and works before any name is saved.                     |
| Name rules          | Optional, trimmed, at most 50 characters each      | Existing accounts stay valid and a user can clear a name.                         |
| Role protection     | Column-level update grant on the two name columns  | An own-row update policy alone would let a user rewrite `role`.                   |
| Phone placement     | Avatar to the right of the hamburger               | The avatar is the last element in the bar on desktop and on a phone.              |
| Password route      | Form and API redirects move to `/settings`         | Settings now owns the password change; `/profile` owns details.                   |
| Greeting            | Unchanged ("Hello," + email)                       | The project rule fixes the greeting; names show only as initials.                 |
| Tests               | Unit + smoke + e2e                                 | Covers the data rule, the API, and the menu that replaces the visible Sign out.  |

## Scope

**In scope:**
- Migration: nullable `first_name`, `last_name`, own-row update on those columns only
- `POST /api/profile` with shared zod validation
- `/profile` Details tab, new `/settings` Change password tab, `/settings` protected
- Avatar menu in the top bar on desktop and phone; kitchen-sink home previews
- Unit, smoke and e2e updates

**Out of scope:**
- Email change, avatar image, extra tabs, names in the greeting
- Redirects from old `/profile?error=…` password URLs
- Kitchen sinks for `/profile` and `/settings` (the `kitchen-sink-missing-pages` change)

## Architecture / Approach

`src/lib/profile-form.ts` holds the name schema and the initials helper, shared by the API route, the Details form and the top bar model. `src/lib/services/profile-details.ts` reads and writes the two columns beside the untouched `readProfileRole`. `topbarModel` returns Home/Measurements links plus an `account` object (initials + Profile/Settings items); `TopbarActions` renders it as a shadcn Avatar inside the existing `DropdownMenu`, with Sign out kept as the same POST form.

## Phases at a Glance

| Phase                         | What it delivers                                              | Key risk                                                       |
| ----------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Profile name data and API  | Name columns, own-row update, `POST /api/profile`, smoke      | A broad update grant letting a user change their role         |
| 2. Details and Settings pages | `/profile` Details tab, `/settings` Change password tab       | Password smoke and links still pointing at `/profile`          |
| 3. Avatar menu in the top bar | Initials avatar with Profile, Settings, Sign out; e2e         | A phone user losing Sign out, or a menu that needs two taps on iOS |

**Prerequisites:** Local Supabase (Docker) for migration, smoke and e2e; S-25 and S-32 done (they are).
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- The `kitchen-sink-missing-pages` change will add a `/profile` sink later; it should build on the new Details tab and `/settings`, not the old `/profile` with the password form.
- That branch claims S-35/MS-27 in the roadmap; it must be renumbered to S-36/MS-28 before it merges.
- Assumes the e2e trainee from CI can save names without affecting other specs (names are optional and cleared by the spec).

## Success Criteria (Summary)

- A signed-in user reaches Profile, Settings and Sign out only from the avatar, on desktop and on a phone
- A user can save and clear their first and last name and cannot change their email or role
- The password change works from `/settings` exactly as it did from `/profile`
