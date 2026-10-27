# Notification System — Plan Brief

> Full plan: `context/changes/notification-system/plan.md`
> Research: `context/changes/notification-system/research.md`

## What & Why

Trainers and trainees are not told when the other side acts on a link. A trainer only finds out about a decline because the row disappears, and a trainee has to open the Hub to see a new request. This change adds in-app notifications for link events. They appear in a bell in the top bar and in a Hub → Notifications table where the user can manage them.

## Starting Point

Every link change goes through three database functions on `trainer_links`, and declines, cancels and unlinks all simply delete the row. The top bar is server-rendered per page into one React island. The Hub has only Collaborations, and the measurements list already has row and select-all checkboxes but no bulk action.

## Desired End State

A user with unread notifications sees a bell between the menu and the avatar with a count. Opening it lists the latest five unread, and clicking one marks it read and opens Collaborations. With nothing unread there is no bell. Hub → Notifications lists everything newest first, paged 5/10/15, with per-row and select-all checkboxes to mark read or delete for good. Only the database can create notifications, and each user sees only their own.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Write path | AFTER trigger on `trainer_links` | It sees the actor and the old/new status without changing the RPCs, so the previous Worker keeps working. | Plan |
| Withdrawn request | Notify the trainee ("withdrew") | Otherwise the trainee's request notification points at a request that no longer exists. | Plan |
| Naming "X" | Snapshot of the actor's name and email at the time of the event | Users can't read other users' profiles, and the name survives the actor deleting their account. | Plan |
| Freshness | Page load only | Fits the existing server-rendered top bar; no polling or realtime infrastructure. | Plan |
| Bell list | Latest 5 unread | Matches "active = unread" and keeps it to one small query per page. | Plan |
| Table paging | `?page=&size=` in the URL, default 5 | Fits the Hub's form-POST → redirect flow and is easy to test. | Plan |
| Hub order | Notifications after Collaborations; `/hub` unchanged | "Beside Collaborations" with no change to existing links or tests. | Plan |
| Tests | Unit + smoke (events and RLS) + e2e + kitchen sinks | The same bar S-37 shipped with; RLS is proven over REST. | Plan |
| Insert permission | None for users; definer trigger only | Nobody can create a notification for someone else (roadmap risk). | Research |
| Mark-read redirect target | Derived from the stored `kind` | No open redirect from user or row data. | Plan (derived) |
| Bulk delete | Inline confirm before the POST | Deletion is permanent. | Plan (derived) |

## Scope

**In scope:**
- `notifications` table, RLS, trigger, generated types
- open / mark-read / delete routes
- Hub Notifications tab and table
- top-bar bell
- kitchen-sink states, token-check list, unit, smoke and e2e tests

**Out of scope:**
- polling or Realtime
- email or push
- automatic purge
- mark-unread
- updating old names when the actor renames
- remembering the page size across visits
- shared pager or selection extraction
- any change to the link RPCs or `/hub`

## Architecture / Approach

How a notification is created and shown:

1. A link RPC changes `trainer_links`.
2. The AFTER trigger works out the event from `auth.uid()` and the old/new status.
3. It inserts one `notifications` row for the other party, with a snapshot of the actor's name and email.

Users then reach their own rows (RLS) in three ways:
- `Topbar.astro` runs one query (unread, limit 5, with count) and passes the result to the `NotificationBell` dropdown.
- `/hub/notifications` reads a range and renders the `NotificationsTable` island.
- Actions are form POSTs to `/api/notifications/{open,read,delete}`, which redirect to Collaborations or back to the table with a notice.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Database | Table, RLS, classifying trigger, types; smoke for 5 events and RLS refusals | A wrong classification or a missing `auth.uid()` guard |
| 2. Domain & API | Copy/href/parsing helpers, service, open/read/delete routes | Bulk id validation and redirects |
| 3. Hub tab | `/hub/notifications` table with selection, bulk actions, paging; kitchen sink | Tab width change leaking to other tabs |
| 4. Top-bar bell | Count badge and latest-5 dropdown before the avatar; kitchen sink | Topbar test fixtures; iOS first tap |
| 5. E2E | Browser proof at desktop and 360px | Leftover notifications from earlier runs |

**Prerequisites:** S-37 and S-38 live (they are); local Supabase via Docker for smoke, e2e and migration-check.
**Estimated effort:** ~3–4 sessions across 5 phases.

## Open Risks & Assumptions

- This is the first trigger in the repo. It relies on `auth.uid()` being the JWT caller inside the trigger, which holds for PostgREST RPC calls.
- The seeded e2e trainee accumulates notifications across runs; the spec must clean up after itself.
- The table needs a wider tab content area than Profile, Settings and Collaborations; the change is opt-in per page.

## Success Criteria (Summary)

- After any of the five link events, the other party sees a bell with the right message on their next page load, and clicking it takes them to Collaborations.
- Hub → Notifications lets a user page 5/10/15, select one, several or all, and mark read or delete them.
- Smoke proves that no user can create, read, change or delete someone else's notification.
