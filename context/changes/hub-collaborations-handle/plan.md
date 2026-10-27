# Hub with Collaborations Implementation Plan

## Overview

A trainer who finds a trainee by email no longer links that trainee at once: the trainer sends a link request, and the trainee accepts or declines it. A new Hub screen, opened from the avatar menu, gets a first section, Collaborations, with one paginated list per role (5 per page):

- **Trainer:** sees linked and pending trainees, can cancel a pending request, and can unlink a trainee.
- **Trainee:** sees their trainers, can accept or decline a request, and can remove an accepted trainer.

Roadmap slice S-37 (MS-29).

## Current State Analysis

- **Link table:** `public.trainer_links` has columns `trainer_id`, `trainee_id`, `email` (the trainee's email, lowercased) and `linked_at`, with primary key `(trainer_id, trainee_id)`. There is no status column and no id column (`supabase/migrations/20260928170000_trainer_links.sql:1-9`).
- **Table access:** the only policy is `trainer_links_select_own` (trainer reads own rows). There are no insert, update or delete grants, so all writes go through security-definer functions. A trainee cannot read their own links, and no path deletes a link.
- **Linking:** `link_trainee_by_email(p_email) returns uuid` (security definer, trainer-only) inserts the link `on conflict do nothing`, so linking is instant and idempotent (same migration, :23-75). Execute is granted to `authenticated`, so any trainer can call it directly over REST.
- **Journal access:** `measurements_select_linked_trainer` (same migration, :77-81) is the only rule that lets a trainer read a trainee's journal. `/api/measurements` GET, `measurement_months` (security invoker) and `readMeasurementPage` all rely on it.
- **Trainee search:** `search_unlinked_trainee_emails` excludes any `trainer_links` row for this trainer (`20261014120000_search_unlinked_trainee_emails.sql:35-40`), so it already hides pending rows once they exist.
- **Request flow:** POST `/api/trainer-links` (`src/pages/api/trainer-links/index.ts:57-81`) redirects to `/measurements?trainee=<id>` on success and to `?error=No trainee with that email` on a miss. It shows no success toast. The route uses manual checks, not zod.
- **Trainer panel data:** `listTrainerLinks` (`src/lib/services/trainer-links.ts:6-27`) reads every row of the trainer's links. The `TrainerLink` DTO is in `src/lib/trainer-preview.ts:1-5`.
- **Names:** profile names are readable only by their owner (`profiles_select_own`). Trainer emails live only in `auth.users`. The name format "A. Lovelace" → single name → email is `topbarName` (`src/lib/topbar.ts:53-68`).
- **Avatar menu:** items are a fixed `profile | settings` union (`src/lib/topbar.ts:20-25, 111-118`). Current-marking uses `withCurrent(..., true)`, which also matches sub-paths. Sign out is hard-coded in `src/components/TopbarActions.tsx`.
- **Section tabs:** each tab is its own route, listed in `src/lib/profile-tabs.ts` and rendered by `src/components/account/AccountTabs.tsx`. The page shell pattern is `src/pages/profile.astro:56-77`. `PROTECTED_ROUTES` lives in `src/middleware.ts:4`.
- **Pagination UI:** written inline in `src/components/measurements/MeasurementBrowser.tsx`:
  - page-size group `role="group" aria-label="Entries per page"` with `aria-pressed` Buttons (:1162-1177);
  - pager with ChevronLeft/Right outline icon Buttons and "Page n of N", shown only when there is more than one page (:1248-1278, :939).
- **Toasts:** custom `PageErrorToasts` with a `tone="notice"` variant and `clearParams` (`src/components/measurements/PageErrorToasts.tsx`); see the notice example in `src/components/journal/TraineeJournal.astro:54-55`. There is no sonner and no AlertDialog. Destructive confirmation is the URL-driven `DeleteConfirmToast` (`MeasurementBrowser.tsx:183-233`).
- **Tests:**
  - `scripts/smoke.mjs` asserts instant linking (link 302 to `?trainee=`, :599-605; notes visible after linking, :825-842).
  - `src/lib/topbar.test.ts` and `tests/e2e/account-menu.spec.ts` assert exactly Profile and Settings in the avatar menu.
  - CI e2e seeds only one trainee (`.github/workflows/ci.yml:98-99`).

## Desired End State

**Linking requests**
- A trainer who submits a trainee email on `/measurements` stays on that screen and reads the notice toast "Your request has been sent to <email>".
- The new row is `pending`, and the trainer cannot read that trainee's journal until the trainee accepts.

**Hub**
- The avatar menu reads Profile, Hub, Settings, Sign out.
- `/hub` redirects to `/hub/collaborations`, which shows a Collaborations tab. Both pages require sign-in.
- Lists, per role:
  - **Trainer:** a list of trainees, each with name and email and a Pending or Linked status. Each row has Cancel request (pending) or Unlink (linked; asks for confirmation first).
  - **Trainee:** a list of trainers, each with name and email and status. A pending row has accept (✓) and decline (✕) buttons; a linked row has Remove (asks for confirmation first).
- Ordering and paging:
  - Both lists show pending first, then linked; newest `linked_at` first within each group; email as the tiebreak.
  - Five rows per page, with a Previous/Next pager when there is more than one page, and an "Entries per page" group offering only 5.

**Access rules**
- Once a link is removed, by either side and at either stage, the trainer's journal preview is closed immediately.
- Existing links stay accepted after the migration.

**Verification:** `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke` (against a local Supabase preview), `npm run migration-check` and `npx playwright test` all pass.

### Key Discoveries:

- A new link-status column must be added with default `accepted` first, so existing rows backfill as accepted, and then switched to default `pending`.
- `link_trainee_by_email` stays callable over REST. If it is left as-is, a trainer could bypass consent, so its body must insert `pending`. Its signature stays, so the old Worker keeps running during the deploy window.
- `search_unlinked_trainee_emails` already excludes pending rows. It needs no change.
- `trainer-preview.ts` picks the default trainee by greatest `linkedAt`. Setting `linked_at = now()` on accept makes a newly accepted trainee the default pick, which is the desired behaviour.
- The topbar item union and its tests (`topbar.test.ts` `accountItems()` helper, `account-menu.spec.ts:9-19`) must widen together.

## What We're NOT Doing

- Keeping history of declined, cancelled or removed requests. Those actions delete the row. The trainer is not notified of a decline; the row simply disappears.
- Any email or in-app notification to the trainee when a request arrives. The trainee sees it in the Hub.
- A "pending" marker in the trainee search. Pending trainees stay hidden there; re-submitting their email returns an error toast.
- Page sizes other than 5, or a shared pagination component extracted from `MeasurementBrowser` (that file is not refactored).
- Extracting `DeleteConfirmToast` into a shared component. The Hub gets its own confirm toast modelled on it.
- Dropping `link_trainee_by_email`. It is redefined now and dropped in a later release, since migrations must be backward compatible.
- Hub sections beyond Collaborations.
- Polish UI copy. The app is English-only, so the toast reads "Your request has been sent to <email>".

## Implementation Approach

The database owns every rule, through security-definer functions scoped to `auth.uid()` and the caller's profile role. This matches the existing `link_trainee_by_email` and search functions and avoids opening insert, update or delete grants on `trainer_links`.

The Hub is server-rendered:
- Lists come from paged database functions.
- `?page=N` links drive paging.
- Actions are plain form POSTs that redirect back to the same page with a notice code.
- Confirming an unlink or remove is driven by the URL (`?confirm=<other-id>`), the same way Delete measurement is.

React is used only where an island already exists (toasts and the confirm toast). Phase 1 changes the data and the request flow and proves access over HTTP with the smoke script. Phase 2 adds the Hub UI. Phase 3 adds browser coverage.

## Critical Implementation Details

- **Migration order inside the single migration file:**
  1. add the `status` column with default `'accepted'`;
  2. set the default to `'pending'`;
  3. `create or replace` `link_trainee_by_email` to insert `status = 'pending'`;
  4. drop and recreate `measurements_select_linked_trainer` with `and l.status = 'accepted'`;
  5. create the new functions.

  Running these out of order either leaves existing links pending (trainers lose their previews) or leaves a window where the old function still creates accepted links.
- **Function scope:** every new function sets `search_path = ''`, revokes from `public, anon` and grants execute to `authenticated` only, matching the existing functions. Each function checks the caller's profile role itself; a trainee calling a trainer function gets no rows, or the `not_allowed` outcome.

## Phase 1: Link requests and accepted-only access

### Overview

Introduce the pending/accepted lifecycle in the database, limit journal access to accepted links, switch the `/measurements` request flow to "request sent", and prove the access lifecycle in the smoke script.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_trainer_link_requests.sql` (newest file)

**Intent**: Add the request lifecycle and restrict journal access to accepted links, in the order given under Critical Implementation Details. Add the functions that the Hub and the request flow call.

**Contract**:

- `trainer_links.status text not null` with `check (status in ('pending','accepted'))`; existing rows become `accepted`; the default is then `pending`.
- `link_trainee_by_email(p_email text) returns uuid`: same signature; inserts `pending`.
- `measurements_select_linked_trainer`: adds the condition `l.status = 'accepted'`.
- `request_trainee_link(p_email text) returns text`: trainer-only. Returns:
  - `not_found` when there is no trainee with that email, the email is not a trainee's, or the caller is not a trainer;
  - `pending` when a pending row already exists;
  - `linked` when an accepted row already exists;
  - `sent` after inserting a pending row.

  The email is lowercased and trimmed, as today.
- `list_trainer_collaborations(p_page int, p_size int)` returns rows `(trainee_id uuid, email text, first_name text, last_name text, status text, linked_at timestamptz, total bigint)`. Only the caller's rows (`trainer_id = auth.uid()`, caller is a trainer). Ordered by `status = 'pending'` first, then `linked_at desc`, then `email`. Uses `offset (p_page-1)*p_size limit p_size`, and `total` is `count(*) over ()`. `p_size` must be between 1 and 50.
- `list_trainee_collaborations(p_page int, p_size int)` returns rows `(trainer_id uuid, email text, first_name text, last_name text, status text, linked_at timestamptz, total bigint)`. Only links where `trainee_id = auth.uid()`. The trainer's email comes from `auth.users` and the names from `profiles`. Same ordering and paging.
- `accept_trainer_link(p_trainer_id uuid) returns boolean`: the caller as trainee sets their pending row from that trainer to `accepted` with `linked_at = now()`. Returns false when there is no pending row.
- `remove_trainer_link(p_other_id uuid) returns boolean`. If the caller is a trainer, it deletes `(auth.uid(), p_other_id)`; if a trainee, it deletes `(p_other_id, auth.uid())`. Any status. Returns false when no row was deleted. One function covers cancel, unlink, decline and remove.

#### 2. Generated types

**File**: `src/db/database.types.ts`

**Intent**: Regenerate (`npx supabase gen types typescript --local`) so the new column and functions are typed.

**Contract**: `trainer_links.Row.status`, plus `Functions` entries for the five new functions.

#### 3. Shared types

**File**: `src/types.ts`

**Intent**: Add the Hub DTOs that the service, page, components and kitchen sink share.

**Contract**:
- `CollaborationStatus = "pending" | "linked"`, where `linked` maps from `accepted`. The UI wording stays out of the DB value.
- `Collaboration = { otherId: string; name: string; email: string; status: CollaborationStatus; linkedAt: string }`. `name` comes from `topbarName`.
- `CollaborationPage = { rows: Collaboration[]; page: number; pageCount: number; pageSize: 5 }`.
- `LinkRequestOutcome = "sent" | "pending" | "linked" | "not_found"`.

#### 4. Link service

**File**: `src/lib/services/trainer-links.ts`

**Intent**:
- `listTrainerLinks` adds `.eq("status", "accepted")`, so the `/measurements` picker shows only accepted trainees.
- `linkTraineeByEmail` is replaced by `requestTraineeLink(email)`, which calls `request_trainee_link` and returns `LinkRequestOutcome`.
- Add `readCollaborationPage(supabase, role, page)`, which calls the role's list function with size 5, clamps the page to `1..pageCount` (re-querying the last page when the requested page is past the end) and maps rows to `Collaboration`.
- Add `acceptTrainerLink(trainerId)` and `removeTrainerLink(otherId)`.

**Contract**: errors become `{ ok: false }` results, the way `listTrainerLinks` does today; nothing throws to the page.

#### 5. Collaboration helpers

**File**: `src/lib/collaborations.ts` (new) + `src/lib/collaborations.test.ts`

**Intent**: Pure helpers so paging and copy can be tested without the database.

**Contract**:
- `collaborationPageSize = 5`
- `parseCollaborationPage(raw)`: positive integer, else 1
- `pageCountFor(total, size)`: at least 1
- `toCollaboration(row)`: maps `accepted` to `linked` and the name through `topbarName`
- `requestOutcomeMessage(outcome, email)`:
  - `sent` → "Your request has been sent to <email>"
  - `pending` → "A request to <email> is already pending"
  - `linked` → "<email> is already linked"
  - `not_found` → "No trainee with that email"
- `collaborationNoticeMessage(code)` for the Hub notices: `accepted` → "Request accepted", `declined` → "Request declined", `cancelled` → "Request cancelled", `unlinked` → "Trainee unlinked", `removed` → "Trainer removed"
- `collaborationErrorMessage(code)` for the Hub errors: `failed` → "Could not update this collaboration"

#### 6. Request route

**File**: `src/pages/api/trainer-links/index.ts`

**Intent**: POST validates `email` with zod (trimmed, non-empty, max 320) and `trainee` (optional uuid), then calls `requestTraineeLink`.

**Contract**:
- `sent`: 302 to `/measurements?requested=<encoded email>[&trainee=<kept selection>]`.
- `pending`, `linked`, `not_found`: 302 to `/measurements?error=<requestOutcomeMessage>[&trainee=…]`.
- Blank email keeps the existing "Enter an email address".
- Signed out still redirects to sign-in. GET (search) is unchanged.

#### 7. Trainer panel notice

**File**: `src/pages/measurements.astro`, `src/components/trainer/TrainerPanel.astro`

**Intent**: Read the `requested` query param in the trainer branch and render it as a `PageErrorToasts tone="notice"` with the text "Your request has been sent to <email>" and `clearParams={["requested"]}`. Rename the submit button to "Send request".

**Contract**: the new `TrainerPanel` prop is `requestedEmail: string | null`. The email is rendered as text, never as HTML.

#### 8. Smoke lifecycle

**File**: `scripts/smoke.mjs`

**Intent**: Replace the instant-link assertions with the request lifecycle at the HTTP level, using the existing trainer/trainee accounts and helpers.

**Contract**: assertions, in order:
1. The request POST gives 302 to `?requested=`.
2. A re-request gives `?error=A request to … is already pending`.
3. The search omits the pending trainee.
4. While pending, the trainer cannot read notes, the catalog is empty and `measurement_months` is `[]`.
5. A direct REST call to `link_trainee_by_email` creates no accepted link.
6. The trainee accepts (via the `accept_trainer_link` RPC over REST with the trainee session in Phase 1, switched to the Hub route in Phase 2).
7. After accepting, the trainer sees the data (existing assertions at :825-842).
8. A re-request gives `… is already linked`.
9. The trainer removes the link, and access closes again.
10. A trainee calling `request_trainee_link` gets `not_found`.
11. The second trainee (:768-770) is linked through request plus accept.

### Success Criteria:

#### Automated Verification:

- Migration applies on a fresh local Supabase: `npx supabase db reset`
- Migration check passes: `npm run migration-check`
- Unit tests pass, including `src/lib/collaborations.test.ts` and `src/lib/trainer-preview.test.ts`: `npm test`
- Type check passes: `npx astro check`
- Lint passes: `npm run lint`
- Smoke passes against the production preview with local Supabase, including the request → no access → accept → access → remove → no access lifecycle: `npm run smoke`

#### Manual Verification:

- As a trainer on `/measurements`, submitting a trainee email shows "Your request has been sent to <email>", and the trainee does not appear in the trainee picker
- Re-submitting the same email shows "A request to <email> is already pending"
- A trainer linked before the migration still sees that trainee's journal

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Hub with Collaborations

### Overview

Add the Hub screen with its Collaborations section, the avatar-menu item, both role lists with paging, the accept and remove actions with notices and an unlink confirmation, and a kitchen sink.

### Changes Required:

#### 1. Routes and protection

**Files**: `src/pages/hub.astro`, `src/pages/hub/collaborations.astro`, `src/middleware.ts`, `src/lib/hub-tabs.ts`

**Intent**:
- `/hub` redirects (302) to `/hub/collaborations`.
- `/hub/collaborations` uses the same page shell as `profile.astro` (Topbar, card, `AccountTabs` with `HUB_TABS` and current `collaborations`). It resolves the role with `readProfileRole` (after `ensureProfile`, as `/measurements` does), reads `page`, `confirm`, `notice` and `error` query params, and calls `readCollaborationPage`.
- Add `/hub` to `PROTECTED_ROUTES`.

**Contract**: `HUB_TABS = [{ value: "collaborations", label: "Collaborations", href: "/hub/collaborations" }] as const`. A role read failure shows the error toast "Could not load collaborations" and an empty card, not a crash.

#### 2. Avatar menu item

**Files**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`, `src/pages/kitchen-sink/home.astro` (prose)

**Intent**: Insert `{ id: "hub", label: "Hub", href: "/hub" }` between Profile and Settings, so `/hub/collaborations` marks Hub as current through the existing sub-path matching. Widen the `id` and `label` unions. Update the `accountItems()` helper and add cases for `/hub`, `/hub/collaborations` and `/hubs` (the last must not match). Update the kitchen-sink prose to "Profile, Hub, Settings, and Sign out".

**Contract**: `TopbarAccountItem.id: "profile" | "hub" | "settings"`.

#### 3. Collaborations list

**File**: `src/components/hub/CollaborationsList.astro` (new)

**Intent**: Server-rendered list for both roles, with an empty state and the pager.

**Contract**:
- **Props:** `role: "trainer" | "trainee"`, `page: CollaborationPage`.
- **Each row:** name (bold), email (muted, when it differs from the name) and a status label (Pending / Linked).
- **Row actions:** each action is a `<form method="POST">` carrying hidden `other` and `page` fields, or a link.
  - Trainer, pending: "Cancel request" (POST remove).
  - Trainer, linked: "Unlink" (link to `?page=N&confirm=<id>`).
  - Trainee, pending: ✓ accept and ✕ decline icon Buttons (aria-labels "Accept request from <name>" and "Decline request from <name>").
  - Trainee, linked: "Remove" (link to `?page=N&confirm=<id>`).
- **Empty state:** trainer "No trainees yet. Find a trainee by email on Measurements." with a link; trainee "No trainers yet."
- **Below the list:** an "Entries per page" group with a single pressed "5" Button. A pager (Previous / "Page n of N" / Next as `Button asChild` links, ChevronLeft/Right, same aria-labels as measurements) appears only when `pageCount > 1`.
- **Styling:** tokens and `src/components/ui` only.

#### 4. Action routes

**Files**: `src/pages/api/collaborations/accept.ts`, `src/pages/api/collaborations/remove.ts` (new)

**Intent**: Validate with zod (`other`: uuid, `page`: positive int, default 1, `intent` for remove: `cancel | unlink | decline | remove`) and call the service.

**Contract**:
- Both routes export `prerender = false` and handle POST only.
- Signed out: redirect to sign-in.
- Success: 302 to `/hub/collaborations?page=<page>&notice=<accepted|cancelled|unlinked|declined|removed>`.
- Failure, invalid input or a false result: 302 to `?page=<page>&error=failed`.
- The role check stays in the database functions; the route does not trust `intent` for authorization, only for the notice wording.

#### 5. Confirm toast

**File**: `src/components/hub/ConfirmRemoveToast.tsx` (new)

**Intent**: Modelled on `DeleteConfirmToast` (`MeasurementBrowser.tsx:183-233`): a portal, fixed bottom-right, `role="alertdialog"`, a form POST to `/api/collaborations/remove`, an autofocused primary button and a Cancel link back to `?page=N`.

**Contract**:
- Trainer copy: "Unlink <name>? You will no longer see their measurements." with the button "Unlink".
- Trainee copy: "Remove <name>? They will no longer see your measurements." with the button "Remove".
- It renders only when `confirm` matches a linked row on the current page; otherwise it is ignored.

#### 6. Notices and errors

**File**: `src/pages/hub/collaborations.astro`

**Intent**: Map `notice` and `error` codes through `collaborationNoticeMessage` / `collaborationErrorMessage` into `PageErrorToasts` (notice and error tones) with `clearParams={["notice","error"]}`.

**Contract**: unknown codes are ignored.

#### 7. Kitchen sink and token check

**Files**: `src/pages/kitchen-sink/hub.astro` (new), `scripts/check-home-tokens.mjs`, `CLAUDE.md`

**Intent**:
- Add a sink page, session-free and in the same structure as `kitchen-sink/trainer.astro`, with these states: trainer mixed pending/linked; trainee with a pending request; empty trainer; empty trainee; multi-page (page 2 of 3); confirm unlink; notice toast "Your request has been sent to …"; error toast.
- Add the new Hub files and the sink to the `check-home-tokens` FILES list.
- Add "Hub kitchen sink: `/kitchen-sink/hub`." to CLAUDE.md under UI.

**Contract**: fixtures are typed as `CollaborationPage`.

#### 8. Smoke via Hub routes

**File**: `scripts/smoke.mjs`

**Intent**:
- Switch the Phase 1 accept and remove steps to POST `/api/collaborations/accept|remove` with the trainee or trainer session cookies.
- Assert that signed-out GET `/hub/collaborations` redirects to sign-in, that `/hub` redirects to `/hub/collaborations`, and that the trainee's Hub HTML contains the trainer's email with "Pending" before accepting.

### Success Criteria:

#### Automated Verification:

- Unit tests pass, including the new `topbar.test.ts` Hub cases and `collaborations.test.ts`: `npm test`
- Token check passes with the Hub files listed: `npm run check:home-tokens`
- Type check passes: `npx astro check`
- Lint passes: `npm run lint`
- Production build succeeds: `npm run build`
- Smoke passes with the Hub accept/remove routes and redirects: `npm run smoke`

#### Manual Verification:

- The avatar menu reads Profile, Hub, Settings, Sign out, and Hub is marked current on `/hub/collaborations`
- As a trainer, the Collaborations list shows pending trainees above linked ones; Cancel request removes the pending row; Unlink asks for confirmation and then removes access on `/measurements`
- As a trainee, ✓ accepts a request (the trainer then sees the journal) and ✕ declines it; Remove asks for confirmation
- With six or more rows, the pager shows "Page 1 of 2", and Next/Previous move between pages; "Entries per page" shows only 5
- `/kitchen-sink/hub` renders every listed state on desktop and at 360px

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Browser coverage

### Overview

Prove the Hub flow in a browser at desktop and phone width, and update the existing avatar-menu specs.

### Changes Required:

#### 1. Hub e2e spec

**File**: `tests/e2e/hub-collaborations.spec.ts` (new)

**Intent**: The spec signs up a throwaway trainer through `/api/auth/signup` (local Supabase auto-confirms, as the smoke script relies on) in a fresh browser context. The trainer sends a request to the seeded E2E trainee from `/measurements` and sees the toast. The seeded trainee (storageState) then opens the Hub through the avatar menu, sees the pending request and accepts it. The trainer then sees the trainee as Linked in the Hub, unlinks after confirming, and the trainee's list no longer shows that trainer.

**Contract**: runs at 1280 px and at 360×800, and asserts by role and name (menuitem "Hub", buttons "Accept request from …", "Unlink"). It uses a unique trainer email per run, so retries don't collide.

#### 2. Existing menu specs

**Files**: `tests/e2e/account-menu.spec.ts`, `tests/e2e/measurements-menus.spec.ts`

**Intent**: Assert that the avatar menu lists Profile, Hub, Settings and Sign out, and that Hub gets `aria-current="page"` on `/hub/collaborations`.

**Contract**: the existing helper `openAccountMenu` gains the Hub menuitem.

### Success Criteria:

#### Automated Verification:

- Playwright suite passes, including `hub-collaborations.spec.ts` at desktop and 360px: `npx playwright test`
- Lint passes: `npm run lint`

#### Manual Verification:

- The Hub list and its actions are readable and tappable on a real phone (or device emulation), with no horizontal scroll

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `collaborations.test.ts`:
  - page parsing (0, negative, non-numeric → 1);
  - `pageCountFor` (0 → 1, 5 → 1, 6 → 2);
  - `toCollaboration` (`accepted` → `linked`; name fallback to email);
  - outcome, notice and error messages, including the exact string "Your request has been sent to a@b.pl".
- `topbar.test.ts`: Hub between Profile and Settings; current on `/hub` and `/hub/collaborations`, not on `/hubs`.
- `trainer-preview.test.ts` stays green (`TrainerLink` is unchanged).

### Integration Tests:

- `scripts/smoke.mjs`: the full access lifecycle over HTTP and REST, as listed in Phase 1 §8 and Phase 2 §8, including the consent-bypass check on `link_trainee_by_email`.
- `npm run migration-check`: the new migration is the newest and preserves the measurement row.

### Manual Testing Steps:

1. As a trainer, send a request; check the toast; check that the trainee is absent from the `/measurements` picker and the search.
2. As that trainee, open Hub → Collaborations; accept with ✓; as the trainer, check that the journal is visible.
3. As the trainer, unlink and confirm; check that the journal is no longer visible on `/measurements`.
4. Send a request again, then as the trainee decline with ✕; check that the trainer's Hub row disappears.
5. Seed 6+ requests and check the pager and the single-option page-size group.

## Performance Considerations

The lists are bounded by the primary key on `(trainer_id, trainee_id)`. The trainee-side list filters on `trainee_id`, which is the second key column, so add `create index trainer_links_trainee_id_idx on public.trainer_links (trainee_id)` in the migration. Pages are 5 rows with `count(*) over ()`, so no extra count query is needed.

## Migration Notes

- **Backward compatible:**
  - Additive column with a backfill.
  - The redefined function keeps its signature.
  - The policy is tightened only for rows that don't exist yet: all existing rows are `accepted`.
  - The old Worker's POST creates pending rows, and its picker briefly lists them with an empty preview. That is acceptable for the deploy window.
- **Later release:** drop `link_trainee_by_email` once no Worker calls it.
- **Rollback:** the old Worker runs on the new schema. Reverting the migration is not needed for a Worker rollback.

## References

- Roadmap: `context/foundation/roadmap.md` S-37 (MS-29), issue #138
- Link schema and policy: `supabase/migrations/20260928170000_trainer_links.sql:1-81`
- Search: `supabase/migrations/20261014120000_search_unlinked_trainee_emails.sql:35-40`
- Request route: `src/pages/api/trainer-links/index.ts:57-81`
- Tab pattern: `src/lib/profile-tabs.ts`, `src/components/account/AccountTabs.tsx`, `src/pages/profile.astro:56-77`
- Pager and page size: `src/components/measurements/MeasurementBrowser.tsx:1162-1177, 1248-1278`
- Confirm pattern: `src/components/measurements/MeasurementBrowser.tsx:183-233`
- Notice toast: `src/components/journal/TraineeJournal.astro:54-55`
- Name format: `src/lib/topbar.ts:53-68`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Link requests and accepted-only access

#### Automated

- [x] 1.1 Migration applies on a fresh local Supabase: `npx supabase db reset` — 2745407
- [x] 1.2 Migration check passes: `npm run migration-check` — 2745407
- [x] 1.3 Unit tests pass, including `src/lib/collaborations.test.ts` and `src/lib/trainer-preview.test.ts`: `npm test` — 2745407
- [x] 1.4 Type check passes: `npx astro check` — 2745407
- [x] 1.5 Lint passes: `npm run lint` — 2745407
- [x] 1.6 Smoke passes against the production preview with local Supabase, including the request → no access → accept → access → remove → no access lifecycle: `npm run smoke` — 2745407

#### Manual

- [x] 1.7 As a trainer on `/measurements`, submitting a trainee email shows "Your request has been sent to <email>", and the trainee does not appear in the trainee picker — 2745407
- [x] 1.8 Re-submitting the same email shows "A request to <email> is already pending" — 2745407
- [x] 1.9 A trainer linked before the migration still sees that trainee's journal — 2745407

### Phase 2: Hub with Collaborations

#### Automated

- [x] 2.1 Unit tests pass, including the new `topbar.test.ts` Hub cases and `collaborations.test.ts`: `npm test`
- [x] 2.2 Token check passes with the Hub files listed: `npm run check:home-tokens`
- [x] 2.3 Type check passes: `npx astro check`
- [x] 2.4 Lint passes: `npm run lint`
- [x] 2.5 Production build succeeds: `npm run build`
- [x] 2.6 Smoke passes with the Hub accept/remove routes and redirects: `npm run smoke`

#### Manual

- [x] 2.7 The avatar menu reads Profile, Hub, Settings, Sign out, and Hub is marked current on `/hub/collaborations`
- [x] 2.8 As a trainer, the Collaborations list shows pending trainees above linked ones; Cancel request removes the pending row; Unlink asks for confirmation and then removes access on `/measurements`
- [x] 2.9 As a trainee, ✓ accepts a request (the trainer then sees the journal) and ✕ declines it; Remove asks for confirmation
- [x] 2.10 With six or more rows, the pager shows "Page 1 of 2", and Next/Previous move between pages; "Entries per page" shows only 5
- [x] 2.11 `/kitchen-sink/hub` renders every listed state on desktop and at 360px

### Phase 3: Browser coverage

#### Automated

- [ ] 3.1 Playwright suite passes, including `hub-collaborations.spec.ts` at desktop and 360px: `npx playwright test`
- [ ] 3.2 Lint passes: `npm run lint`

#### Manual

- [ ] 3.3 The Hub list and its actions are readable and tappable on a real phone (or device emulation), with no horizontal scroll
