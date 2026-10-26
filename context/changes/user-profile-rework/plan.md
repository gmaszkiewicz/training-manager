# Avatar menu with Profile Details and Settings Implementation Plan

## Overview

Replace the Profile link and Sign out in the shared top bar with an avatar that opens a menu: Profile, Settings, Sign out. Profile (`/profile`) becomes a Details tab where a signed-in user edits their first and last name next to a read-only email. Settings (`/settings`) becomes a Change password tab holding today's password form. Neither screen shows a page heading; both open with a centered shadcn Tabs menu that marks the selected option. Roadmap slice S-35 (MS-27), issue #129.

## Current State Analysis

- The signed-in top bar is built in `src/lib/topbar.ts:43-57`: links Home, Measurements, Profile, plus `showSignOut: true`. `src/components/TopbarActions.tsx:40-50` renders those links and a Sign out form inline at or above the `measurement-row` breakpoint (`src/styles/global.css:92`, 77.5rem); below it, `TopbarActions.tsx:52-86` renders a hamburger `DropdownMenu` that holds the same links and Sign out.
- `src/components/Topbar.astro:23-30` reads only the role (`readProfileRole`) to decide the greeting; the greeting stays "Hello," plus the email.
- `public.profiles` has `id, role, created_at` (`supabase/migrations/20260927065512_trainee_profile.sql`), select and insert policies only (`20260928100000_trainer_role.sql:8-12`), and grants `select, insert` to `authenticated` (`20260927100031_profiles_explicit_grants.sql`). There is no update policy or grant, so no name storage and no way to edit a profile row today.
- `/profile` (`src/pages/profile.astro:21-27`) shows a "Profile" `h1`, a "Change password" `h2`, and `ChangePasswordForm`. `src/pages/api/auth/password.ts:33-65` redirects every outcome to `/profile?error=…` or `/profile?notice=password-changed`, and `scripts/smoke.mjs:804-821` asserts those exact locations.
- `src/middleware.ts:4` protects `/measurements` and `/profile` only.
- `src/components/ui/` has `dropdown-menu`, `button`, `input`, `label`, but no `avatar` or `tabs`.
- Tests assume a visible Sign out: `tests/e2e/auth.setup.ts:24` waits for a "Sign out" button; `tests/e2e/measurements-menus.spec.ts:13-16` expects Sign out inside the hamburger; `src/lib/topbar.test.ts` lists the Profile link and marks it current on `/profile`.
- `scripts/check-home-tokens.mjs:7-38` scans a fixed file list for literal colours and arbitrary sizes.
- Uncommitted Profile/Settings work that existed earlier in the session is no longer in the tree; this plan starts from `main` at `2169dc1`.

## Desired End State

A signed-in trainee or trainer sees Home and Measurements in the top bar, then a round avatar with their initials (first-name + last-name initials, or the first letter of the email when no name is saved). Clicking the avatar opens a menu with Profile, Settings, and Sign out; the item for the current page is marked. On a phone (below `measurement-row`) the hamburger holds Home and Measurements and the avatar sits to its right. `/profile` shows a centered tab menu with one active tab, Details, holding a form: Email (read-only), First name, Last name, Save. `/settings` shows a centered tab menu with one active tab, Change password, holding the existing password form. No "Profile", "Details", "Settings" or "Change password" page heading appears. Sign out behaves exactly as today. Guests see the unchanged guest bar.

Verify with `npm test`, `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm run build`, `npm run smoke`, `npm run migration-check`, and `npx playwright test` against local Supabase, then the manual checks in each phase.

### Key Discoveries:

- `authPage()` in `src/lib/auth-response.ts:17-25` gives one route both a no-JS redirect and a JSON `{ ok, redirect } | { error }` reply; `submitAuthForm()` in `src/lib/auth-form.ts:1-26` is the client half. The profile save follows the same pair.
- `useFormErrors`, `FormField`, `SubmitButton`, `FormErrorToasts` in `src/components/auth/` are the form building blocks `ChangePasswordForm.tsx` already uses; the Details form reuses them.
- `readProfileRole` is called by five API routes and the top bar (`src/pages/api/measurements/index.ts:74`, `occupied.ts:28`, `previous.ts:28`, `src/pages/api/trainer-links/index.ts:43`, `Topbar.astro:26`); it must keep its signature. Names come from a new reader beside it.
- `npm run db:types` regenerates `src/db/database.types.ts` from local Supabase and formats it.

