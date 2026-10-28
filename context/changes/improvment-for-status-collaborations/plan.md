# Per-dashboard access in Collaborations Implementation Plan

## Overview

Replace the single Status column in Hub → Collaborations with a nested **Access** column split by dashboard. Measurements works now; Nutrition, Training and Planning are defined but hidden until they are built. "Linked" becomes **Read**, a pending request reads **Read · Pending**, and Unlink (trainer) and Remove (trainee) both become **Revoke**. Each dashboard gets its own action button. Access text that does not fit collapses to a KeyRound icon that opens a dialog. The new vocabulary is carried into notifications, request toasts and Hub notices (S-40, MS-31).

## Current State Analysis

- **Database:** `trainer_links` stores only `status in ('pending','accepted')` (`supabase/migrations/20261027120000_trainer_link_requests.sql:6`).
  - Cancel, decline, unlink and remove all **delete the row** through `remove_trainer_link` (:300-336).
  - Trainer read access to measurements is the RLS rule `l.status = 'accepted'` (:68-82).
  - Nothing is stored per dashboard.
- **Database → UI mapping:** there is one, `toCollaboration` in `src/lib/collaborations.ts:35-43`, which maps `accepted → "linked"` and everything else to `"pending"`.
  - The type is `CollaborationStatus = "pending" | "linked"` (`src/types.ts:31-32`).
  - `LinkRequestOutcome` includes `"linked"` (`src/types.ts:49`), whitelisted in `src/lib/services/trainer-links.ts:8`, and it is the text returned by the `request_trainee_link` RPC.
- **Panel:** `src/components/hub/CollaborationsList.astro` has three columns: party, Status (`Link2` icon, :59-64, cell :86-88) and Actions (:65-67).
  - Wide-screen actions are inline at :101-145.
  - Phone actions are an ellipsis menu in `src/components/hub/CollaborationRowActions.tsx`.
  - The confirm prompt is `src/components/hub/ConfirmRemoveToast.tsx`, URL-driven via `?confirm=`. Its copy is "Unlink …" / "Remove …" (:50-52) and its intent is `unlink` / `remove` (:56).
- **Remove endpoint:** `src/pages/api/collaborations/remove.ts:17-25` accepts `cancel|unlink|decline|remove`. The intent only selects the notice code; the database decides what is deleted.
- **Notices:** `collaborationNoticeMessage` (`src/lib/collaborations.ts:67-84`) maps `unlinked → "Trainee unlinked"` and `removed → "Trainer removed"`.
- **Notifications:** stored as `kind` + actor fields with no text. `notificationMessage` (`src/lib/notifications.ts:50-70`) renders the text, so new wording applies to old rows too.
- **Request copy:** `requestOutcomeMessage` (`src/lib/collaborations.ts:45-56`). The measurements request button reads "Send request" (`src/components/trainer/TrainerPanel.astro:81`).
- **Note-fit pattern:** pure CSS in `src/styles/global.css:149-181` (`.note-fit`, `.note-fit-icon`, `.note-fit-text`), used only in `NoteRowCell` (`src/components/measurements/MeasurementBrowser.tsx:430-443`). The dialog is a native non-modal `<dialog>` (`NoteDialog`, :235-328).
- **Assertions on today's strings:**
  - Unit: `src/lib/collaborations.test.ts`, `src/lib/notifications.test.ts`, `src/lib/topbar.test.ts:228`.
  - E2E: `tests/e2e/hub-collaborations.spec.ts:224-311`.
  - Smoke: `scripts/smoke.mjs:772` (sent toast), `:1147-1157` (`unlink` intent, `notice=unlinked`).
  - `scripts/check-home-tokens.mjs:45` lists `ConfirmRemoveToast.tsx` by name.

## Desired End State

- **Trainer view:** `/hub/collaborations` has a party column and an **Access** header (KeyRound icon above "Access") spanning one sub-column per enabled dashboard. Today that is only **Measurements**.
  - An accepted link reads `Read` and has a **Revoke** action.
  - A pending request reads `Read · Pending` and has **Cancel request**.
