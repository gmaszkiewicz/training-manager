---
date: 2026-10-27T14:14:55+01:00
researcher: Claude (Opus 5.5) for gmaszkiewicz
git_commit: fb30bc3e4a5eef423b496d74739c7d1a7429bc68
branch: main
repository: gmaszkiewicz/training-manager
topic: "Notification system with a top-bar bell and a Hub Notifications table (S-39, MS-30)"
tags: [research, codebase, notifications, trainer-links, topbar, hub, supabase, rls]
status: complete
last_updated: 2026-10-27
last_updated_by: Claude (Opus 5.5)
---

# Research: Notification system with a top-bar bell and a Hub Notifications table

**Date**: 2026-10-27T14:14:55+01:00
**Researcher**: Claude (Opus 5.5) for gmaszkiewicz
**Git Commit**: fb30bc3e4a5eef423b496d74739c7d1a7429bc68 (working tree also has an uncommitted roadmap.md edit adding S-39)
**Branch**: main
**Repository**: gmaszkiewicz/training-manager

## Research Question

From `change.md`: what does the codebase offer, and what must change, to deliver

- a bell between the menu and the avatar showing the unread count, hidden at zero, opening a list with a link to Hub → Notifications;
- clicking a notification marks it read and opens its source page (e.g. Collaborations);
- a Hub Notifications tab beside Collaborations: a table like measurements, with a checkbox per row and a select-all, bulk mark-read and permanent delete, paged 5/10/15;
- events: trainer — request accepted / declined, trainee X unlinked; trainee — trainer X sent a request, trainer X unlinked.

The roadmap (S-39, `context/foundation/roadmap.md`, uncommitted) leaves three unknowns open: trigger vs API-route writes, live vs page-load count, and where a notification leads when its source is gone.

## Summary

- **All four link events pass through three SECURITY DEFINER RPCs on one table, `public.trainer_links`.** Its `status` is just `pending | accepted`. Decline, cancel, unlink and remove are all one `DELETE` in `remove_trainer_link`, which does not read the row's status first. The route's `intent` field is client-supplied and only picks the toast wording.
- **An `AFTER INSERT / UPDATE / DELETE` trigger on `trainer_links` can classify every required event without changing any RPC.** It would combine `auth.uid()` (the actor) with `NEW`/`OLD.status`:
  - insert pending → trainee notified "trainer X sent a request";
  - update pending→accepted → trainer notified "accepted";
  - delete of a pending row by the trainee → trainer notified "declined";
  - delete of an accepted row → the other side notified "X unlinked".

  Because the RPC signatures stay the same, the previous Worker keeps working on the new schema. This repo has no triggers yet, so this would be the first.
- **Names must be captured inside definer code.** RLS on `profiles` is own-row only, and emails live in `auth.users`. Today, other users' names are read only through definer functions, and the display format is `topbarName` ("A. Lovelace" / single name / email).
- **The bell has a natural per-request data point:** `Topbar.astro` already makes a Supabase client and reads the profile on every signed-in render. It passes plain props to one `client:load` `TopbarActions` island. Nothing refreshes on the client today. The shared `DropdownMenu` carries the iOS Safari first-tap fix.
- **Measurements already has a per-row and a tri-state select-all `Checkbox`, but no bulk action.** Its 5/10/15 page size is a per-user localStorage/cookie preference, not a URL param. Hub Collaborations instead pages server-side via `?page=` with a fixed size of 5. Neither pager is a shared component.
- **Tests expected for a feature like this:** Vitest units next to `src/lib` helpers, smoke steps in `scripts/smoke.mjs` (including RLS refusals), a Playwright spec, kitchen-sink states, and entries in the hand-maintained `check-home-tokens` file list.

## Detailed Findings

### 1. Link lifecycle — where each event happens

All three RPCs are in `supabase/migrations/20261027120000_trainer_link_requests.sql`.

