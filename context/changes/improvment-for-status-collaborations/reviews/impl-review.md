<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Per-dashboard access in Collaborations

- **Plan**: context/changes/improvment-for-status-collaborations/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-28
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Automated gates run during review: `npm run lint`, `npm run check:home-tokens`, `npx astro check` (0 errors), `npm test` (216/216), `npm run build`, `npm run smoke` (all steps passed), `npx playwright test tests/e2e/hub-collaborations.spec.ts` (3/3). Copy contract strings, the legacy intent/notice handling and the "What We're NOT Doing" list were all verified as matching.

## Findings

### F1 — Wide-screen inline actions dropped; plan not updated

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/hub/CollaborationsList.astro:115-129
- **Detail**: Plan Phase 2 §3 specifies `@lg` inline actions (a `Cancel request` POST, a `Revoke` link with aria-label `Revoke {dashboard} access for {name}`, and Accept/Decline icon buttons labelled `Accept/Decline {dashboard} request from {name}`), with the menu only at narrow widths. The code uses the per-dashboard ellipsis menu at every width, and none of those aria-labels exist. The 4f28e48 commit body and the kitchen-sink copy disclose this, but plan.md and plan-brief.md:63 ("a button on wide screens") were not updated. Manual row 2.6 ("with a `Revoke` button") is checked against behaviour that changed. The `CollaborationRowActions.tsx:42` comment still says "Phone-width actions".
- **Fix A ⭐ Recommended**: Add a plan addendum recording the menu-at-all-widths decision, update plan-brief.md:63, and fix the stale comment.
  - Strength: Matches what is shipped and tested (the e2e spec drives the menu at both widths); it is a disclosed, deliberate decision.
  - Tradeoff: More clicks on desktop than the plan intended.
  - Confidence: HIGH — the commit and kitchen sink already document the intent.
  - Blind spot: Whether the user wanted one-click actions on desktop.
- **Fix B**: Implement the planned `@lg` inline actions alongside the menu.
  - Strength: Restores the plan's desktop UX and its aria-label contract.
  - Tradeoff: Reintroduces the width pressure the commit avoided, especially with four dashboard columns; the e2e spec needs desktop branches.
  - Confidence: MED — layout fit with several dashboards is unproven.
  - Blind spot: How it renders in the "All four dashboards" kitchen-sink section.
- **Decision**: FIXED via Fix A (plan addendum, plan-brief.md, CollaborationRowActions.tsx comment)

### F2 — Revoke on any enabled dashboard deletes the whole link

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/collaborations/remove.ts:30-36, 50-52
- **Detail**: `dashboard` is validated against `enabledDashboards()`, but `removeTrainerLink` always deletes the whole link. Today only Measurements is enabled, so this is correct. But flipping `enabled: true` on any other dashboard in `src/lib/dashboards.ts` would make "Revoke Nutrition" silently delete the trainee's measurements access too. Only a comment guards this.
- **Fix A ⭐ Recommended**: Accept only `measurements` (or missing) in remove.ts; reject other ids with `failed` until per-dashboard storage exists.
  - Strength: Makes the "revoke = delete whole link" assumption fail closed; one-line change; existing smoke step (unknown dashboard → failed) still holds.
  - Tradeoff: Whoever enables a second dashboard must touch the route, which is the point.
  - Confidence: HIGH — narrow, local change.
  - Blind spot: None significant.
- **Fix B**: Keep the enabled-list validation and add a unit test asserting that `enabledDashboards()` is exactly `["measurements"]`, with a message pointing at remove.ts.
  - Strength: No route change; the tripwire sits next to the config.
  - Tradeoff: The test can be updated without reading the message; it doesn't protect at runtime.
  - Confidence: MED — relies on discipline.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A (`dashboardSchema = z.literal("measurements").optional()`)

