# Refresh the test plan, expand app tests, and fix iOS Safari menus — Implementation Plan

## Overview

Close-out plan for S-34 / MS-26. The product work and the test-plan refresh are already in the repo. `/10x-implement` confirms those artifacts and records Progress. It does not rebuild them.

## Current State Analysis

`change.md` is `implemented`. There was no `plan.md`, so archive could not read Progress.

Shipped and in force:

- Shared DropdownMenu opens on click. `DropdownMenuTrigger` calls `preventDefault` on `pointerdown` and toggles on `click` (`src/components/ui/dropdown-menu.tsx`).
- `tests/e2e/measurements-menus.spec.ts` uses a 360×800 viewport, clicks **Menu**, expects **Sign out**, then clicks the first row **Actions** button and expects **Edit** and **Delete**. Playwright projects stay Desktop Chromium only (`playwright.config.ts`).
- Phase 1 Manual Verification below records Passed 2026-10-20 for Safari iOS and Firefox (no separate checklist file).
- Off-page list deltas stay in `src/lib/measurement-page.test.ts` (`deltasForVisiblePage` matches full-journal `withDeltas` when the previous row is outside the page, including page 2). June smoke still expects `weightDelta` up 8 (`scripts/smoke.mjs`). No new Risk #8 test was added.
- `context/foundation/test-plan.md` already has risks #7 and #8, rollout phases 6 and 7 (both complete), §4 counts, §6.6, §7 exclusions, and freshness 2026-10-20.

## Desired End State

A maintainer can follow the refreshed test plan. A phone-width measurements screen opens the hamburger and row actions on one click in Desktop Chromium, and the passed manual checklist still covers Safari iOS and Firefox. Off-page month-page arrows stay locked by the existing unit and the June smoke path. This change folder has a Progress section whose rows match those checks.

### Key Discoveries:

- Menu open/close is one shared trigger (`src/components/ui/dropdown-menu.tsx:49-73`), used by the top bar and by row actions.
- CI installs Chromium only. Desktop Chromium does not prove Safari iOS or Firefox. The manual checklist is that proof.
- `measurement-previous` is the add-form predecessor. Risk #8 is `deltasForVisiblePage` plus `selectOlderRow`, already tested at `src/lib/measurement-page.test.ts:380-396`.
- June live coverage is `juneDifference` → `weightDelta: { direction: "up", difference: 8 }` in `scripts/smoke.mjs`.

## What We're NOT Doing

- Re-applying the DropdownMenu workaround, rewriting the menu spec, or regenerating `test-plan.md`.
- Adding WebKit or Firefox Playwright projects.
- Adding a unit, e2e, or smoke test for Risk #8, including a same-month `page=2` smoke.
- Using kitchen-sink screens, screenshots, or CSS class names as the menu oracle.
- A full multi-browser matrix of every page.
- Opening a second change folder.
- Moving roadmap S-34 backward from `done`, or moving `change.md` status backward from `implemented`.

## Implementation Approach

Each phase confirms an artifact that is already on disk. Automated checks are read-only commands against that tree. If a check fails, stop and report the mismatch. Do not invent a replacement design in the same phase.

Verification order follows the shipped test-plan rollout: menus (phase 6), then the Risk #8 record (phase 7), then the guide text that documents both. The cookbook pattern already lives in §6.6, so it is part of the guide check.

## Critical Implementation Details

- **Verification only.** The absence of a prior `plan.md` does not mean the code is missing. Treat a green check as the phase result.
- **Playwright.** `npx playwright test` builds and previews the app (`playwright.config.ts` `webServer`). It needs the usual local E2E env (`.env` or CI variables, local Supabase, the setup user). Outside CI it reuses an existing server on port 4321.
- **Status.** `change.md` stays `implemented`. Roadmap S-34 stays `done`. Do not flip either backward when this plan appears.

## Phase 1: Phone-width first-tap menus

### Overview

Confirm the shared click-open path, the 360×800 menu spec, and the passed Safari iOS / Firefox checklist.

### Changes Required:

#### 1. Shared DropdownMenu trigger

**File**: `src/components/ui/dropdown-menu.tsx`

