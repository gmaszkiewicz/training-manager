# Notification System Implementation Plan

## Overview

Tell trainers and trainees about trainer-link events. Notifications are written by the database, never by a user. Two places show them:

- a bell in the top bar, between the menu and the avatar, with the unread count; it lists the latest five unread;
- a Hub → Notifications table, paged 5/10/15, with a checkbox per row and a select-all checkbox, where the selected notifications can be marked read or deleted for good.

Clicking a notification marks it read and opens the page it came from (Collaborations for every current kind).

## Current State Analysis

- All link changes go through three SECURITY DEFINER RPCs on `public.trainer_links` (`supabase/migrations/20261027120000_trainer_link_requests.sql`):
  - `request_trainee_link` inserts a `pending` row (`:127-132`);
  - `accept_trainer_link` updates `pending → accepted` (`:285-291`);
  - `remove_trainer_link` deletes the row at any status (`:318-328`).

  `status` is only `pending | accepted`.
- The route's `intent` (`src/pages/api/collaborations/remove.ts:17-25`) is client-supplied and only picks the toast wording. It cannot classify an event.
- No migration has a trigger yet, and there is no notifications table, type or UI.
- Other users' names can only be read in definer code: `profiles` RLS is own-row, and email lives in `auth.users`. Names are displayed with `topbarName` (`src/lib/topbar.ts:53-68`).
- `src/components/Topbar.astro:13-44` already creates a Supabase client and reads the profile on every signed-in render. It feeds the single `TopbarActions` `client:load` island, where the avatar slot is `src/components/TopbarActions.tsx:140`.
- The Hub has one tab (`src/lib/hub-tabs.ts:1`). Its tab content is capped at `max-w-sm` (`src/components/account/AccountTabs.tsx:29`). Actions are form POST → redirect with `?notice=` / `?error=` → `PageErrorToasts`.
- `MeasurementBrowser.tsx` has the row checkbox (`:511`), the tri-state select-all (`:1197-1202`, computed `:910-912`) and the "Entries per page" button group (`:1162`). No bulk action exists anywhere.

## Desired End State

- Each of these link events inserts exactly one notification for the other party:

  | Event | Recipient |
  |---|---|
  | Trainer sends a request | trainee |
  | Trainee accepts | trainer |
  | Trainee declines a pending request | trainer |
  | Trainer withdraws (cancels) a pending request | trainee |
  | Trainee unlinks an accepted link | trainer |
  | Trainer unlinks an accepted link | trainee |

  The notification stores a snapshot of the actor's role, first name, last name and email.
- A user can read, update `read_at` on, and delete only their own notifications. No authenticated or anon user can insert one.
- The signed-in top bar shows a bell before the avatar while the user has at least one unread notification. Its badge carries the unread count, and the dropdown lists the newest five unread plus "See all notifications" (→ `/hub/notifications`). Clicking an item marks it read and redirects to `/hub/collaborations`. With zero unread, no bell is rendered.
- `/hub/notifications` (tab after Collaborations; `/hub` still redirects to Collaborations) lists the user's notifications, newest first. It supports `?page=&size=` (5/10/15, default 5), per-row and select-all checkboxes, "Mark as read" and "Delete" for the selection (delete asks for confirmation), and a pager.
- Verify with `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke`, `npm run migration-check` and `npx playwright test`.

### Key Discoveries:

- Inside an AFTER row trigger, `auth.uid()` still returns the JWT caller. The trigger can therefore classify an event from the actor plus `OLD.status` / `NEW.status` without touching the RPCs, and the previous Worker keeps working (research §1).
- `remove_trainer_link` does not read status before deleting (`20261027120000:318-328`), so the trigger is the only place that sees what was removed.
- There is precedent for column-level update grants: `20261026120000_profile_names.sql:11`. Per-operation `_own` policies are written as in `20261026150000_profile_avatar.sql:18-37`.
- The shared `DropdownMenu` carries the iOS Safari first-tap fix (`src/components/ui/dropdown-menu.tsx`). Portaled menu items POST through hidden forms with `requestSubmit()` (`src/components/hub/CollaborationRowActions.tsx`).
- `readCollaborationPage` falls back to the last page when the requested one is empty (`src/lib/services/trainer-links.ts:54-135`). That pattern is reused here.
- `scripts/check-home-tokens.mjs:7-49` checks a hand-maintained file list, so new view files must be added to it.
- The existing smoke Hub sequence already runs request → accept → unlink → re-request → decline → re-request → cancel (`scripts/smoke.mjs` around `:665-1056`). Notification assertions slot in after each of those steps.

