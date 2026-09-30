# Shared top bar Implementation Plan

## Overview

Put one top bar on the public home, sign-in, sign-up, and both dashboards. A guest reads "Hello guest" with Home, Sign in, and Sign up. A signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out. The link that opens the current path is marked. Sign out lives only in that bar. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email.

## Current State Analysis

`Topbar.astro` is mounted only from `Welcome.astro` on `/`. The shell already uses `border-border`, `bg-card`, and `text-muted-foreground`. `TopbarActions.tsx` still says "Not signed in" for a guest, and for a signed-in user it shows the email, a Dashboard link to `/dashboard`, and Sign out. No link is marked as the current page.

Sign-in (`src/pages/auth/signin.astro`), sign-up (`src/pages/auth/signup.astro`), and `/dashboard` do not render the bar. Each of those screens centers its card in a `min-h-screen` flex wrapper. `TraineeJournal.astro` and `TrainerPanel.astro` (including the unavailable panel) still end with their own Sign out form posting to `/api/auth/signout`.

`Astro.locals.user` is the Supabase user or null. It carries email, not role. `ensureProfile` in `src/lib/services/ensure-profile.ts` reads `profiles` and can insert a row. Only `src/pages/dashboard.astro` calls it, in the page frontmatter, which Astro runs before a child component's frontmatter. `profiles_select_own` already lets a signed-in user read their own row. There is no research doc for this change; S-11 in `context/foundation/roadmap.md` is the product source.

## Desired End State

A guest on `/` sees "Hello guest", Home (marked), Sign in, and Sign up, and still sees the hero Sign in and Sign up under Training Manager. A guest on `/auth/signin` sees Home and Sign in, with Sign in marked. A guest on `/auth/signup` sees Home and Sign up, with Sign up marked.

A signed-in trainee `ada@example.com` on `/` sees "Hello trainee ada@example.com" as one phrase with a single space, then Home (marked, href `/`), Measurements (href `/dashboard`), and Sign out. The same person on `/dashboard` sees Measurements marked. A trainer sees "Hello trainer" instead, still one space before the email. On `/dashboard?trainee=abc`, Measurements stays marked and its href is still `/dashboard`. Clicking it opens `/dashboard` with no query, and the existing preview rule selects the most recently linked trainee. An empty link list still selects nobody.

A signed-in user whose profile row is missing, whose read fails, or whose stored role is neither trainee nor trainer sees `ada@example.com` alone — no "Hello guest", "Hello trainee", or "Hello trainer" — with Home, Measurements, and Sign out. A signed-in trainee who opens `/auth/signin` sees that signed-in bar with nothing marked. The journal card and the trainer panel are titled Body measurements. They no longer contain Sign out, Welcome, or the email. The unavailable panel heading stays Dashboard, and its sentence stays "Could not open your journal". `/auth/confirm-email` has no bar.

### Key Discoveries:

- The bar already exists as `src/components/Topbar.astro` plus the `TopbarActions.tsx` island. Sign out is already a POST form, not a link (`src/components/TopbarActions.tsx`).
- The trainer list marks the selected trainee with `aria-current="page"` and `font-semibold text-card-foreground` (`src/components/trainer/TrainerPanel.astro`).
- `findProfile` inside `ensure-profile.ts` is private and `ensureProfile` inserts when the row is missing. The bar must not call it.
- `Layout.astro` wraps every page, including `/auth/confirm-email` and the kitchen sinks. The bar does not belong there.
- Pure helpers in `src/lib/` are covered by Vitest (`src/lib/trainer-preview.test.ts`). `npm run check:home-tokens` already scans the bar, the auth pages, the journal, the trainer panel, and `dashboard.astro`.

## What We're NOT Doing

- Adding the bar to `/auth/confirm-email`, or redirecting a signed-in user away from sign-in or sign-up.
- Removing the hero Sign in and Sign up on the public home (`HomeActions`).
- Changing the unavailable-panel heading. It stays Dashboard.
- Changing measurement data, the journal form, trainer linking, or the unavailable-panel sentence "Could not open your journal".
- A database migration, a new route, or a collapsed mobile menu.
- Linking any kitchen sink from the product bar.
- Treating a stored trainee or trainer role as email-only just because the dashboard branch is the unavailable panel (invalid signup metadata). The bar follows the stored profile. The panel stays on its current branch.