| Event (spec) | Route | Service | RPC / DB effect | Actor |
|---|---|---|---|---|
| Trainer sends a request | `POST /api/trainer-links` (`src/pages/api/trainer-links/index.ts:57-92`) | `requestTraineeLink` (`src/lib/services/trainer-links.ts:36-52`) | `request_trainee_link(p_email)` (`:84-147`) inserts `status='pending'` `on conflict do nothing` (`:127-129`). Only a real insert returns `'sent'` (`:130-132`). | trainer |
| Trainee accepts | `POST /api/collaborations/accept` (`accept.ts:18-44`) | `acceptTrainerLink` (`trainer-links.ts:138-153`) | `accept_trainer_link(p_trainer_id)` (`:265-294`) updates pending→accepted and sets `linked_at` (`:285-290`) | trainee |
| Decline / cancel / unlink / remove | `POST /api/collaborations/remove` (`remove.ts:27-54`) | `removeTrainerLink` (`trainer-links.ts:155-170`) | `remove_trainer_link(p_other_id)` (`:301-332`) runs `DELETE` at any status, with the branch chosen by `profiles.role` (`:318-328`) | trainer or trainee |

- The comment at migration `:300` states that one removal covers cancel and unlink (trainer) and decline and remove (trainee), at any status.
- `remove.ts:17` accepts `intent ∈ {cancel, unlink, decline, remove}` but only uses it to choose the notice code (`remove.ts:19-25, 53`). The DB never sees it, so it must not be trusted to classify an event.
- The UI sends the intents as follows:
  - `cancel`: trainer on a pending row (`src/components/hub/CollaborationRowActions.tsx:32`)
  - `decline`: trainee on a pending row (`:36`)
  - `unlink` / `remove`: linked row (`src/components/hub/ConfirmRemoveToast.tsx:56`)
- Identity available inside the RPCs on this inspected path:
  - `request_trainee_link`: trainer id, trainee id and normalized trainee email
  - `accept_trainer_link`: trainer id and trainee id
  - `remove_trainer_link`: caller id, role and other id

  None of them reads names today.

**Trigger classification (inference, verified against the RPC bodies above).** Inside an `AFTER` row trigger, `auth.uid()` still returns the JWT caller because it reads request claims, which SECURITY DEFINER does not change. The trigger would map:

| Trigger op | Row state | Actor (`auth.uid()`) | Notify | Kind |
|---|---|---|---|---|
| INSERT | `NEW.status='pending'` | trainer | `NEW.trainee_id` | link_requested |
| UPDATE | `OLD.status='pending'` → `NEW.status='accepted'` | trainee | `NEW.trainer_id` | link_accepted |
| DELETE | `OLD.status='pending'` | trainee | `OLD.trainer_id` | link_declined |
| DELETE | `OLD.status='pending'` | trainer | — (cancel; not in the spec) | — |
| DELETE | `OLD.status='accepted'` | trainee | `OLD.trainer_id` | link_removed_by_trainee |
| DELETE | `OLD.status='accepted'` | trainer | `OLD.trainee_id` | link_removed_by_trainer |
| any | — | null (e.g. a `profiles` cascade delete, or the service role) | — | skip |

- The alternative is to insert notifications inside the three RPCs via `create or replace` with unchanged signatures. That is also backward compatible. `remove_trainer_link` would then have to read `status` before deleting, because it does not today (`:318-328`).
- Inserting from the API routes would require a user to create a row for someone else, which the S-39 risk forbids. It would also miss events from the previous Worker.

### 2. Schema, RLS and grant conventions

- The `trainer_links` table is defined at `20260928170000_trainer_links.sql:1-9`, with PK `(trainer_id, trainee_id)` and FKs to `profiles` `on delete cascade`.
- The `status` column was added in `20261027120000:2-9` (check `in ('pending','accepted')`), with an index on `trainee_id` at `:11`.
- `trainer_links` RLS has a single select policy for the trainer, `trainer_links_select_own` (`20260928170000:13-17`). A trainee reads rows only through `list_trainee_collaborations`.
- Grants on `trainer_links`: `revoke all … from anon, authenticated` and `grant select … to authenticated` (`20260928170000:19-21`).
- The definer-function style used by every link RPC:
  - `security definer`, `set search_path = ''`, `pg_catalog.`-qualified calls
  - `revoke all on function … from public, anon`, `grant execute … to authenticated` (e.g. `20261027120000:149-151`)
  - a role check against `profiles` at the start
- Policies use one policy per operation, named `<table>_<op>_own`, `to authenticated`:
  - profiles: `20260927065512:10-20`
  - avatars: `20261026150000_profile_avatar.sql:18-37`
- Column-level update grants already exist: `grant update (first_name, last_name) on public.profiles to authenticated` (`20261026120000_profile_names.sql:11`). This is a precedent for "mark read": grant `update (read_at)` only, plus an own-row update policy.
- There are no triggers in `supabase/migrations/` (no file matched a search for "trigger").
- There is no `supabase/tests` (pgTAP) directory.