## What We're NOT Doing

- Live updates: no polling and no Supabase Realtime. The bell is fresh on each page load.
- Email or push notifications.
- Automatic retention or purge of read notifications. Deletion is user-driven only.
- Marking a notification unread again from the UI.
- Updating names in old notifications when the actor later renames. Snapshots are frozen at event time.
- Removing an earlier "request" notification when the request is withdrawn. A separate "withdrew" notification is sent instead.
- Remembering the Notifications page size across visits. It lives in the URL only.
- Extracting a shared pager, selection hook or confirm component from measurements or Collaborations.
- Changing the existing link RPCs, the `/hub` redirect, or Collaborations behaviour.

## Implementation Approach

Work database-first, in five phases:

1. **Database.** A single additive migration creates the table, its RLS and grants, and a SECURITY DEFINER trigger function attached AFTER INSERT / UPDATE OF status / DELETE on `trainer_links`. Because the RPC signatures stay the same, the migration is backward compatible: the previous Worker simply produces notifications it does not show.
2. **Domain and API.** Pure helpers in `src/lib/notifications.ts`, holding copy per kind, target href per kind, and page/size parsing. Service functions in `src/lib/services/notifications.ts`. Three form-POST routes that redirect, in the Hub's style.
3. **Hub table.** A server-rendered page with a React island for selection and bulk actions.
4. **Top bar.** The bell gets its data from one query in `Topbar.astro`: unread rows `limit 5` with `count: "exact"`. The model passes it to a new `NotificationBell` inside `TopbarActions`.
5. **E2E.** Browser coverage of the bell and the table.

## Critical Implementation Details

- **Trigger classification.** Use the table below. Skip the event when `auth.uid()` is null, as on a profile cascade delete or a service-role write. Also skip when the actor is neither `trainer_id` nor `trainee_id`. On UPDATE, fire only for `OLD.status = 'pending' and NEW.status = 'accepted'`. The trigger function must use `security definer`, `set search_path = ''` and `pg_catalog.`-qualified calls, and have `execute` revoked from `public, anon, authenticated`.

  | Op | Old/new status | Actor | Recipient | kind |
  |---|---|---|---|---|
  | INSERT | new `pending` | trainer | `NEW.trainee_id` | `link_requested` |
  | UPDATE | `pending` → `accepted` | trainee | `NEW.trainer_id` | `link_accepted` |
  | DELETE | old `pending` | trainee | `OLD.trainer_id` | `link_declined` |
  | DELETE | old `pending` | trainer | `OLD.trainee_id` | `link_cancelled` |
  | DELETE | old `accepted` | trainee | `OLD.trainer_id` | `link_removed` |
  | DELETE | old `accepted` | trainer | `OLD.trainee_id` | `link_removed` |

- **Open-redirect safety.** The open route redirects only to a path derived from the stored `kind` (`notificationHref`). It never redirects to a URL taken from the request or the row.
- **Idempotent mark-read.** Set `read_at = now()` only where `read_at is null`, so re-opening keeps the first read time.

## Phase 1: Database — notifications table, RLS and trigger

### Overview