- **Trainee view:** an accepted link reads `Read` with **Revoke**. A pending request reads `Read · Pending` with Accept and Decline.
- **Narrow cells:** when the access text does not fit, the cell shows a KeyRound icon. The icon opens a dialog listing the access for that dashboard.
- **Revoke:** confirms with copy that names the access and dashboard, deletes the link as before, and shows the notice `Access revoked` on both sides.
- **Wording everywhere:** notifications, the bell, request toasts and the measurements request button all use read-access-to-measurements wording. The kitchen sink shows the four-dashboard layout and the icon fallback.
- **Unchanged:** no database schema, RLS or RPC changes.

### Key Discoveries:

- `toCollaboration` is the single place to derive access from `status` (`src/lib/collaborations.ts:40`).
- The remove intent is wording only (`src/pages/api/collaborations/remove.ts:18`), so `revoke` needs no database work.
- Notification copy is rendered from `kind`, not stored (`supabase/migrations/20261027200000_notifications.sql:2-16`). Rewording needs no migration and updates historical rows.
- The note-fit pattern needs no JavaScript measuring; a class rename makes it shareable (`src/styles/global.css:149`).
- `CollaborationsList.astro` uses `@container` with `@lg:` breakpoints for the wide/narrow split (:48, :90, :101); the per-dashboard actions keep that split.

## What We're NOT Doing

- No new access table, column or RLS change. Access is derived in the UI from `trainer_links.status`. Real per-dashboard storage comes in the slice that ships a second dashboard.
- No rename of database values: `status` keeps `pending`/`accepted`, notification `kind` keeps `link_*`, and the `request_trainee_link` RPC still returns `'linked'`.
- No partial revoke. Revoking Measurements read deletes the whole link, because it is the only access today.
- Nutrition, Training and Planning are not rendered in the real app (`enabled: false`). They appear only in the kitchen sink.
- No access types beyond `read` and no UI to choose an access type when requesting.
- No Playwright test for the icon fallback. It is checked by eye in the kitchen sink.
- No change to the Hub Notifications table's own Read/Unread "Status" column.

## Implementation Approach

Model first, then UI, then fixtures and end-to-end tests.

**Phase 1** introduces typed dashboard access, rewrites every user-visible string in the library modules, and widens the remove endpoint to accept `revoke` while keeping the legacy intents. A browser that loaded the page before the deploy can then still submit `unlink`/`remove`, and both map to the same `Access revoked` notice.

**Phase 2** rebuilds the table around the access model, reusing the CSS fit trick and the native `<dialog>` pattern.

**Phase 3** proves the new layout in the kitchen sink and moves the e2e and smoke tests to the new copy and intent.

## Critical Implementation Details

**Copy contract.** These exact strings are the contract for Phases 1–3. Unit, e2e and smoke tests assert them. `{name}` is the `topbarName` rendering; `{email}` is the request email.

| Where | Key | Text |
| --- | --- | --- |
| Access cell | granted read | `Read` |
| Access cell | pending read | `Read · Pending` |
| Request toast | `sent` | `Your request for read access to measurements has been sent to {email}` |
| Request toast | `pending` | `A request for read access to measurements is already pending for {email}` |
| Request toast | `granted` | `{email} has already given you read access to measurements` |
| Request toast | `not_found` | `No trainee with that email` (unchanged) |
| Hub notice | `accepted` / `declined` / `cancelled` | `Request accepted` / `Request declined` / `Request cancelled` (unchanged) |
| Hub notice | `revoked`, legacy `unlinked`, legacy `removed` | `Access revoked` |
| Confirm (trainer) | revoke | `Revoke your read access to {name}'s measurements? You will no longer see their measurements.` |
| Confirm (trainee) | revoke | `Revoke {name}'s read access to your measurements? They will no longer see your measurements.` |
| Confirm button | both | `Revoke` |
| Notification | `link_requested` | `Trainer {name} requested read access to your measurements` |
| Notification | `link_accepted` | `Trainee {name} gave you read access to their measurements` |
| Notification | `link_declined` | `Trainee {name} declined your request for read access to their measurements` |
| Notification | `link_cancelled` | `Trainer {name} withdrew their request for read access to your measurements` |
| Notification | `link_removed`, actor trainer | `Trainer {name} revoked their read access to your measurements` |
| Notification | `link_removed`, actor trainee | `Trainee {name} revoked your read access to their measurements` |
| Measurements panel | request button | `Request read access` |

**Deploy overlap.** A page rendered by the previous Worker can still POST `intent=unlink` or `intent=remove`, or land on `?notice=unlinked` / `?notice=removed`. The new Worker must accept all of these. Do not drop the legacy intents or notice codes in this change.