## Implementation Approach

One pure function, `topbarModel`, decides the greeting, the links, and which link is current. `Topbar.astro` builds that model on the server. On a real page it reads `profiles.role` through a new read-only helper and does not insert. A kitchen-sink preview passes the inputs in and skips the database. The same component is rendered at the top of `/`, sign-in, sign-up, and `/dashboard`, outside the centered card. Sign out is removed from the journal and the trainer panel. The home, journal, and trainer kitchen sinks are updated so they show this bar and no longer document a card Sign out.

## Follow-up

Recorded 2026-09-30, after the three phases, from review of the shipped bar. These supersede the earlier guest menu and the journal and trainer card copy.

- A guest also gets Home (`/`). It is marked on `/`. Sign in stays marked on `/auth/signin`. Sign up stays marked on `/auth/signup`.
- The trainee journal and the trainer panel drop the Welcome line and the email. Both stay in the bar.
- The journal heading and the trainer heading are Body measurements. The unavailable panel heading stays Dashboard.
- The greeting and the email are one phrase with a single space, for example `Hello trainee ada@example.com`.

## Critical Implementation Details

- **Timing.** `dashboard.astro` calls `ensureProfile` in its frontmatter, and Astro runs that frontmatter before `Topbar.astro`'s frontmatter. The bar's read therefore sees a row the page just inserted. Do not call `ensureProfile` from the bar, and do not read the profile in the page and pass that value in before `ensureProfile` has run. Passing the page's resolved `role` would also be wrong: a rejected metadata role leaves that value null even when `profiles.role` is `trainee` or `trainer`, and the bar must still say "Hello trainee" or "Hello trainer" in that case.

## Phase 1: Bar contract

### Overview

Replace the home bar's copy, links, and current-page rule, and teach it to read the stored role without inserting. `/` is the only page that shows it in this phase.

### Changes Required:

#### 1. Greeting and current-link model

**File**: `src/lib/topbar.ts`

**Intent**: Hold the guest, trainee, trainer, and email-only rules in one place so the island and the tests share them.

**Contract**: `topbarModel` accepts `{ signedIn: boolean; email: string; role: "trainee" | "trainer" | null; pathname: string }` and returns `{ greeting: "Hello guest" | "Hello trainee" | "Hello trainer" | null; email: string | null; links: { id: "home" | "measurements" | "signin" | "signup"; label: "Home" | "Measurements" | "Sign in" | "Sign up"; href: string; current: boolean }[]; showSignOut: boolean }`.

A guest (`signedIn` false) ignores `role` and `email`. Greeting is "Hello guest", `email` is null, `showSignOut` is false, and the links are Sign in (`/auth/signin`) and Sign up (`/auth/signup`). A signed-in trainee uses greeting "Hello trainee". A signed-in trainer uses "Hello trainer". A signed-in user with `role` null uses greeting null. All three signed-in results set `email` to the input email, `showSignOut` true, and the links Home (`/`) and Measurements (`/dashboard`). Measurements never gains a query string.

`current` is true only when `link.href === pathname`. For `ada@example.com` this means: a guest on `/` has no current link; a guest on `/auth/signin` marks Sign in; a guest on `/auth/signup` marks Sign up; a signed-in user on `/` marks Home; a signed-in user on `/dashboard` marks Measurements; a signed-in user on `/auth/signin` marks nothing. Sign out is not a link.

#### 2. Tests for those rules

**File**: `src/lib/topbar.test.ts`

**Intent**: Lock the four interview decisions as unit tests before the bar is copied onto the other pages.

**Contract**: Vitest cases, in the same style as `src/lib/trainer-preview.test.ts`, cover every result named in the `topbarModel` contract above, including href `/dashboard` with no query when `pathname` is `/dashboard`.

#### 3. Read the stored role

**File**: `src/lib/services/ensure-profile.ts`

**Intent**: Let the bar resolve trainee versus trainer without creating a profile.

**Contract**: Export `readProfileRole(supabase, userId)` returning `"trainee" | "trainer" | null`. Return null when the row is missing, the select errors, or `role` is anything else. Do not insert. Leave `ensureProfile` and its callers unchanged.

#### 4. Render the model

**File**: `src/components/Topbar.astro`