Create the storage and the only write path. Prove every event and every RLS refusal over REST in the smoke test.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261027200000_notifications.sql` (newest file; rename the timestamp if another migration lands first)

**Intent**: Add `public.notifications`, its per-operation own-row policies, grants that leave no insert path for users, and the classifying trigger on `trainer_links`.

**Contract**:
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `recipient_id uuid not null references public.profiles(id) on delete cascade`
  - `kind text not null check (kind in ('link_requested','link_accepted','link_declined','link_cancelled','link_removed'))`
  - `actor_role text not null check (actor_role in ('trainer','trainee'))`
  - `actor_first_name text null`
  - `actor_last_name text null`
  - `actor_email text not null`
  - `created_at timestamptz not null default now()`
  - `read_at timestamptz null`
- Indexes:
  - `(recipient_id, created_at desc, id desc)`
  - partial `(recipient_id, created_at desc) where read_at is null`
- RLS enabled. Policies, all `to authenticated`:
  - `notifications_select_own`: select using `recipient_id = auth.uid()`
  - `notifications_update_own`: update using and with check `recipient_id = auth.uid()`
  - `notifications_delete_own`: delete using `recipient_id = auth.uid()`
- Grants: `revoke all on public.notifications from anon, authenticated`; `grant select, delete … to authenticated`; `grant update (read_at) … to authenticated`.
- Function `public.notify_trainer_link_change() returns trigger`, following the classification in Critical Implementation Details. It reads the actor's `profiles.first_name/last_name` and `auth.users.email`. It returns `null` (AFTER trigger).
- Trigger: `create trigger trainer_links_notify after insert or update of status or delete on public.trainer_links for each row execute function public.notify_trainer_link_change()`.

#### 2. Generated database types

**File**: `src/db/database.types.ts`

**Intent**: Regenerate with `npm run db:types` against local Supabase so the service layer is typed.

**Contract**: `Database["public"]["Tables"]["notifications"]` exists.

#### 3. Smoke: events and RLS

**File**: `scripts/smoke.mjs`

**Intent**: Prove that each event yields the right notification for the right user, and that no user can create a notification or touch someone else's.

**Contract**:
- A REST helper reads the newest notification of the signed-in user in a given jar (`kind`, `actor_role`, `actor_email`, `read_at`).
- Event assertions, appended after the existing Hub steps:
  - trainee receives `link_requested` after the request;
  - trainer receives `link_accepted` after the accept;
  - the other side receives `link_removed` after the unlink;
  - trainer receives `link_declined` after the decline;
  - trainee receives `link_cancelled` after the cancel.
- RLS refusals over REST:
  - `POST /rest/v1/notifications` as an authenticated user is refused;
  - selecting by another user's notification id returns no rows;
  - `PATCH` or `DELETE` on another user's notification affects 0 rows;
  - `PATCH` of a column other than `read_at` (e.g. `kind`) is refused.

### Success Criteria:

#### Automated Verification:

- Migration applies on local Supabase: `npx supabase db reset`
- Migration check passes with the new migration newest: `npm run migration-check`
- Generated types include `notifications` and type check passes: `npx astro check`
- Smoke passes, including the five event steps and the RLS refusal steps: `npm run smoke`
- Lint passes: `npm run lint`

#### Manual Verification:

- In Supabase Studio, the trigger appears on `trainer_links`, and `notifications` shows RLS enabled with exactly three policies

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Domain, service and API routes

### Overview

Add types, pure helpers, data access, and the three POST routes the UI will use.

### Changes Required:

#### 1. Types

**File**: `src/types.ts`

**Intent**: Add the notification shapes shared by the service, the bell and the table.

**Contract**:
- `NotificationKind` (the five kinds)
- `AppNotification`: `id`, `kind`, `actorRole`, `actorFirstName`, `actorLastName`, `actorEmail`, `createdAt`, `readAt`
- `NotificationPage`: `rows`, `page`, `pageCount`, `size`, `total`
- `NotificationBellData`: `unreadCount`, `latest: AppNotification[]`

#### 2. Pure helpers

**File**: `src/lib/notifications.ts` (+ `src/lib/notifications.test.ts`)

**Intent**: Hold copy, routing and parsing in one testable place.

**Contract**:
- `notificationMessage(n)` uses `topbarName` for X:
  - `link_requested` → "Trainer X sent you a link request"
  - `link_accepted` → "Trainee X accepted your link request"
  - `link_declined` → "Trainee X declined your link request"
  - `link_cancelled` → "Trainer X withdrew their link request"
  - `link_removed` → "Trainer X removed the link" / "Trainee X removed the link", by `actorRole`
- `notificationHref(kind)` → `/hub/collaborations` for all five kinds.
- `parseNotificationPage` is lenient: 1..`notificationMaxPage` (10_000), otherwise 1.
- `parseNotificationPageSize` is lenient: 5/10/15, otherwise 5. It reuses `pageSizes` / `PageSize` from `src/lib/measurement-page.ts`.
- `notificationNoticeMessage(code)`: `read` → "Notifications marked as read", `deleted` → "Notifications deleted".
- `notificationErrorMessage(code)`: `failed` → "Could not update notifications".
- `notificationsPath({ page, size, notice?, error? })` builds `/hub/notifications?…`.
- `toNotification(row)` maps a DB row to `AppNotification`.

#### 3. Service

**File**: `src/lib/services/notifications.ts`

**Intent**: Supabase access for the bell, the table and the actions. Return `{ ok: false } | { ok: true, … }`, like `src/lib/services/trainer-links.ts`.

**Contract**:
- `readNotificationBell(supabase, userId)`: one query with unread rows (`read_at is null`), newest first, `limit 5`, `count: "exact"` → `NotificationBellData`.
- `readNotificationPage(supabase, userId, page, size)`: `count: "exact"`, ordered by `created_at desc, id desc`, `range`. Falls back to the last page when the requested page is past the end.
- `openNotification(supabase, id)`: read its `kind`; if missing, `{ ok: false }`; otherwise set `read_at = now()` where `read_at is null` and return `kind`.
- `markNotificationsRead(supabase, ids)`: update `read_at` where `id in ids` and `read_at is null`.
- `deleteNotifications(supabase, ids)`: delete where `id in ids`.

RLS limits all of these to the caller's own rows.

#### 4. API routes

**Files**: `src/pages/api/notifications/open.ts`, `src/pages/api/notifications/read.ts`, `src/pages/api/notifications/delete.ts`

**Intent**: Form-POST endpoints in the style of `src/pages/api/collaborations/remove.ts`: `export const prerender = false`, zod at module level, sign-in redirect, 302 redirects.

**Contract**:
- `open`: form `id` (`z.uuid()`). On success → `notificationHref(kind)`; on failure → `/hub/notifications?error=failed`.
- `read` and `delete`: form `ids` (`form.getAll("ids")`, `z.array(z.uuid()).min(1).max(15)`), plus `page` and `size`, parsed leniently.
  - Success: `notificationsPath({ page, size, notice: "read" | "deleted" })`.
  - Invalid input or a failed query: `…&error=failed`.
- Signed out: every route → `/auth/signin`.

#### 5. Smoke: routes

**File**: `scripts/smoke.mjs`

**Intent**: Prove the HTTP contract.

**Contract**:
- `open` on the trainee's `link_requested` → 302 to `/hub/collaborations`, and REST then shows `read_at` set.
- `open` with an unknown or foreign id → 302 `…error=failed`.
- `read` with two ids → 302 `notice=read`.
- `delete` → 302 `notice=deleted`, and the rows are gone over REST.
- `delete` with a foreign id leaves the other user's row intact.
- Signed-out POST → `/auth/signin`.

### Success Criteria:

#### Automated Verification:

- Unit tests for message copy (all five kinds, both `link_removed` roles, name/email fallback), href, page and size parsing, and notice/error codes pass: `npm test`
- Smoke route steps pass: `npm run smoke`
- Type check and lint pass: `npx astro check && npm run lint`
- Build passes: `npm run build`

**Implementation Note**: After automated verification passes, continue to Phase 3.

---

## Phase 3: Hub Notifications tab

### Overview

Add the second Hub tab with the managing table.

### Changes Required:

#### 1. Tabs

**Files**: `src/lib/hub-tabs.ts`, `src/components/account/AccountTabs.tsx`

**Intent**:
- Add `{ value: "notifications", label: "Notifications", href: "/hub/notifications" }` after Collaborations.
- Let a page widen the tab content for the table without changing Profile, Settings or Collaborations.

**Contract**: `AccountTabs` takes an optional `contentClassName` merged via `cn()` over the default `max-w-sm`. The Notifications page passes a token-based wider width, e.g. `max-w-measurement`.

#### 2. Page

**File**: `src/pages/hub/notifications.astro`

**Intent**: Server-render the page, using the same skeleton as `src/pages/hub/collaborations.astro`.

**Contract**:
- Reads `page` and `size` with the lenient parsers, and `notice` / `error` codes.
- Calls `readNotificationPage`.
- Renders `PageErrorToasts` (`clearParams: ["notice","error"]`) and `<AccountTabs tabs={HUB_TABS} current="notifications">`.
- Load failure → "Could not load notifications".

#### 3. Table island

**File**: `src/components/hub/NotificationsTable.tsx` (`client:load`)

**Intent**: The measurements-like table with selection and bulk actions.

**Contract**:
- Columns: select checkbox, Notification (message, unread rows marked in bold or with a dot via tokens), Received (date and time), Status (Unread / Read).
- Each message is a button that submits a hidden form to `/api/notifications/open`.
- A header select-all is tri-state over the visible rows, matching `MeasurementBrowser.tsx:910-912, 1197-1202`. Rows get the label "Select notification from …".
- "Mark as read" and "Delete" are disabled with no selection. Each submits a form carrying the selected `ids`, `page` and `size`.
- "Delete" first opens an inline `role="alertdialog"` confirm ("Delete N notifications for good?"), styled like `ConfirmRemoveToast`.
- An "Entries per page" group of 5/10/15 `aria-pressed` buttons links to `?page=1&size=N`.
- The pager uses `<a href>` prev/next and "Page X of Y", like `CollaborationsList.astro:152-184`.
- Empty state: "No notifications".

#### 4. Kitchen sink, token check, docs

**Files**: `src/pages/kitchen-sink/hub.astro`, `scripts/check-home-tokens.mjs`, `CLAUDE.md` (only if the kitchen-sink line needs wording)

**Intent**: Show the table states and keep views token-only.

**Contract**:
- Kitchen sink states: mixed read/unread, empty, multi-page at size 10, some rows selected, delete confirm open, notice, error.
- Add `src/pages/hub/notifications.astro` and `src/components/hub/NotificationsTable.tsx` to `FILES`.

### Success Criteria:

#### Automated Verification:

- Token check passes with the new files listed: `npm run check:home-tokens`
- Type check, lint, unit tests and build pass: `npx astro check && npm run lint && npm test && npm run build`
- Smoke still passes, including Hub tab and redirect steps: `npm run smoke`

#### Manual Verification:

- `/kitchen-sink/hub` shows every Notifications state in light and dark mode
- On `/hub/notifications`, select-all, partial selection, mark read and delete-with-confirm behave as expected, and size 5/10/15 and paging keep the selection actions working
- The table is usable at 360px width

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 4.

---

## Phase 4: Top-bar bell

### Overview

Show the unread count and the latest five unread in the top bar on every signed-in page.

### Changes Required:

#### 1. Model

**Files**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`