### 3. Names and emails for "X"

- `profiles.first_name` and `profiles.last_name` are nullable, 1–50 characters (`20261026120000:1-9`). Emails are only in `auth.users`. `trainer_links.email` holds the trainee's request-time email.
- Profiles RLS is own-row, so other users' names are read only in definer functions:
  - `list_trainer_collaborations` joins `profiles` (`20261027120000:186-197`)
  - `list_trainee_collaborations` joins `profiles` and `auth.users` (`:241-255`)
- The display rule is `topbarName` (`src/lib/topbar.ts:53-68`), applied to collaborations by `toCollaboration` (`src/lib/collaborations.ts:35-43`).
- Two ways to name "X", a genuine design choice:
  - **Snapshot:** the trigger stores the actor's first name, last name and email on the notification row, and the app formats them with `topbarName`. The name is frozen at event time and needs no extra read path.
  - **Live join:** store `actor_id` and read through a definer list function. The name is current but needs one more RPC, and the row must cope with the actor's account being deleted (FK `on delete set null` or `cascade`).

### 4. Top bar — where the bell goes and how it gets data

- In `src/components/TopbarActions.tsx`, the right-hand row is `flex shrink-0 items-center gap-3`. It holds, in order:
  - desktop links, `hidden` below `measurement-row` (`:109`)
  - the hamburger `DropdownMenu` (`aria-label="Menu"`, `:121`), hidden at `measurement-row` and above
  - the avatar `AccountMenu` (`:140`, defined at `:60`), rendered only when `account` is set
- The bell slot "between the menu and the avatar" is therefore right before `:140`:
  - on a phone, after the hamburger
  - on desktop, after the inline links
  - for a guest, nowhere (no `account`)
- `src/components/Topbar.astro:13-40` gathers data on the server on every render: `Astro.locals.user`, `createClient`, `readTopbarProfile` and `avatarPublicUrl`, then `topbarModel(...)`. It renders `<TopbarActions client:load greeting name links account />` (`:44`).
- An unread count (and optionally the latest N notifications) can be queried right next to `readTopbarProfile` and added to `TopbarModelInput` / `TopbarAccount` (`src/lib/topbar.ts:3-39`).
- Under that approach the count is page-load fresh only. There is no client store or polling anywhere in the top bar.
- The `preview` prop (`Topbar.astro:8-10, 16-17`) bypasses fetching. The home kitchen sink uses it, which is the hook for bell states.
- `src/lib/topbar.test.ts` compares whole model objects, so new fields mean updating its fixtures.
- Pages that render `<Topbar />`:
  - `Welcome.astro` (home)
  - auth pages
  - `measurements.astro`, `profile.astro`, `profile/avatar.astro`
  - `settings.astro`, `hub/collaborations.astro`
  - the kitchen sinks
- `src/middleware.ts` only resolves the user and guards `PROTECTED_ROUTES = ["/measurements", "/profile", "/hub", "/settings"]` (`:4`) by prefix (`:18`). `/hub/notifications` and any `/api/notifications/*` would need their own auth checks, the way the existing API routes do (`remove.ts:28-31`).
- **iOS Safari fix:** `src/components/ui/dropdown-menu.tsx` wraps Radix with a controlled open state, and its trigger prevents `pointerdown` and toggles on click. A bell built on the shared `DropdownMenu` inherits the fix; a new Popover primitive would not. Covered by `tests/e2e/measurements-menus.spec.ts` and `account-menu.spec.ts`.
- **POSTing from a dropdown item:** `CollaborationRowActions.tsx` calls `requestSubmit()` on hidden forms rendered beside the trigger, because the menu content is portaled. A notification item can follow the same pattern: a POST to a mark-read route that redirects to the source page.

### 5. Hub — adding a Notifications tab

- `src/lib/hub-tabs.ts:1` holds `HUB_TABS` with a single `collaborations` entry. `src/pages/hub.astro` redirects to `/hub/collaborations`.
- `AccountTabs` (`src/components/account/AccountTabs.tsx`) renders link tabs to separate pages, marks the current one from a server-supplied `current`, and is SSR-only.
- `TabsContent` is capped at `max-w-sm` (`AccountTabs.tsx:29`). A measurements-like table will likely need that width widened or made a prop.
- A new tab means a `notifications` entry in `HUB_TABS` and a new `src/pages/hub/notifications.astro` built on the `collaborations.astro` skeleton (Layout, Topbar, `PageErrorToasts`, `AccountTabs`).
- Hub actions are form POSTs that redirect with `?notice=` / `?error=`, shown by `PageErrorToasts` (`src/components/measurements/PageErrorToasts.tsx`). The project has no sonner.

