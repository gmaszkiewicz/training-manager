# Per-dashboard access in Collaborations — Plan Brief

> Full plan: `context/changes/improvment-for-status-collaborations/plan.md`

## What & Why

Hub → Collaborations shows one Status per trainer–trainee link ("Pending" / "Linked"). The product is heading toward access per dashboard: Measurements, Nutrition, Training and Planning, each with several access types later. This change replaces Status with a nested **Access** column. "Linked" becomes **Read**, and Unlink/Remove become **Revoke**. Each dashboard gets its own action, and the same vocabulary goes into notifications and toasts (S-40, MS-31).

## Starting Point

`trainer_links` stores only `pending` / `accepted`. Every unlink, remove, decline or cancel deletes the row, and RLS lets a trainer read measurements when the link is `accepted`. `toCollaboration` in `src/lib/collaborations.ts` is the single database→UI mapping. Notification text is rendered from `kind` in `src/lib/notifications.ts`, not stored.

## Desired End State

**Collaborations panel**
- An Access header spans one sub-column per enabled dashboard; today that is only Measurements.
- An accepted link reads `Read` with **Revoke**.
- A pending request reads `Read · Pending`, with **Cancel request** on the trainer side or Accept/Decline on the trainee side.
- On a narrow screen, text that does not fit becomes a KeyRound icon that opens an access dialog.
- Revoke confirms, then shows `Access revoked`.

**Copy elsewhere**
- Notifications, request toasts and the measurements button ("Request read access") all speak of read access to measurements.

**Unchanged**
- The database, RLS and RPCs.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Where access lives | Derived in the UI from `status` behind a typed `access` shape | No migration or RLS risk for one working dashboard; the type is ready for real storage later. |
| Pending display | `Read · Pending` | Says what was requested, which matters once requests can ask for several access types. |
| Future dashboards | Defined in a config with `enabled: false`, hidden in the app, shown in the kitchen sink | No dead columns for users; one flag adds a column later. |
| Revoke scope | Revoking Measurements read deletes the whole link | It is the only access today; partial revoke comes with real per-dashboard storage. |
| Access icon | Lucide `KeyRound` | Reads as access and is already in the icon set. |
| Copy depth | Every message names the access and the dashboard; one `Access revoked` notice for both sides | Consistent with the Access column and ready for more dashboards. |
| Testing | Update unit/e2e/smoke, add unit tests for the mapping and config, check the fit fallback by eye in the kitchen sink | Covers where it can break without a brittle width-dependent e2e test. |
| Deploy overlap | Keep the legacy `unlink`/`remove` intents and `unlinked`/`removed` notice codes | A page rendered by the previous Worker still submits correctly. |

## Scope

**In scope:**
- `Dashboard`/`DashboardAccess` types and a dashboard config
- Status → access mapping
- Rewriting every collaboration, notification and toast string
- The `revoke` intent and the `dashboard` form field
- The nested Access column, a per-dashboard `AccessCell` with a KeyRound dialog, and per-dashboard actions
- `ConfirmRevokeToast`
- Renaming the note-fit CSS to a shared `text-fit`
- Kitchen sink, e2e and smoke updates

**Out of scope:**
- New access storage or RLS changes, and renaming database status, kind or RPC values
- Partial revoke, and access types beyond `read`
- Rendering Nutrition, Training or Planning in the app
- A Playwright test for the icon fallback

## Architecture / Approach

`toCollaboration` turns `accepted` into `measurements: [{ type: "read", pending: false }]` and anything else into `pending: true`; other dashboards get `[]`. `src/lib/dashboards.ts` holds the ordered dashboard list and the label helpers (`Read`, `Read · Pending`).

`CollaborationsList.astro` renders a two-row header: the party column, and Access spanning one column per enabled dashboard. Each cell holds an `AccessCell` and that dashboard's action. The `AccessCell` uses the CSS-only `text-fit` trick and a native `<dialog>`. The actions sit in a per-dashboard ellipsis menu at every width.

The remove endpoint still deletes the link. The intent only picks the notice.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Access model and copy | Types, dashboard config, mapping, all new strings, `revoke` intent, unit tests | Missing a string or a `linked` literal that a test or page still uses |
| 2. Access column UI | Nested Access header, `AccessCell` + dialog, per-dashboard actions, Revoke confirm, shared fit CSS | Header `rowSpan`/`colSpan` and the narrow layout inside `@container`; the note cell regressing after the CSS rename |
| 3. Kitchen sink and end-to-end assertions | Four-dashboard and fallback states in the kitchen sink; e2e and smoke on the new copy | E2E selectors tied to the old Status cell and the "Actions for" trigger |

**Prerequisites:** S-37 and S-39 merged (they are). Local Supabase (Docker) for smoke and e2e.
**Estimated effort:** about 2–3 sessions across 3 phases.

## Open Risks & Assumptions

- The derived access shape is an assumption about the future storage model. The slice that ships a second dashboard may reshape `DashboardAccess` and has to add storage and partial revoke.
- Old notifications re-render with the new copy. That is intended, but historical "removed the link" items will read "revoked … read access".
- The legacy intents and notice codes must stay until a later release.

## Success Criteria (Summary)

- A trainer and a trainee see access per dashboard (`Read` / `Read · Pending`) and can Revoke from the Measurements cell, with the confirm text, notice and notification all naming read access to measurements.
- On a phone, access that does not fit collapses to a KeyRound icon that opens a dialog, and the measurement Note cell is unchanged.
- The CI gate, smoke and e2e pass, with no database or RLS change.