**Intent**: Carry bell data through the model.

**Contract**:
- `TopbarModelInput` gains optional `notifications?: NotificationBellData`.
- `TopbarAccount` gains `notifications: { unreadCount: number; items: { id; message; createdAt }[]; allHref: "/hub/notifications" } | null`. It is `null` when there are no notifications or `unreadCount === 0`, and messages come from `notificationMessage`.
- Tests cover zero (null), one, and more than five unread (count stays the total, items stay five).
- Update the existing full-object fixtures.

#### 2. Data

**File**: `src/components/Topbar.astro`

**Intent**: Fetch bell data next to `readTopbarProfile` for signed-in users. A failed read yields no bell rather than an error.

**Contract**: Call `readNotificationBell(supabase, user.id)` and pass the result into `topbarModel`. The `preview` path stays fetch-free.

#### 3. Bell component

**Files**: `src/components/NotificationBell.tsx`, `src/components/TopbarActions.tsx`

**Intent**: Render the bell immediately before `AccountMenu` (`TopbarActions.tsx:140`) only when `account?.notifications` is set.

**Contract**:
- Built on the shared `DropdownMenu`, which keeps the iOS fix.
- Trigger: a ghost icon `Button` with the lucide `Bell` icon and a count badge (shows "99+" above 99, using role tokens such as `bg-primary text-primary-foreground`), with `aria-label="Notifications, N unread"`.
- Content (`align="end"`): one `DropdownMenuItem` per item, showing the message and a relative or short date. Selecting an item calls `requestSubmit()` on a hidden form to `/api/notifications/open`, following the `CollaborationRowActions.tsx` pattern. Then a separator and an `asChild <a>` item "See all notifications" → `/hub/notifications`.