**Intent**: Build the model for the public home, and accept a preview payload so the kitchen sink can show the same states without a session.

**Contract**: Optional prop `preview` with `{ signedIn: boolean; email: string; role: "trainee" | "trainer" | null; pathname: string }`. When `preview` is set, call `topbarModel` with it and do not read `Astro.locals` or Supabase. When it is absent, `signedIn` comes from `Astro.locals.user`, `email` from `user.email ?? ""`, `pathname` from `Astro.url.pathname`, and `role` from `readProfileRole` when there is a user and a Supabase client. A missing client or a null role uses the email-only signed-in model. Pass the model into `TopbarActions`. Keep the existing shell classes (`border-border bg-card text-muted-foreground`, border, padding, `rounded-xl`, `text-sm`). `Welcome.astro` keeps rendering `<Topbar />` with no preview.

#### 5. Greeting and actions

**File**: `src/components/TopbarActions.tsx`

**Intent**: Show the model: greeting and email on the left, links and Sign out on the right.

**Contract**: Props are the `topbarModel` return value. The island has one root with `flex w-full flex-wrap items-center justify-between gap-3`, because `client:load` mounts inside `astro-island` and a fragment is not a flex child of the shell. Render `greeting` when it is not null, and `email` when it is not null. Each link is a ghost `Button` `asChild` around an anchor. The current anchor has `aria-current="page"` and `font-semibold text-card-foreground`. When `showSignOut` is true, keep the POST form to `/api/auth/signout` with a ghost submit button labeled "Sign out" and no `aria-current`. Remove the "Not signed in" and "Dashboard" copy.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including guest on `/` marking nothing, Sign in marked on `/auth/signin`, Sign up marked on `/auth/signup`, Home marked on `/` when signed in, Measurements marked on `/dashboard` with href `/dashboard`, a signed-in user on `/auth/signin` marking nothing, "Hello trainee" and "Hello trainer" with the email, and email-only with greeting null when role is null
- `npm run lint` passes
- `npm run check:home-tokens` passes

#### Manual Verification:

- On `/`, a guest reads "Hello guest" with Sign in and Sign up, neither link is marked, and the hero under Training Manager still shows Sign in and Sign up
- On `/`, a signed-in trainee reads "Hello trainee", their email, Home marked, Measurements linking to `/dashboard`, and Sign out
- On `/`, a signed-in trainer reads "Hello trainer", their email, Home marked, Measurements, and Sign out
- On `/`, a signed-in user with no profile row reads only their email, with Home, Measurements, and Sign out, and does not read "Hello guest", "Hello trainee", or "Hello trainer"

Sign-in redirects to `/dashboard`, and that page's `ensureProfile` inserts the row before the user can open `/`. To see the email-only bar, delete that user's `profiles` row while the session still exists, then open `/` directly. Do not load `/dashboard` again before checking the bar.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Auth and both dashboards

### Overview

Mount the same bar on sign-in, sign-up, and `/dashboard`, and remove the Sign out control under the measurements.

### Changes Required:

#### 1. Sign-in and sign-up

**File**: `src/pages/auth/signin.astro`

**File**: `src/pages/auth/signup.astro`

**Intent**: Show the bar at the top of each auth screen without centering it inside the card.

**Contract**: The page is a `min-h-screen` column with the same outer padding as the home (`p-4 sm:p-8`). `<Topbar />` is the first child, with no `preview`. The existing card stays in a centering wrapper that is a sibling below the bar, not a parent of the bar, and not inside the bar. Do not change the form, the error query, or the footer link to the other auth page.

#### 2. Dashboard

**File**: `src/pages/dashboard.astro`

**Intent**: Show one bar above both the journal and the trainer panel.

**Contract**: Render `<Topbar />` once, with no `preview` and without passing the page's `role`. Place it in a top padding wrapper (`p-4 sm:p-8`) that is a sibling above `TraineeJournal` and `TrainerPanel`. Leave `ensureProfile` and the rest of the frontmatter as they are. Do not put the bar inside either card.

#### 3. Remove the card Sign out

**File**: `src/components/journal/TraineeJournal.astro`

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Sign out exists only in the bar, including when the trainer panel is in unavailable mode.

