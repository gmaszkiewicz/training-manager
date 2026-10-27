# Hub with Collaborations — Plan Brief

> Full plan: `context/changes/hub-collaborations-handle/plan.md`

## What & Why

A trainer can link any trainee instantly by email and read their journal without consent. This plan turns that link into a request the trainee accepts or declines. It also adds a Hub screen, opened from the avatar menu, whose first section, Collaborations, lets each side manage their links:

- **Trainer:** cancel a pending request, or unlink a trainee.
- **Trainee:** accept or decline a request, or remove a trainer.

Roadmap slice S-37 (MS-29), issue #138.

## Starting Point

- **Links today:** `trainer_links` has no status. `link_trainee_by_email` inserts a link instantly, and one access rule, `measurements_select_linked_trainer`, gives the trainer read access to the journal.
- **Gaps:** a trainee cannot see their links, and nothing can delete one.
- **UI patterns to reuse:**
  - one route per tab (Profile);
  - an inline pager and an "Entries per page" group (Measurements);
  - a notice toast (`PageErrorToasts`);
  - a URL-driven confirm toast (Delete measurement).

## Desired End State

- Submitting a trainee email on `/measurements` shows "Your request has been sent to <email>" and creates a pending request. The trainer reads nothing until the trainee accepts.
- The avatar menu reads Profile, Hub, Settings, Sign out. `/hub/collaborations` lists, for each role, pending rows first and then linked rows, five per page, with the matching actions.
- Removing a link, from either side and at either stage, closes the journal preview at once. Links that existed before the migration stay accepted.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Request lifecycle | `status` pending/accepted; decline, cancel, unlink and remove delete the row | Smallest schema change; the primary key blocks duplicates; a new request can be sent later |
| Trainer shown to trainee | Name ("A. Lovelace" format) + email | A trainee can recognise who is asking |
| Trainee shown to trainer | Name + email + status | Symmetric with the trainee view |
| Pending in search | Hidden; re-submitting shows "A request to <email> is already pending" | No duplicate requests; the existing exclusion already covers it |
| Who ends a link | Trainer and trainee | A trainee keeps control over who reads their journal |
| Hub route and menu | `/hub` → `/hub/collaborations`; menu Profile, Hub, Settings | Same tab-per-route pattern as Profile |
| Confirmation | Only for ending an accepted link (Unlink / Remove) | Guards the action that cuts journal access; pending actions stay one click |
| After sending a request | Stay on `/measurements` with a notice toast | No context switch |
| Ordering | Pending first, then newest `linked_at`, then email | Actionable rows land on page 1; paging is deterministic |
| Paging | Server-rendered `?page=N`, size fixed at 5 | No new GET API or client state for a 5-row list |
| Testing | Smoke lifecycle + unit tests + Playwright Hub spec | Proves the access rule over HTTP and the screen in a browser |
| UI language | English ("Your request has been sent to <email>") | The app is English-only |

## Scope

**In scope:**
- the migration: status column, accepted-only access rule and five new database functions;
- the request flow and toast on `/measurements`;
- the Hub route, tab, menu item and both lists with the pager;
- accept and remove routes and the unlink confirmation;
- the `/kitchen-sink/hub` page;
- smoke, unit and e2e coverage.

**Out of scope:**
- decline history or notifying the trainer of a decline;
- email notifications;
- page sizes other than 5;
- refactoring `MeasurementBrowser`'s pager into a shared component;
- dropping `link_trainee_by_email` (a later release);
- further Hub sections and Polish copy.

## Architecture / Approach

The database owns every rule through security-definer functions scoped to `auth.uid()` and the caller's role:

- `request_trainee_link`
- `list_trainer_collaborations` and `list_trainee_collaborations`, each returning one page plus the total
- `accept_trainer_link`
- `remove_trainer_link`

The one access rule on `measurements` adds `status = 'accepted'`. The Hub page is server-rendered: forms POST to `/api/collaborations/{accept,remove}` and redirect back with a notice code, and confirmation is driven by `?confirm=<id>`. To stay backward compatible, the migration backfills existing rows as accepted, then switches the default to pending. `link_trainee_by_email` keeps its signature but inserts pending, which closes the consent bypass over REST.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Link requests and accepted-only access | Migration, new database functions, service, request toast, smoke lifecycle | A wrong migration order leaves existing links pending, or keeps the instant-link bypass open |
| 2. Hub with Collaborations | Routes, menu item, both paged lists, accept and remove, confirmation, kitchen sink | Role mix-ups in the actions; topbar tests that assume two menu items |
| 3. Browser coverage | Playwright Hub spec at desktop and 360px; menu specs updated | CI seeds only a trainee; the spec must sign up a throwaway trainer |

**Prerequisites:** S-04, S-29 and S-35 are done (they are). Local Supabase in Docker is needed for smoke and e2e.
**Estimated effort:** about 3 sessions, one per phase.

## Open Risks & Assumptions

- During the deploy window, the old Worker's picker can list a new pending row with an empty preview. This is accepted.
- The e2e spec assumes local Supabase auto-confirms signups, as the smoke script already relies on.
- Showing names to the other side before acceptance exposes a trainee's name to any trainer who knows their email.

## Success Criteria (Summary)

- A trainer cannot read a trainee's journal until that trainee accepts, and loses access as soon as either side ends the link.
- Both roles manage their collaborations from Hub → Collaborations, five per page, with the requested actions.
- The full lint, type, unit, smoke, migration-check, build and Playwright gates pass.