**Intent**: Leave the click-open trigger in place so the hamburger and row actions do not depend on Radix `pointerdown`.

**Contract**: `DropdownMenuTrigger` calls `event.preventDefault()` on `pointerdown`, then `control.toggle()` on `click` when the click was not `defaultPrevented`. `DropdownMenu` keeps `open` so `toggle` can flip it.

#### 2. Phone-width menu spec

**File**: `tests/e2e/measurements-menus.spec.ts`

**Intent**: Leave the live `/measurements` interaction as the Chromium proof of reachable Sign out, Edit, and Delete.

**Contract**: Viewport 360×800. One test clicks the button named `Menu` and expects a `menuitem` named `Sign out`, then clicks the first button named `/^Actions for measurement from /` and expects `menuitem` names `Edit` and `Delete`. When that actions button is absent, the spec seeds the current UTC month with `POST /api/measurements`.

#### 3. Manual record (in this plan)

**File**: this `plan.md` — Manual Verification below

**Intent**: Keep the real-device record in the plan. CI does not claim Safari iOS or Firefox. Do not keep a separate `manual-menus-checklist.md`.

**Contract**: Manual Verification states Passed 2026-10-20. Safari iOS and Firefox checks for Menu → Sign out and row Actions → Edit / Delete stay checked.

### Success Criteria:

#### Automated Verification:

- Phone-width menu spec passes: `npx playwright test tests/e2e/measurements-menus.spec.ts`
- Shared trigger still defers open to click: `node -e "const s=require('fs').readFileSync('src/components/ui/dropdown-menu.tsx','utf8'); if(!s.includes('event.preventDefault()')||!s.includes('control?.toggle()')) process.exit(1)"`

#### Manual Verification:

CI proves these interactions on Desktop Chromium at 360×800 only. Complete this checklist on a real device or engine before treating Risk #7 as closed.

**Passed:** 2026-10-20 (Safari iOS + Firefox).

Setup:

1. Sign in as a trainee with at least one measurement (or add one).
2. Open `/measurements` at phone width (or a real phone).
3. Confirm the top bar shows the hamburger (Menu), not the inline Sign out.

Safari iOS:

- [x] One tap on **Menu** opens the menu and shows **Sign out** (no second tap).
- [x] One tap on a row’s **Actions** (⋯ under the date) opens the menu and shows **Edit** and **Delete**.
- [x] Choosing **Edit** or **Delete** navigates as expected; **Sign out** signs out.

Firefox (phone width or mobile):

- [x] Same **Menu** → **Sign out** first-tap check.
- [x] Same row **Actions** → **Edit** / **Delete** first-tap check.

Out of scope for this checklist: kitchen-sink screens; screenshot or visual diffs; a full multi-browser matrix of every page.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Off-page previous-entry delta

### Overview

Confirm Risk #8 stays covered by the existing page unit and the June smoke expectation. Add nothing.

### Changes Required:

#### 1. Page unit

**File**: `src/lib/measurement-page.test.ts`

**Intent**: Do not add a Risk #8 case. The off-page and cross-month page cases already match full-journal `withDeltas`.

**Contract**: `deltasForVisiblePage` tests at `src/lib/measurement-page.test.ts:380-396` stay the proof. Do not treat `measurement-previous` tests as this risk.

#### 2. June smoke expectation

**File**: `scripts/smoke.mjs`

**Intent**: Do not add a same-month `page=2` assertion or any other Risk #8 smoke.

**Contract**: `juneDifference` still expects `weightDelta` up 8. That remains the live cross-month path. This phase does not run the smoke stack.

### Success Criteria:

#### Automated Verification:

- Off-page page unit still passes: `npm test -- src/lib/measurement-page.test.ts`
- June smoke still expects weight up 8: `node -e "const s=require('fs').readFileSync('scripts/smoke.mjs','utf8'); const q=String.fromCharCode(34); const needle='weightDelta: { direction: '+q+'up'+q+', difference: 8 }'; if(!s.includes('function juneDifference')||!s.includes(needle)) process.exit(1)"`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Test-plan refresh

### Overview

Confirm the guide already records risks #7 and #8, rollout phases 6 and 7, the test-base counts, §6.6, and the §7 exclusions.