## What We're NOT Doing

- No change to the greeting: it still reads "Hello," plus the email (CLAUDE.md greeting rule); names show only as avatar initials.
- No email change, avatar image upload, or extra Profile/Settings tabs beyond Details and Change password.
- No change to the guest bar, sign-in, sign-up, password reminder, or the sign-out endpoint.
- No redirect from old `/profile?error=…` password URLs; the password form simply lives on `/settings`.
- No required names: both fields are optional and may be cleared.
- No kitchen-sink page for `/profile` or `/settings` here; that belongs to the `kitchen-sink-missing-pages` change on its own branch.
- No dropping of columns or policies; the migration only adds.

## Implementation Approach

Data first, then the two screens, then the top bar, so the avatar menu never links to a `/settings` that does not exist yet. Names are two nullable `text` columns on `profiles` with a length check; the user may update only those two columns on their own row (column-level grant + own-row policy), so `role` stays immutable from the client. Validation lives once in `src/lib/profile-form.ts` (zod) and is shared by the API route and the form. The top bar model gains an `account` object (initials + menu items) in place of the Profile link and `showSignOut`; `TopbarActions` renders it as a shadcn `Avatar` inside a `DropdownMenuTrigger`.

## Critical Implementation Details

- **Column-level grant.** Grant `update (first_name, last_name)` only — never table-wide `update` — so an own-row policy cannot be used to rewrite `role`. Smoke must prove a request that also sends `role` leaves it unchanged.
- **Sign out inside a menu.** The Sign out item must stay a POST form to `/api/auth/signout` (as today at `TopbarActions.tsx:76-83`), with the `DropdownMenuItem` wrapping the submit button; the archived `test-app-refresh-and-fixes` change fixed first-tap opening of this dropdown on iOS Safari, so keep the same `DropdownMenu` wrapper rather than a custom popover.

## Phase 1: Profile name data and API

### Overview

Store first and last name on the user's profile and let only that user change them through `POST /api/profile`.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261026120000_profile_names.sql`

**Intent**: Add nullable name columns and let an authenticated user update those two columns on their own row only. Backward compatible: the previous Worker never selects or writes them.

**Contract**: `first_name text null`, `last_name text null`, each with `check (char_length(<col>) between 1 and 50)` (empty is stored as `null`); `grant update (first_name, last_name) on public.profiles to authenticated`; policy `profiles_update_own` `for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)`. RLS is already enabled on the table.

#### 2. Generated types and shared types

**File**: `src/db/database.types.ts`, `src/types.ts`

**Intent**: Regenerate types with `npm run db:types` and add a DTO for the details screen.

**Contract**: `ProfileDetails { email: string; firstName: string | null; lastName: string | null }` in `src/types.ts`.

#### 3. Validation

**File**: `src/lib/profile-form.ts` (new), `src/lib/profile-form.test.ts` (new)

**Intent**: One zod schema for the name fields used by both the API and the form, plus the initials helper the top bar needs in Phase 3.

**Contract**: `profileNamesSchema` — `firstName`, `lastName`: strings, trimmed, at most 50 characters, empty → `null`. Error copy constants (e.g. `FIRST_NAME_LONG_ERROR`, `LAST_NAME_LONG_ERROR`, `PROFILE_UNAVAILABLE_ERROR`, `PROFILE_SAVED_NOTICE`). `avatarInitials({ firstName, lastName, email })` → two uppercase initials when both names exist, one when only one exists, else the first letter of the email uppercased.

#### 4. Profile reader and writer

**File**: `src/lib/services/profile-details.ts` (new)

**Intent**: Read `first_name, last_name` for the signed-in user and update them, without touching `readProfileRole`.

**Contract**: `readProfileNames(supabase, userId) → { firstName, lastName } | null`; `updateProfileNames(supabase, userId, names) → { ok: true } | { ok: false }`. The update sends only `first_name` and `last_name`, filtered by `id = userId`.

#### 5. API route