#### 4. Kitchen sink and token check

**Files**: `src/pages/kitchen-sink/home.astro`, `scripts/check-home-tokens.mjs`

**Intent**: Preview the bell states and keep it token-only.

**Contract**:
- `Topbar preview` states: signed-in with no unread (no bell), 3 unread, 120 unread ("99+").
- Add `src/components/NotificationBell.tsx` to `FILES`.

### Success Criteria:

#### Automated Verification:

- Topbar unit tests pass with the new bell cases: `npm test`
- Token check passes: `npm run check:home-tokens`
- Type check, lint and build pass: `npx astro check && npm run lint && npm run build`
- Smoke passes: `npm run smoke`

#### Manual Verification:

- `/kitchen-sink/home` shows the no-bell, 3-unread and 99+ states, desktop and phone
- On a phone, the bell sits between the hamburger and the avatar; on desktop, between the links and the avatar
- On iOS Safari the bell opens on the first tap
- Clicking an item lands on Collaborations, and the count drops by one on that page load

**Implementation Note**: After automated verification passes, pause for manual confirmation before Phase 5.

---

## Phase 5: E2E coverage

### Overview

Prove the bell and the table in a real browser at desktop width and at 360×800.

### Changes Required:

#### 1. Hub spec

**File**: `tests/e2e/hub-collaborations.spec.ts` (extend), or `tests/e2e/hub-notifications.spec.ts` reusing its helpers if the file grows too large