## Phase 1: Access model and copy

### Overview

Introduce dashboard and access types plus a dashboard config, derive access from link status, remove the `linked` UI vocabulary, rewrite all copy per the contract table, and add the `revoke` intent.

### Changes Required:

#### 1. Shared types

**File**: `src/types.ts`

**Intent**: Replace the single collaboration status with access per dashboard, so the UI and later storage share one shape.

**Contract**:
- Add `Dashboard = "measurements" | "nutrition" | "training" | "planning"`, `AccessType = "read"`, and `DashboardAccess { type: AccessType; pending: boolean }`.
- `Collaboration` drops `status` and gains `access: Record<Dashboard, DashboardAccess[]>`.
- Remove `CollaborationStatus`.
- `LinkRequestOutcome` becomes `"sent" | "pending" | "granted" | "not_found"`.

#### 2. Dashboard config and access helpers

**File**: `src/lib/dashboards.ts` (new)

**Intent**: One ordered list of dashboards with labels and an `enabled` flag, plus pure helpers the list, the dialog and the tests use.

**Contract**:
- `dashboards: readonly { id: Dashboard; label: string; enabled: boolean }[]` in the order Measurements, Nutrition, Training, Planning. Only Measurements is enabled.
- `enabledDashboards()` returns the enabled entries.
- `accessLabel(entry)` returns `Read` or `Read · Pending`.
- `accessSummary(entries)` joins labels with `", "`; for an empty list it returns `—`.
- `hasGrantedAccess(collaboration, dashboard)` and `hasPendingAccess(collaboration, dashboard)` drive which action a cell shows.

#### 3. Status → access mapping and request/notice copy

**File**: `src/lib/collaborations.ts`

**Intent**: Derive access in `toCollaboration` and move every string to the contract table.

**Contract**:
- `toCollaboration`:
  - `accepted` → `measurements: [{ type: "read", pending: false }]`.
  - Any other status → `measurements: [{ type: "read", pending: true }]`.
  - Every other dashboard → `[]`.
- `requestOutcomeMessage` handles `granted` instead of `linked`.
- `collaborationNoticeMessage` maps `revoked`, `unlinked` and `removed` to `Access revoked`.

#### 4. RPC outcome mapping

**File**: `src/lib/services/trainer-links.ts`

**Intent**: Keep the RPC's `'linked'` text as a database contract and translate it at the service boundary.

**Contract**:
- The whitelist parses the RPC values `sent | pending | linked | not_found`.
- `requestTraineeLink` returns `granted` where the RPC said `linked`.
- `src/pages/api/trainer-links/index.ts` keeps its `outcome !== "sent"` branch unchanged.

#### 5. Notification copy

**File**: `src/lib/notifications.ts`

**Intent**: Reword `notificationMessage` for all five kinds per the contract table. Kinds and `notificationHref` are unchanged.

**Contract**: The `notificationMessage(notification)` signature is unchanged; only the strings change.

#### 6. Revoke intent

**File**: `src/pages/api/collaborations/remove.ts`

**Intent**: Accept the new `revoke` intent and an optional per-dashboard field, and keep the legacy intents for the deploy overlap.

**Contract**:
- `intentSchema = z.enum(["cancel", "decline", "revoke", "unlink", "remove"])`. `NOTICES` maps `revoke`, `unlink` and `remove` to `revoked`.
- New optional form field `dashboard`:
  - Validated against the enabled dashboard ids; missing means `measurements`.
  - An unknown value redirects to the `failed` URL.
  - A comment notes that it does not change what is deleted yet, since the whole link is the only access.

#### 7. Unit tests

**Files**: `src/lib/collaborations.test.ts`, `src/lib/notifications.test.ts`, `src/lib/topbar.test.ts`, new `src/lib/dashboards.test.ts`

**Intent**: Pin the mapping and every contract string.

**Contract**:
- `toCollaboration` for `accepted`, `pending` and an unknown status.
- `accessLabel` and `accessSummary`, including the empty list and multiple entries.
- `enabledDashboards` returns only Measurements.
- Each request outcome, notice code (including the legacy `unlinked`/`removed`) and notification kind/actor message.
- The `topbar.test.ts:228` fixture message is updated.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- No `CollaborationStatus` or `"linked"` UI literal remains in `src/` outside the RPC whitelist: `grep -rn "CollaborationStatus\|\"linked\"" src`