### 6. Table pattern — "like measurements"

- **Selection already exists in `MeasurementBrowser.tsx`:**
  - `Checkbox` import at `:15`
  - row checkbox at `:511`
  - select-all at `:1197-1202` (`aria-label="Select all"`), tri-state over visible rows (`:910-912`)
  - state `selectedIds: ReadonlySet<string>` (`:782`)

  Nothing consumes the selection: there is no bulk action or bulk API anywhere. Bulk mark-read and bulk delete are new.
- **Page size:**
  - `pageSizes = [5, 10, 15]` and `defaultPageSize = 5` (`src/lib/measurement-page.ts:4-8`)
  - the control is a `role="group" aria-label="Entries per page"` of `aria-pressed` buttons (`MeasurementBrowser.tsx:1162`)
  - the size and page are kept in localStorage and mirrored into cookies (`measurement-page.ts:50-64`, `measurements.astro:75-111`)
  - page changes fetch JSON from `GET /api/measurements` (`MeasurementBrowser.tsx:721-745`)
- **Collaborations paging** is different: `?page=` in the URL, a fixed `collaborationPageSize = 5`, `collaborationMaxPage = 10_000` (`src/lib/collaborations.ts:6-8`). Totals come from `count(*) over ()` in the list RPCs. If the requested page is empty, `readCollaborationPage` falls back to the last page (`trainer-links.ts:54-135`). The pager is `<a href>` links (`CollaborationsList.astro:152-184`).
- Neither pager is shared. S-37 explicitly kept extracting one out of scope (archived plan). There is no `src/components/hooks/` directory yet.
- For a server-rendered Hub page, the closest fit is Collaborations-style `?page=&size=` in the URL with zod validation:
  - `parseCollaborationPage`-style lenient parsing on the page
  - `z.enum(["5","10","15"])`-style strict parsing in the API, as `src/pages/api/measurements/index.ts:16-18` does

  plus the measurements visuals for the checkboxes and the size group. Whether the size should also persist like measurements is a product choice.

### 7. Tests and gates a feature like this is expected to touch

- **Unit:** Vitest, `src/**/*.test.ts` next to the lib (e.g. `src/lib/collaborations.test.ts`, `measurement-page.test.ts`).
- **Smoke:** `scripts/smoke.mjs`, whose Hub steps cover request, accept, unlink, decline and cancel with exact redirect locations, e.g. request `:665-745`, decline `:1040`, cancel `:1055`. Earlier changes used smoke for REST-level RLS refusals.
- **E2E:** `tests/e2e/hub-collaborations.spec.ts:112` covers request → accept → unlink with a throwaway trainer. This is the natural place to assert that the bell appears and the notifications arrive.
- **Migration check:** `scripts/migration-check.mjs` checks that a measurement row survives the newest migration. It must still pass once the notifications migration is the newest file.
- **Token check:** `scripts/check-home-tokens.mjs` checks a hard-coded `FILES` list (`:7-49`). A new bell component, notifications page or list, or a `ui/badge` must be added to that list by hand to be checked.
- **Kitchen sinks:**
  - `src/pages/kitchen-sink/hub.astro` has states for Collaborations
  - `src/pages/kitchen-sink/home.astro` renders `<Topbar preview>` per state
  - `CLAUDE.md` lists each kitchen sink
- `src/components/ui` has `avatar`, `button`, `checkbox`, `dropdown-menu`, `input`, `label`, `table`, `tabs` and `textarea`. `badge` and `popover` are absent.
- Count-badge tokens: `--primary` / `--primary-foreground`, `--destructive` (with no `-foreground`), and `--smoke` / `--smoke-foreground` (`src/styles/global.css:15-25`).

## Code References