**Intent**: Follow the existing trainer-request → accept → unlink flow and assert notifications at each side.

**Contract**:
- After the request, the trainee sees the "Notifications, N unread" bell. Opening it shows "Trainer … sent you a link request", and clicking it lands on `/hub/collaborations` with that notification now read.
- After the accept and the unlink, the trainer's bell lists the "accepted" notification. On `/hub/notifications` the trainer selects all, marks read (the bell disappears on reload), then selects one and deletes it after confirming (the row is gone).
- Clean up: delete the test-created notifications for the seeded trainee so later runs start at a known count.

### Success Criteria:

#### Automated Verification:

- Playwright passes at both widths: `npx playwright test`
- Lint passes: `npm run lint`

---

## Testing Strategy

### Unit Tests:

- `src/lib/notifications.test.ts`:
  - copy for each kind and both `link_removed` roles;
  - `topbarName` fallbacks (both names / one name / email);
  - href per kind;
  - page and size parsing edges (0, negative, non-number, 7, 15, above max);
  - notice and error codes.
- `src/lib/topbar.test.ts`: bell null at zero unread, count above five with five items, guest has no account or bell.

### Integration Tests:

- Smoke (REST plus HTTP against the production preview and local Supabase) checks:
  - each of the five events → one notification for the correct recipient, with the actor snapshot;
  - RLS refusals: insert, foreign read, foreign update, foreign delete, update of a non-`read_at` column;
  - route redirects for open, read and delete, plus the signed-out redirect.
- Migration check: the newest migration keeps the known measurement row.
- Playwright: the bell and the table flow at desktop width and 360px.

### Manual Testing Steps:

1. As a trainer, send a request; as the trainee, reload any page and see the bell with 1. Open it, click the item, land on Collaborations, and see the bell gone.
2. As the trainee, decline a second request; as the trainer, see "declined" in the bell.
3. On `/hub/notifications`, switch sizes 5/10/15, page through, select all, mark read, delete with confirm.
4. Check the kitchen sinks `/kitchen-sink/hub` and `/kitchen-sink/home` in light and dark mode.
5. On iOS Safari, open the bell with one tap.