**Contract**: Delete the POST form whose action is `/api/auth/signout` from both components. Leave every other string, including "Could not open your journal", the measurement form, and the trainee links.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npm run build` passes

#### Manual Verification:

- A guest on `/auth/signin` sees the bar above the card, with Sign in marked and Sign up not marked
- A guest on `/auth/signup` sees the bar above the card, with Sign up marked and Sign in not marked
- A signed-in trainee on `/auth/signin` reads "Hello trainee", their email, Home, Measurements, and Sign out, and nothing is marked
- A trainee on `/dashboard` sees Measurements marked, and the journal card has no Sign out
- A trainer on `/dashboard?trainee=abc` sees Measurements marked with href `/dashboard`; clicking it opens `/dashboard` with no query, the most recently linked trainee is selected, and the panel has no Sign out
- `/auth/confirm-email` has no top bar

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Kitchen sinks

### Overview

Make the home sink show the bar states without a session, and stop the journal and trainer sinks from documenting a Sign out control on the card.

### Changes Required:

#### 1. Home sink

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Show the five bar results the product can produce, still without reading a session.

**Contract**: Keep the sink session-free. Render `<Topbar preview={...} />` for these cases, and say in the section prose what each one stands for:

- Guest, pathname `/`: "Hello guest", nothing marked.
- Guest, pathname `/auth/signin`: Sign in marked.
- Trainee, email `ada@example.com`, pathname `/`: "Hello trainee", Home marked.
- Trainer, email `ada@example.com`, pathname `/dashboard`: "Hello trainer", Measurements marked, href `/dashboard`. The prose states this is the bar for `/dashboard?trainee=abc`.
- Signed in, role null, email `ada@example.com`, pathname `/dashboard`: the email only, Measurements marked, no Hello line.

Do not link this sink from the product. Leave the existing hero samples in place.

#### 2. Journal and trainer sinks

**File**: `src/pages/kitchen-sink/journal.astro`

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: The card examples match the product, which no longer has Sign out under the measurements.

**Contract**: Remove Sign out from the rendered journal and trainer examples, including the unavailable trainer panel. Update the Hover and Focus-visible prose that tells the reader to tab to that card Sign out. Do not add a second product bar to these sinks; the bar states live on the home sink.

#### 3. Token check

**File**: `scripts/check-home-tokens.mjs`

**Intent**: Keep the sink markup that gains the bar on the same token rule as the product views.

**Contract**: In `src/pages/kitchen-sink/home.astro`, reword the focus-visible sample that currently contains `focus-visible:ring-[3px]` so the file source no longer contains `-[3px]`. The checker matches that substring anywhere, including prose. Then add `src/pages/kitchen-sink/home.astro` and `src/pages/kitchen-sink/journal.astro` to `FILES`. `kitchen-sink/journal.astro` has no such match. `src/pages/kitchen-sink/trainer.astro` is already listed.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes

#### Manual Verification:

- `/kitchen-sink/home` shows the five preview bars: guest on `/` with nothing marked, guest on `/auth/signin` with Sign in marked, trainee `ada@example.com` on `/` with Home marked, trainer `ada@example.com` with Measurements href `/dashboard` marked, and email-only `ada@example.com` with no Hello line
- The journal and trainer sinks no longer show Sign out on the card, and their hover and focus notes no longer tell you to tab to a card Sign out

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `src/lib/topbar.test.ts` covers the path-match rule, the signed-in bar on an auth path, the Measurements href without a query, and the three signed-in greetings (trainee, trainer, email-only).
- No test calls `ensureProfile` or Supabase. The read helper's null cases are covered by the component contract, not by a live database test.

### Integration Tests:

- No new smoke assertion. `scripts/smoke.mjs` does not look at the bar. `npm run build` in Phase 2 checks that the four pages still compile.

### Manual Testing Steps:

1. Open `/` signed out. Confirm "Hello guest", unmarked Sign in and Sign up, and the hero buttons still present.
2. Sign in as a trainee. Confirm "Hello trainee", the email, Home marked on `/`, Measurements marked on `/dashboard`, and no Sign out on the journal card. Sign out from the bar and land on `/`.
3. Sign in as a trainer with a trainee selected (`/dashboard?trainee=...`). Confirm Measurements is marked, then click it and confirm the address is `/dashboard` with no query and the most recently linked trainee is selected.
4. Open `/auth/signin` and `/auth/signup` signed out, then open `/auth/signin` while signed in. Confirm the guest marks and the signed-in bar with nothing marked.
5. Open `/kitchen-sink/home` and the journal and trainer sinks. Confirm the five previews and the missing card Sign out.
6. With a session still active, delete that user's `profiles` row, then open `/` directly. Do not open `/dashboard` first. Confirm the bar shows only the email, with Home, Measurements, and Sign out, and no Hello line.

## Performance Considerations

Each signed-in render of the bar selects that user's `profiles` row once and does not insert. The roadmap's scale is small. Do not cache the role in the session and do not move the read into middleware.

## Migration Notes

No migration. `profiles_select_own` already allows the signed-in user to read their own row. A failed or denied read is the email-only bar, not an error page.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-11, MS-05). No `research.md` for this change.
- Current bar: `src/components/Topbar.astro`, `src/components/TopbarActions.tsx`
- Current-page pattern: `src/components/trainer/TrainerPanel.astro` (`aria-current="page"`, `font-semibold text-card-foreground`)
- Profile read and insert: `src/lib/services/ensure-profile.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Bar contract