### Changes Required:

#### 1. Test plan

**File**: `context/foundation/test-plan.md`

**Intent**: Do not rewrite the guide. Confirm the S-34 record is the one a maintainer should follow.

**Contract**: The file contains risks #7 and #8, rollout phase names "Phone-width first-tap menus" and "Off-page previous-entry delta", `measurements-menus.spec.ts`, §4 counts of 10 product Vitest files and 3 Playwright specs, heading `### 6.6 Phone-width menus`, the sentence `No new unit, e2e, or smoke`, kitchen-sink and broad-screenshot exclusions, and freshness dates 2026-10-20.

### Success Criteria:

#### Automated Verification:

- Guide still records the S-34 refresh: `node -e "const s=require('fs').readFileSync('context/foundation/test-plan.md','utf8'); const need=['Risk #7','Risk #8','measurements-menus.spec.ts','10** product Vitest','3** Playwright specs','Phone-width first-tap menus','Off-page previous-entry delta','### 6.6 Phone-width menus','No new unit, e2e, or smoke','Kitchen-sink screens and visual restyles','No broad browser or screenshot suite','2026-10-20']; const missing=need.filter(n=>!s.includes(n)); if(missing.length){console.error(missing); process.exit(1)}"`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Re-run `src/lib/measurement-page.test.ts`. Do not add cases.

### Integration Tests:

- Re-run `tests/e2e/measurements-menus.spec.ts` on Desktop Chromium at 360×800. Do not add browser projects.

### Manual Testing Steps:

1. Confirm Phase 1 Manual Verification still records Passed 2026-10-20 for Safari iOS and Firefox.
2. Do not repeat the device pass unless that record no longer says Passed.

## Performance Considerations

None. This plan does not change runtime paths.

## Migration Notes

None. No schema change.

## References

- Related research: `context/changes/test-app-refresh-and-fixes/research.md`
- Change notes and accepted brief: `context/changes/test-app-refresh-and-fixes/change.md`
- Manual Safari iOS / Firefox record: Phase 1 Manual Verification in this plan
- Guide: `context/foundation/test-plan.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/118
- Similar implementation: `src/components/ui/dropdown-menu.tsx:49-73`
- Off-page unit: `src/lib/measurement-page.test.ts:380-396`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Phone-width first-tap menus

#### Automated

- [x] 1.1 Phone-width menu spec passes: `npx playwright test tests/e2e/measurements-menus.spec.ts` — 3a08eb7
- [x] 1.2 Shared trigger still defers open to click: `node -e "const s=require('fs').readFileSync('src/components/ui/dropdown-menu.tsx','utf8'); if(!s.includes('event.preventDefault()')||!s.includes('control?.toggle()')) process.exit(1)"` — 3a08eb7

#### Manual

- [x] 1.3 Confirm Phase 1 Manual Verification still records Passed 2026-10-20 for Safari iOS Menu and row Actions, and the same two Firefox checks — 3a08eb7

### Phase 2: Off-page previous-entry delta

#### Automated

- [x] 2.1 Off-page page unit still passes: `npm test -- src/lib/measurement-page.test.ts` — 8837b79
- [x] 2.2 June smoke still expects weight up 8: `node -e "const s=require('fs').readFileSync('scripts/smoke.mjs','utf8'); const q=String.fromCharCode(34); const needle='weightDelta: { direction: '+q+'up'+q+', difference: 8 }'; if(!s.includes('function juneDifference')||!s.includes(needle)) process.exit(1)"` — 8837b79

### Phase 3: Test-plan refresh

#### Automated

- [x] 3.1 Guide still records the S-34 refresh: `node -e "const s=require('fs').readFileSync('context/foundation/test-plan.md','utf8'); const need=['Risk #7','Risk #8','measurements-menus.spec.ts','10** product Vitest','3** Playwright specs','Phone-width first-tap menus','Off-page previous-entry delta','### 6.6 Phone-width menus','No new unit, e2e, or smoke','Kitchen-sink screens and visual restyles','No broad browser or screenshot suite','2026-10-20']; const missing=need.filter(n=>!s.includes(n)); if(missing.length){console.error(missing); process.exit(1)}"`