#### Manual Verification:

- An existing link-request notification in the bell reads `Trainer … requested read access to your measurements` after a reload

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Access column UI

### Overview

Rebuild the Collaborations table around per-dashboard access: a nested Access header, one cell per enabled dashboard with fit-or-icon access text, its own action, and the Revoke confirmation.

### Changes Required:

#### 1. Shared fit CSS

**Files**: `src/styles/global.css`, `src/components/measurements/MeasurementBrowser.tsx`

**Intent**: Rename `.note-fit`, `.note-fit-icon` and `.note-fit-text` to `.text-fit`, `.text-fit-icon` and `.text-fit-text` so the note cell and the access cell share one rule.

**Contract**: Same declarations under the new names, and the comment generalised to "a one-line value". The note cell renders exactly as before.

#### 2. Access cell with dialog

**File**: `src/components/hub/AccessCell.tsx` (new)

**Intent**: Show one dashboard's access summary as text when it fits. Otherwise show a KeyRound icon that opens a dialog listing the entries. Modelled on `NoteRowCell` + `NoteDialog`.

**Contract**:
- Props are `{ dashboardLabel, name, entries: DashboardAccess[] }`.
- **Trigger:** a ghost button with `text-fit` classes, `KeyRound` in `text-fit-icon` and `accessSummary(entries)` in `text-fit-text`, with `aria-label` `{dashboardLabel} access for {name}: {summary}` and `aria-expanded`.
- **Dialog:** a native `<dialog>` opened with `show()`, closed on Escape or an outside pointerdown. It is titled `{dashboardLabel} access` with `{name}` as subtitle, lists one `accessLabel` per line, and has a ghost X close button.
- **Empty list:** renders a muted `—` with no button.

#### 3. Nested Access column and per-dashboard actions

**File**: `src/components/hub/CollaborationsList.astro`

**Intent**: Replace the Status and Actions columns with an Access group of one sub-column per dashboard. Each cell holds the access cell and that dashboard's action.

**Contract**:
- **Optional prop:** `dashboards` (defaults to `enabledDashboards()`) so the kitchen sink can render all four.
- **Header row 1:** the party header with `rowSpan={2}`, then `Access` with a KeyRound icon above it, `colSpan={dashboards.length}`.
- **Header row 2:** one header per dashboard label.
- **Body:** one cell per dashboard containing the `AccessCell` and the action.
- **Wide (`@lg`) actions per dashboard:**
  - Trainer, pending: `Cancel request` (POST, intent `cancel`).
  - Trainer or trainee, granted: `Revoke` link to `?confirm=<otherId>&dashboard=<id>`, with `aria-label` `Revoke {dashboard} access for {name}`.
  - Trainee, pending: Accept/Decline icon buttons with `aria-label` `Accept {dashboard} request from {name}` / `Decline {dashboard} request from {name}`.
  - Every form carries a hidden `dashboard` field.
- **Narrow:** the per-dashboard `CollaborationRowActions` menu.
- **Confirm toast:** opens only for a row on this page whose `measurements` entry is granted. Drop the `Link2` import.

#### 4. Per-dashboard row actions menu

**File**: `src/components/hub/CollaborationRowActions.tsx`

**Intent**: Make the phone menu per dashboard and rename its linked item to Revoke.

**Contract**:
- Props replace `status` with `dashboard: Dashboard`, `dashboardLabel` and `entries: DashboardAccess[]`. The trigger `aria-label` becomes `{dashboardLabel} actions for {name}`.
- The granted item reads `Revoke` and links to `confirmHref`.
- The pending items are unchanged (`Cancel request` / `Accept request` / `Decline request`).
- Hidden forms carry the `dashboard` field.
- With no entries, no menu is rendered.

#### 5. Revoke confirmation

**Files**: `src/components/hub/ConfirmRemoveToast.tsx` → `src/components/hub/ConfirmRevokeToast.tsx`, `scripts/check-home-tokens.mjs`

**Intent**: Rename the component and move it to the Revoke copy and intent.

**Contract**:
- The copy is the trainer/trainee confirm strings from the contract table. The submit button reads `Revoke`. Hidden fields are `intent=revoke` and `dashboard`.
- `aria-labelledby` id becomes `confirm-revoke-toast`.
- The `check-home-tokens.mjs` file list points to the new filename.

#### 6. Measurements request button

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: The trainee-search submit button says what it asks for.