#### Automated

- [x] 1.1 `npm test` passes, including guest on `/` marking nothing, Sign in marked on `/auth/signin`, Sign up marked on `/auth/signup`, Home marked on `/` when signed in, Measurements marked on `/dashboard` with href `/dashboard`, a signed-in user on `/auth/signin` marking nothing, "Hello trainee" and "Hello trainer" with the email, and email-only with greeting null when role is null — 8dacfb9
- [x] 1.2 `npm run lint` passes — 8dacfb9
- [x] 1.3 `npm run check:home-tokens` passes — 8dacfb9

#### Manual

- [x] 1.4 On `/`, a guest reads "Hello guest" with Sign in and Sign up, neither link is marked, and the hero under Training Manager still shows Sign in and Sign up — 8dacfb9
- [x] 1.5 On `/`, a signed-in trainee reads "Hello trainee", their email, Home marked, Measurements linking to `/dashboard`, and Sign out — 8dacfb9
- [x] 1.6 On `/`, a signed-in trainer reads "Hello trainer", their email, Home marked, Measurements, and Sign out — 8dacfb9
- [x] 1.7 On `/`, a signed-in user with no profile row reads only their email, with Home, Measurements, and Sign out, and does not read "Hello guest", "Hello trainee", or "Hello trainer" — 8dacfb9

### Phase 2: Auth and both dashboards

#### Automated

- [x] 2.1 `npm run lint` passes — 2c2a3df
- [x] 2.2 `npm run check:home-tokens` passes — 2c2a3df
- [x] 2.3 `npm run build` passes — 2c2a3df

#### Manual

- [x] 2.4 A guest on `/auth/signin` sees the bar above the card, with Sign in marked and Sign up not marked — 2c2a3df
- [x] 2.5 A guest on `/auth/signup` sees the bar above the card, with Sign up marked and Sign in not marked — 2c2a3df
- [x] 2.6 A signed-in trainee on `/auth/signin` reads "Hello trainee", their email, Home, Measurements, and Sign out, and nothing is marked — 2c2a3df
- [x] 2.7 A trainee on `/dashboard` sees Measurements marked, and the journal card has no Sign out — 2c2a3df
- [x] 2.8 A trainer on `/dashboard?trainee=abc` sees Measurements marked with href `/dashboard`; clicking it opens `/dashboard` with no query, the most recently linked trainee is selected, and the panel has no Sign out — 2c2a3df
- [x] 2.9 `/auth/confirm-email` has no top bar — 2c2a3df

### Phase 3: Kitchen sinks

#### Automated

- [x] 3.1 `npm run lint` passes — e83f1c3
- [x] 3.2 `npm run check:home-tokens` passes — e83f1c3

#### Manual

- [x] 3.3 `/kitchen-sink/home` shows the five preview bars: guest on `/` with nothing marked, guest on `/auth/signin` with Sign in marked, trainee `ada@example.com` on `/` with Home marked, trainer `ada@example.com` with Measurements href `/dashboard` marked, and email-only `ada@example.com` with no Hello line — e83f1c3
- [x] 3.4 The journal and trainer sinks no longer show Sign out on the card, and their hover and focus notes no longer tell you to tab to a card Sign out — e83f1c3