**File**: `src/pages/api/profile/index.ts` (new)

**Intent**: Save the names from the Details form, following the `password.ts` + `authPage` pattern.

**Contract**: `export const prerender = false`; `POST` form fields `firstName`, `lastName`. Unauthenticated → `authPage(context, "/auth/signin")`. Validation failure → `/profile?error=<code>` with the error text. Success → `/profile?notice=profile-saved`. Any other field (e.g. `role`, `email`) is ignored.

#### 6. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Prove the name save end to end against the running server.

**Contract**: New steps: anonymous `POST /api/profile` → 302 `/auth/signin`; signed-in save → 302 `/profile?notice=profile-saved`; `/profile` 200 contains the saved names; a 51-character first name → 302 `/profile?error=…`; a save that also sends `role=trainer` from a trainee leaves the role trainee (the trainee journal still renders on `/measurements`); empty fields clear the names.

### Success Criteria:

#### Automated Verification:

- Migration applies on local Supabase: `npx supabase db reset`
- Existing measurement rows survive the migration: `npm run migration-check`
- Unit tests pass, including `profile-form.test.ts`: `npm test`
- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Smoke passes with the new profile name steps: `npm run smoke`

#### Manual Verification:

- In Supabase Studio, an `authenticated` user's `update profiles set role = 'trainer'` is refused while updating `first_name` on their own row succeeds

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Details and Settings pages

### Overview

`/profile` shows the Details tab with the name form; a new `/settings` shows the Change password tab with today's form. No page headings.

### Changes Required:

#### 1. Tabs component

**File**: `src/components/ui/tabs.tsx` (new)

**Intent**: Add the shadcn Tabs component with `npx shadcn@latest add tabs` (new-york style, role tokens).

**Contract**: Standard shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` exports; the active trigger is visibly marked via `data-[state=active]` token styles.

#### 2. Details form

**File**: `src/components/profile/ProfileDetailsForm.tsx` (new)

**Intent**: A React island with Email (read-only `Input`, `readOnly` and not submitted), First name, Last name, and Save, built from `FormField`, `SubmitButton`, `useFormErrors` and `submitAuthForm` like `ChangePasswordForm.tsx`. It validates with `profileNamesSchema` before submitting.

**Contract**: Props `{ email, firstName, lastName, serverError?, notice? }`; posts to `/api/profile`.

#### 3. Account tabs wrapper

**File**: `src/components/account/AccountTabs.tsx` (new)

**Intent**: One centered tab menu shared by both screens so they look the same; it renders a single active tab and its panel.

**Contract**: Props `{ tab: { value, label }, children }`; `TabsList` centered (`justify-center`), content below at the existing `max-w-sm` width.

#### 4. Profile page

**File**: `src/pages/profile.astro`

**Intent**: Remove the "Profile" `h1` and "Change password" `h2` and the password form; render `AccountTabs` with the Details tab and `ProfileDetailsForm`, fed by `readProfileNames` and the user's email. Map `?error=` / `?notice=profile-saved` like `profilePageError` does today.

**Contract**: Layout title stays "Profile"; no visible heading in the card.

#### 5. Settings page and protection

**File**: `src/pages/settings.astro` (new), `src/middleware.ts`

**Intent**: Move the password form to `/settings` under the Change password tab, with the same error/notice mapping; protect the route.

**Contract**: `PROTECTED_ROUTES` adds `/settings`. Layout title "Settings"; no visible heading. `settingsPageError` (rename of `profilePageError` in `src/lib/auth-reset.ts`, or a re-export) maps the same codes.

#### 6. Password API redirects

**File**: `src/pages/api/auth/password.ts`

**Intent**: Every `/profile?error=…` and `/profile?notice=password-changed` becomes `/settings?…`.

**Contract**: Same codes and JSON payloads; only the path changes.

#### 7. Token check and smoke

**File**: `scripts/check-home-tokens.mjs`, `scripts/smoke.mjs`

**Intent**: Scan the new screens and follow the password flow to `/settings`.

**Contract**: FILES adds `src/pages/settings.astro`, `src/components/profile/ProfileDetailsForm.tsx`, `src/components/account/AccountTabs.tsx`, `src/components/ui/tabs.tsx`. Smoke: `/settings` anonymous → 302 `/auth/signin`; password steps expect `/settings?error=current-password` and `/settings?notice=password-changed`; the "stays signed in" / "other session ends" checks use `/settings`.

### Success Criteria:

#### Automated Verification:

- Token check passes with the new files listed: `npm run check:home-tokens`
- Unit tests pass: `npm test`
- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`
- Smoke passes with the `/settings` password steps: `npm run smoke`