**Contract**: `Send request` → `Request read access`.

### Success Criteria:

#### Automated Verification:

- Home token check passes: `npm run check:home-tokens`
- Type checking passes: `npx astro check`
- Linting passes: `npm run lint`
- Unit tests pass: `npm test`
- Build succeeds: `npm run build`

#### Manual Verification:

- As a trainer at `/hub/collaborations`: an accepted trainee shows `Read` under Access → Measurements with a `Revoke` button, and a pending one shows `Read · Pending` with `Cancel request`
- As a trainee: a pending request shows Accept/Decline in the Measurements cell, and after Accept the cell shows `Read` with `Revoke`
- Revoke opens the confirm prompt with the contract copy; confirming removes the row and shows `Access revoked`
- At phone width, the Measurements cell falls back to the KeyRound icon when the text does not fit; the icon opens the access dialog, and Escape or an outside click closes it
- The measurement Note cell still shows text or the StickyNote icon exactly as before

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Kitchen sink and end-to-end assertions

### Overview

Show the new states in the hub kitchen sink, and move the e2e spec and the smoke test to the new copy and intent.

### Changes Required:

#### 1. Hub kitchen sink

**File**: `src/pages/kitchen-sink/hub.astro`

**Intent**: Fixtures use the `access` shape, and section copy moves to Access/Read/Revoke.

**Contract**:
- Existing sections are reworded ("Trainer, pending and read", "Confirm revoke", the `Access revoked` notice).
- New section "All four dashboards" passes all `dashboards` with mixed fixtures: Measurements granted, one future dashboard pending, the others empty.
- New section "Access that does not fit" renders the access cell in a narrow container so the KeyRound fallback and its dialog can be checked.
- Notification samples render the new messages.

#### 2. Other kitchen sinks

**Files**: `src/pages/kitchen-sink/home.astro`, `src/pages/kitchen-sink/trainer.astro`

**Intent**: Descriptions and sample states match the new notification and request copy. The data only changes where a fixture uses the removed `status` field.

**Contract**: Text-only updates plus any `access` fixture shape.

#### 3. E2E spec

**File**: `tests/e2e/hub-collaborations.spec.ts`

**Intent**: The request → accept → revoke journey asserts the new strings and controls.

**Contract**:
- `Your request for read access to measurements has been sent to …`, `Trainer … requested read access to your measurements`, the cell `Read` instead of `Linked`, and `Read · Pending` instead of `Pending`.
- `chooseRowAction` uses the `Measurements actions for …` trigger and the `Revoke` item, then the confirm `Revoke` button and the `Access revoked` notice.
- The notification matcher becomes `/^Trainee .+ gave you read access to their measurements/`.
- Cleanup helpers post `revoke` where they posted `remove`.
- The `a[href*="confirm="]` selector stays valid.

#### 4. Smoke test

**File**: `scripts/smoke.mjs`

**Intent**: The smoke flow covers the new intent and keeps one legacy check for the deploy overlap.

**Contract**:
- The sent-toast assertion at :772 uses the new copy.
- The unlink step at :1147 posts `revoke` and expects `notice=revoked`.
- The repeat at :1157 posts legacy `unlink` and expects the same failed redirect it expects today.
- A new step posts an unknown `dashboard` and expects `error=failed`.

### Success Criteria:

#### Automated Verification:

- Full CI gate passes locally: `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build`
- Smoke passes against the preview with local Supabase: `npm run smoke`
- E2E passes: `npx playwright test tests/e2e/hub-collaborations.spec.ts`

#### Manual Verification:

- `/kitchen-sink/hub` shows the four-dashboard layout, the pending state, the confirm-revoke prompt and the `Access revoked` notice
- `/kitchen-sink/hub` "Access that does not fit" shows the KeyRound icon, and its dialog lists the access entries
- `/kitchen-sink/home` and `/kitchen-sink/trainer` show the new notification and request copy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `toCollaboration`: `accepted` → granted read on Measurements; `pending` and unknown → pending read; other dashboards empty
- `accessLabel` / `accessSummary`: granted, pending, empty (`—`), several entries joined with `, `
- `enabledDashboards`: only Measurements, in config order
- Every request outcome, notice code (including the legacy `unlinked`/`removed` → `Access revoked`) and notification kind × actor role string from the copy contract

### Integration Tests:

- E2E: trainer requests read access → trainee sees `Read · Pending` and accepts → both see `Read` → trainer revokes → `Access revoked`, row gone, trainee notified with the revoke message
- Smoke: `revoke` intent, legacy `unlink` intent and unknown `dashboard` rejection; the existing trainer-catalog access checks before, while pending, after accept and after removal stay green, proving RLS is unchanged

### Manual Testing Steps:

1. As a trainer on `/measurements`, find a trainee and press `Request read access`; the toast names read access to measurements
2. As the trainee, open the bell: `Trainer … requested read access to your measurements`; accept in Hub → Collaborations
3. Shrink the window to phone width; the Measurements cell shows the KeyRound icon when `Read · Pending` or `Read` no longer fits, and the icon opens the dialog
4. Revoke from either side; check the confirm copy, the `Access revoked` notice and the other side's notification

## Performance Considerations

None. The fit fallback is CSS-only, and access is derived from rows already loaded.

## Migration Notes

No schema change. Stored notifications keep their `kind` and re-render with the new copy. Legacy `unlink`/`remove` intents and `unlinked`/`removed` notice codes stay accepted for pages rendered by the previous Worker; they can be dropped in a later release.

## References

- Change: `context/changes/improvment-for-status-collaborations/change.md`
- Roadmap: `context/foundation/roadmap.md` S-40
- Link table and RPCs: `supabase/migrations/20261027120000_trainer_link_requests.sql:6`, `:68-82`, `:300-336`
- Notifications: `supabase/migrations/20261027200000_notifications.sql:2-16`, `src/lib/notifications.ts:50-70`
- Fit pattern: `src/styles/global.css:149-181`, `src/components/measurements/MeasurementBrowser.tsx:235-328`, `:399-446`
- Prior changes: `context/archive/2026-10-27-hub-collaborations-handle`, `context/archive/2026-10-27-notification-system`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Access model and copy

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — 8bf2686
- [x] 1.2 Type checking passes: `npx astro check` — 8bf2686
- [x] 1.3 Linting passes: `npm run lint` — 8bf2686
- [x] 1.4 No `CollaborationStatus` or `"linked"` UI literal remains in `src/` outside the RPC whitelist: `grep -rn "CollaborationStatus\|\"linked\"" src` — 8bf2686

#### Manual

- [x] 1.5 An existing link-request notification in the bell reads `Trainer … requested read access to your measurements` after a reload — 8bf2686

### Phase 2: Access column UI

#### Automated

- [x] 2.1 Home token check passes: `npm run check:home-tokens` — fea5054
- [x] 2.2 Type checking passes: `npx astro check` — fea5054
- [x] 2.3 Linting passes: `npm run lint` — fea5054
- [x] 2.4 Unit tests pass: `npm test` — fea5054
- [x] 2.5 Build succeeds: `npm run build` — fea5054

#### Manual

- [x] 2.6 As a trainer at `/hub/collaborations`: an accepted trainee shows `Read` under Access → Measurements with a `Revoke` button, and a pending one shows `Read · Pending` with `Cancel request` — fea5054
- [x] 2.7 As a trainee: a pending request shows Accept/Decline in the Measurements cell, and after Accept the cell shows `Read` with `Revoke` — fea5054
- [x] 2.8 Revoke opens the confirm prompt with the contract copy; confirming removes the row and shows `Access revoked` — fea5054
- [x] 2.9 At phone width, the Measurements cell falls back to the KeyRound icon when the text does not fit; the icon opens the access dialog, and Escape or an outside click closes it — fea5054
- [x] 2.10 The measurement Note cell still shows text or the StickyNote icon exactly as before — fea5054

### Phase 3: Kitchen sink and end-to-end assertions

#### Automated

- [x] 3.1 Full CI gate passes locally: `npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build`
- [x] 3.2 Smoke passes against the preview with local Supabase: `npm run smoke`
- [x] 3.3 E2E passes: `npx playwright test tests/e2e/hub-collaborations.spec.ts`

#### Manual

- [x] 3.4 `/kitchen-sink/hub` shows the four-dashboard layout, the pending state, the confirm-revoke prompt and the `Access revoked` notice
- [x] 3.5 `/kitchen-sink/hub` "Access that does not fit" shows the KeyRound icon, and its dialog lists the access entries
- [x] 3.6 `/kitchen-sink/home` and `/kitchen-sink/trainer` show the new notification and request copy