### F3 — Unplanned table layout work and an inaccurate kitchen-sink claim

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/styles/global.css:183-195; src/components/hub/CollaborationsList.astro:58-72; src/pages/kitchen-sink/hub.astro
- **Detail**: Phase 3 added `[data-collaborations-table]` width rules driven by `--dashboard-count`, a `<colgroup>`, a sticky party column, and horizontal scrolling (removing `overflow-x-clip`). It also widened the kitchen-sink "Multi-page" card. These are benign and support the four-dashboard layout, but none are in the plan. The "All four dashboards" text says "Actions for a disabled dashboard are refused by the route". That is true for `/remove`, but `/api/collaborations/accept` does not validate `dashboard`.
- **Fix**: Record the layout additions in the plan addendum (with F1), and reword the kitchen-sink sentence to name only revoke/cancel/decline.
- **Decision**: FIXED (plan addendum; kitchen-sink/hub.astro sentence reworded)

### F4 — AccessCell.tsx not covered by check:home-tokens

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: scripts/check-home-tokens.mjs:42-47
- **Detail**: Every other hub component, including the renamed `ConfirmRevokeToast.tsx`, is listed in `FILES`, but the new view `src/components/hub/AccessCell.tsx` is not, so CI never token-checks it.
- **Fix**: Add `"src/components/hub/AccessCell.tsx"` to `FILES` next to the other hub entries.
- **Decision**: FIXED (added to FILES; check:home-tokens clean)

### F5 — Access header lost its KeyRound icon; plan not updated

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/hub/CollaborationsList.astro:81-83
- **Detail**: Plan Phase 2 §3 and the Desired End State put a KeyRound icon above "Access". The code shows plain "Access". The fea5054 commit body explains why ("so the header fits in two lines"), but the plan was not amended.
- **Fix**: Include it in the same plan addendum as F1/F3.
- **Decision**: FIXED (plan addendum)

### F6 — `?dashboard=` on the confirm URL is ignored

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: src/components/hub/CollaborationsList.astro:38-41, 173-181; src/components/hub/ConfirmRevokeToast.tsx
- **Detail**: `confirmHref` adds `&dashboard=<id>`, but `collaborations.astro` never reads it. The toast is always given `dashboard="measurements"` with measurements-only copy. This is harmless today, but a second dashboard would show Measurements copy for a Nutrition revoke.
- **Fix**: Add a follow-up to the roadmap's second-dashboard slice: parse `dashboard` against the enabled ids, use `hasGrantedAccess(row, dashboard)`, and derive the toast copy from the dashboard label.
- **Decision**: FIXED differently: wired through now. `collaborations.astro` passes `?dashboard=` as `confirmDashboard`. `CollaborationsList` resolves it against its `dashboards` prop (missing → measurements; unknown or hidden → no toast) and checks `hasGrantedAccess(row, dashboard.id)`. `ConfirmRevokeToast` builds its copy from `dashboardLabel`, and the Measurements strings are unchanged.

### F7 — Several access dialogs can be open at once

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/hub/AccessCell.tsx:127, 156-166
- **Detail**: `MeasurementBrowser` keeps one `openNoteId`, so only one note dialog can be open. Each `AccessCell` keeps its own `open` state. Opening a second cell by keyboard leaves the first dialog open, so the centred dialogs overlap, and Escape closes all of them. (Focus is also not returned to the trigger on close, but that gap was copied from `NoteDialog`.)
- **Fix**: When an access dialog opens, close any others: lift the open id into the list, or broadcast an "access-dialog-open" event.
- **Decision**: FIXED (the `access-dialog-open` document event closes other open access dialogs)

### F8 — Duplicated "granted" check in CollaborationRowActions

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/hub/CollaborationRowActions.tsx:55
- **Detail**: `entries.some((entry) => !entry.pending)` re-implements `hasGrantedAccess` from `src/lib/dashboards.ts:33` at the entries level.
- **Fix**: Add an entries-level helper (e.g. `isGranted(entries)`) to dashboards.ts, and use it in both places.
- **Decision**: FIXED (`isGranted` added and unit-tested; used by `hasGrantedAccess` and `CollaborationRowActions`)

### F9 — "Linked trainees" label survives the rename

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/trainer/LinkedTraineeField.tsx:67
- **Detail**: `aria-label="Linked trainees"` is the only remaining "Linked" wording in src/, tests/ and scripts/. The plan did not list this file, so the omission is consistent with the plan, but it diverges from the change's vocabulary ("linked" → "read").
- **Fix**: Rename to e.g. "Trainees with read access" and update any e2e selector that uses it, or leave it for a later wording pass.
- **Decision**: FIXED (aria-label is now "Trainees with read access"; no selector used it)