#### Manual Verification:

- `/profile` shows a centered tab menu with Details marked, read-only email, editable first and last name, and no page heading; saving shows the notice and the names stay after reload
- `/settings` shows a centered tab menu with Change password marked and the existing form, with no page heading; a password change works and shows its notice

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Avatar menu in the top bar

### Overview

Replace Profile and Sign out in the top bar with an initials avatar that opens Profile, Settings, Sign out, on desktop and on a phone.

### Changes Required:

#### 1. Avatar component

**File**: `src/components/ui/avatar.tsx` (new)

**Intent**: Add shadcn Avatar with `npx shadcn@latest add avatar`.

**Contract**: `Avatar`, `AvatarFallback` (no image is used).

#### 2. Top bar model

**File**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`

**Intent**: Signed-in links become Home and Measurements; an `account` object carries the initials and the avatar menu items with the current one marked. `showSignOut` goes away.

**Contract**: `TopbarModelInput` gains `firstName: string | null`, `lastName: string | null`. `TopbarModel` gains `account: { initials: string; label: string; items: { id: "profile" | "settings"; label: "Profile" | "Settings"; href: string; current: boolean }[] } | null` (null for guests); `TopbarLink.id`/`label` drop `"profile"`/`"Profile"`. Tests: guest has no account; signed-in links are Home, Measurements; Profile current on `/profile`, Settings current on `/settings`; initials from names, single name, and email fallback.

#### 3. Top bar rendering

**File**: `src/components/Topbar.astro`, `src/components/TopbarActions.tsx`

**Intent**: `Topbar.astro` also reads `readProfileNames` for a signed-in user. `TopbarActions` renders, at or above `measurement-row`, Home, Measurements, then the avatar; below it, the hamburger (Home, Measurements) then the avatar to its right. The avatar is a `DropdownMenuTrigger` button (`aria-label` "Account menu") with `AvatarFallback` showing the initials; its content lists Profile and Settings as links with `aria-current` on the current one, then Sign out as the POST form item.

**Contract**: Props become `TopbarModel` without `showSignOut`; the avatar trigger renders once and is visible at every width.

#### 4. Kitchen-sink home

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Update the signed-in previews to the avatar bar: one with names (two initials), one without (email initial), and `/profile` and `/settings` as the current pages.

**Contract**: `Topbar preview` inputs include `firstName`, `lastName`.

#### 5. E2E

**File**: `tests/e2e/auth.setup.ts`, `tests/e2e/measurements-menus.spec.ts`, `tests/e2e/account-menu.spec.ts` (new)

**Intent**: Sign-in setup waits for the "Account menu" button instead of "Sign out". The phone-menu spec checks the hamburger has Home and Measurements and that the avatar opens Sign out on one click. A new spec at desktop width and at 360×800 opens the avatar and sees Profile, Settings, Sign out; Profile goes to `/profile` with Details marked, Settings goes to `/settings` with Change password marked; Sign out lands on `/` with the guest bar.

**Contract**: Sign out in the new spec runs in a fresh context so the stored session for other specs stays valid.

### Success Criteria:

#### Automated Verification:

- Unit tests pass, including the updated `topbar.test.ts`: `npm test`
- Token check passes: `npm run check:home-tokens`
- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`
- Smoke still passes: `npm run smoke`
- E2E passes, including `account-menu.spec.ts`: `npx playwright test`

#### Manual Verification:

- On desktop the bar reads Home, Measurements, avatar; no Profile link or Sign out button is visible outside the menu
- On a phone the hamburger holds Home and Measurements and the avatar sits to its right; both open on the first tap in Safari on iOS
- The avatar shows the saved initials, and the email's first letter after both names are cleared
- `/kitchen-sink/home` shows the avatar bar previews

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `profile-form.test.ts`: trimming, 50 vs 51 characters, empty → `null`, initials for two names, one name, none (email), lowercase input
- `topbar.test.ts`: guest bar unchanged with no account; signed-in links and account items; current marking on `/profile` and `/settings`