- `supabase/migrations/20261027120000_trainer_link_requests.sql:84-147` — `request_trainee_link`, pending insert, returns `'sent'` on a new row
- `supabase/migrations/20261027120000_trainer_link_requests.sql:265-292` — `accept_trainer_link`
- `supabase/migrations/20261027120000_trainer_link_requests.sql:299-329` — `remove_trainer_link`, one `DELETE` for all four removal cases
- `supabase/migrations/20260928170000_trainer_links.sql:1-21` — table, RLS and grants
- `supabase/migrations/20261026120000_profile_names.sql:11` — column-level update grant precedent
- `src/pages/api/collaborations/remove.ts:17-53` — client `intent` used only for notice wording
- `src/lib/services/trainer-links.ts:36-170` — link services and the Collaborations page reader
- `src/components/Topbar.astro:13-44` — per-request top bar data and the island props
- `src/components/TopbarActions.tsx:60,109,121,140` — AccountMenu, desktop links, hamburger, avatar slot
- `src/components/ui/dropdown-menu.tsx` — iOS first-tap fix
- `src/lib/topbar.ts:3-68` — model types and `topbarName`
- `src/lib/hub-tabs.ts:1`, `src/components/account/AccountTabs.tsx:29` — Hub tabs and the `max-w-sm` content cap
- `src/components/measurements/MeasurementBrowser.tsx:782,910-912,1162,1197-1202` — selection state, select-all, size group
- `src/lib/measurement-page.ts:4-8,50-64` — page sizes and persisted preferences
- `src/lib/collaborations.ts:6-8` — Collaborations page size and max page
- `src/middleware.ts:4,18` — protected route prefixes
- `scripts/check-home-tokens.mjs:7-49` — hand-maintained file list

## Architecture Insights

- Link state changes are funnelled through definer RPCs with role checks. Users have no direct write grants on `trainer_links`. Notifications would follow the same rule:
  - no `insert` grant to `authenticated`
  - rows written only by definer code (trigger or RPC)
  - per-operation own-row `select` / `update (read_at)` / `delete` policies
- Hub pages are server-rendered with form POST → redirect → toast. The top bar is one `client:load` island fed by server props. Both point to page-load-fresh data unless a polling or realtime layer is added.
- Storing a `kind` on each notification and deriving the target href in app code (all four kinds → `/hub/collaborations`) avoids storing arbitrary URLs. It also makes the mark-read redirect safe from open redirects. When "the source is gone" (e.g. the link was removed later), Collaborations still exists, so the target always resolves for the current kinds.
- Migration order: a new table plus a trigger is additive. The previous Worker calls unchanged RPC signatures and simply produces notifications it does not display, which keeps to the "add first" rule in `CLAUDE.md`.

## Historical Context (from prior changes)

- `context/archive/2026-10-27-hub-collaborations-handle/plan.md:65-66` explicitly left out of scope "The trainer is not notified of a decline; the row simply disappears" and "Any email or in-app notification to the trainee when a request arrives". This change picks up exactly those deferrals. The same plan chose delete-on-decline/cancel (no history), which is why classifying events needs `OLD.status` plus the actor.
- The same archive kept extracting a shared pager or confirm toast out of scope and fixed Collaborations at five per page.
- `context/archive/2026-10-27-drop-link-trainee-by-email/` applied "add first, drop later" in practice, and smoke pins that a declined request can be re-sent at once. Each re-send would create a new "request" notification.
- Earlier plans that also mentioned notifications as out of scope: `context/archive/2026-09-28-trainer-link-preview/plan-brief.md:67`, `context/archive/2026-10-10-handle-change-and-reset-pass/plan.md:36`.

## Related Research

- `context/archive/2026-10-27-hub-collaborations-handle/` (plan, review, follow-ups): the link request model this change builds on.

## Open Questions

Product or design choices for `/10x-plan`. None blocks the plan's structure.

1. **Write path:** an `AFTER` trigger on `trainer_links` (no RPC changes, sees the actor and `OLD.status`) or inserts inside the three RPCs. Both are backward compatible; inserts from API routes are not acceptable (see §1).
2. **Trainer cancels a pending request:** should the trainee be told? This event is not in the listed spec, and today the request just vanishes from the trainee's Hub.
3. **"X" naming:** a snapshot at event time or a live join (§3). This also decides what happens when the actor's account is deleted.
4. **Freshness of the bell:** page load only (fits the current architecture) or polling / Supabase Realtime.
5. **Bell list contents:** unread only or the latest N (read and unread), and how many. Also whether `Topbar.astro` fetches the list on every page or the dropdown fetches it lazily on open.
6. **Page-size persistence for the Notifications table:** URL only, like Collaborations, or a remembered per-user preference, like measurements.
7. **Retention:** whether read notifications are ever purged automatically. The spec only has user-driven permanent delete.