## Performance Considerations

- `Topbar.astro` adds one indexed query per signed-in render: the unread partial index, `limit 5`, `count: "exact"`.
- The Hub table pages with `range` on the `(recipient_id, created_at desc, id desc)` index.

## Migration Notes

- The migration is additive: a new table and a trigger, with no RPC signature changes. It reaches hosted Supabase before the new Worker. The previous Worker's link flow is unchanged; it just generates rows it does not display.
- Rollback: a follow-up migration would `drop trigger trainer_links_notify` and `drop function notify_trainer_link_change`. The table can stay until a later release (add first, drop later).

## References

- Research: `context/changes/notification-system/research.md`
- Link RPCs: `supabase/migrations/20261027120000_trainer_link_requests.sql:84-332`
- Hub page pattern: `src/pages/hub/collaborations.astro`, `src/pages/api/collaborations/remove.ts`
- Selection pattern: `src/components/measurements/MeasurementBrowser.tsx:782, 910-912, 1162, 1197-1202`
- Dropdown POST pattern: `src/components/hub/CollaborationRowActions.tsx`
- Prior deferral: `context/archive/2026-10-27-hub-collaborations-handle/plan.md:65-66`
- Roadmap: S-39 in `context/foundation/roadmap.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database — notifications table, RLS and trigger

#### Automated

- [x] 1.1 Migration applies on local Supabase: `npx supabase db reset` — 9b47067
- [x] 1.2 Migration check passes with the new migration newest: `npm run migration-check` — 9b47067
- [x] 1.3 Generated types include `notifications` and type check passes: `npx astro check` — 9b47067
- [x] 1.4 Smoke passes, including the five event steps and the RLS refusal steps: `npm run smoke` — 9b47067
- [x] 1.5 Lint passes: `npm run lint` — 9b47067

#### Manual

- [x] 1.6 In Supabase Studio, the trigger appears on `trainer_links`, and `notifications` shows RLS enabled with exactly three policies — 9b47067

### Phase 2: Domain, service and API routes

#### Automated

- [ ] 2.1 Unit tests for message copy (all five kinds, both `link_removed` roles, name/email fallback), href, page and size parsing, and notice/error codes pass: `npm test`
- [ ] 2.2 Smoke route steps pass: `npm run smoke`
- [ ] 2.3 Type check and lint pass: `npx astro check && npm run lint`
- [ ] 2.4 Build passes: `npm run build`

### Phase 3: Hub Notifications tab

#### Automated

- [ ] 3.1 Token check passes with the new files listed: `npm run check:home-tokens`
- [ ] 3.2 Type check, lint, unit tests and build pass: `npx astro check && npm run lint && npm test && npm run build`
- [ ] 3.3 Smoke still passes, including Hub tab and redirect steps: `npm run smoke`

#### Manual

- [ ] 3.4 `/kitchen-sink/hub` shows every Notifications state in light and dark mode
- [ ] 3.5 On `/hub/notifications`, select-all, partial selection, mark read and delete-with-confirm behave as expected, and size 5/10/15 and paging keep the selection actions working
- [ ] 3.6 The table is usable at 360px width

### Phase 4: Top-bar bell

#### Automated

- [ ] 4.1 Topbar unit tests pass with the new bell cases: `npm test`
- [ ] 4.2 Token check passes: `npm run check:home-tokens`
- [ ] 4.3 Type check, lint and build pass: `npx astro check && npm run lint && npm run build`
- [ ] 4.4 Smoke passes: `npm run smoke`

#### Manual

- [ ] 4.5 `/kitchen-sink/home` shows the no-bell, 3-unread and 99+ states, desktop and phone
- [ ] 4.6 On a phone, the bell sits between the hamburger and the avatar; on desktop, between the links and the avatar
- [ ] 4.7 On iOS Safari the bell opens on the first tap
- [ ] 4.8 Clicking an item lands on Collaborations, and the count drops by one on that page load

### Phase 5: E2E coverage

#### Automated

- [ ] 5.1 Playwright passes at both widths: `npx playwright test`
- [ ] 5.2 Lint passes: `npm run lint`