### Integration Tests:

- Smoke: anonymous save refused; own save and clear; over-length refused; `role` in the form ignored; `/settings` protected; password flow on `/settings`
- E2E: avatar menu on desktop and 360px; Profile and Settings tabs marked; Sign out returns to the guest bar

### Manual Testing Steps:

1. Sign in as a trainee, open the avatar, go to Profile, save a first and last name, and check the avatar initials update
2. Clear both names and check the avatar shows the email's first letter
3. Open Settings from the avatar and change the password
4. On a phone width, open the hamburger and the avatar one after the other
5. Sign out from the avatar menu and confirm the guest bar

## Performance Considerations

The top bar now reads `first_name, last_name` in addition to the role on every signed-in page. Both come from the same `profiles` row by primary key; if it shows up, merge the two reads into one select.

## Migration Notes

Additive only: two nullable columns, one column-level grant, one policy. The previous Worker keeps working on the new schema. Existing rows get `null` names and show the email initial.

## References

- Change: `context/changes/user-profile-rework/change.md`
- Roadmap: `context/foundation/roadmap.md` — S-35, MS-27; issue #129
- Password change pattern: `src/pages/api/auth/password.ts`, `src/components/auth/ChangePasswordForm.tsx`
- Top bar: `src/lib/topbar.ts`, `src/components/TopbarActions.tsx`
- Prior slice: `context/archive/2026-10-10-handle-change-and-reset-pass/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Profile name data and API

#### Automated

- [x] 1.1 Migration applies on local Supabase: `npx supabase db reset`
- [x] 1.2 Existing measurement rows survive the migration: `npm run migration-check`
- [x] 1.3 Unit tests pass, including `profile-form.test.ts`: `npm test`
- [x] 1.4 Type checking passes: `npx astro check`
- [x] 1.5 Linting passes: `npm run lint`
- [x] 1.6 Smoke passes with the new profile name steps: `npm run smoke`

#### Manual

- [x] 1.7 In Supabase Studio, an `authenticated` user's `update profiles set role = 'trainer'` is refused while updating `first_name` on their own row succeeds

### Phase 2: Details and Settings pages

#### Automated

- [ ] 2.1 Token check passes with the new files listed: `npm run check:home-tokens`
- [ ] 2.2 Unit tests pass: `npm test`
- [ ] 2.3 Type checking passes: `npx astro check`
- [ ] 2.4 Linting passes: `npm run lint`
- [ ] 2.5 Production build succeeds: `npm run build`
- [ ] 2.6 Smoke passes with the `/settings` password steps: `npm run smoke`

#### Manual

- [ ] 2.7 `/profile` shows a centered tab menu with Details marked, read-only email, editable first and last name, and no page heading; saving shows the notice and the names stay after reload
- [ ] 2.8 `/settings` shows a centered tab menu with Change password marked and the existing form, with no page heading; a password change works and shows its notice

### Phase 3: Avatar menu in the top bar

#### Automated

- [ ] 3.1 Unit tests pass, including the updated `topbar.test.ts`: `npm test`
- [ ] 3.2 Token check passes: `npm run check:home-tokens`
- [ ] 3.3 Type checking passes: `npx astro check`
- [ ] 3.4 Linting passes: `npm run lint`
- [ ] 3.5 Production build succeeds: `npm run build`
- [ ] 3.6 Smoke still passes: `npm run smoke`
- [ ] 3.7 E2E passes, including `account-menu.spec.ts`: `npx playwright test`

#### Manual

- [ ] 3.8 On desktop the bar reads Home, Measurements, avatar; no Profile link or Sign out button is visible outside the menu
- [ ] 3.9 On a phone the hamburger holds Home and Measurements and the avatar sits to its right; both open on the first tap in Safari on iOS
- [ ] 3.10 The avatar shows the saved initials, and the email's first letter after both names are cleared
- [ ] 3.11 `/kitchen-sink/home` shows the avatar bar previews
