# Find trainee in the top bar Implementation Plan

## Overview

Move Find trainee out of the collapsible tile on `/measurements` and into the shared top bar: a trainer sees a search field with a magnifier and the label "Find trainee" at the top left. Clicking it opens a centered dialog (like the "Search documentation…" dialog on ui.shadcn.com) titled Find trainee, with the subtitle "Request access to a trainee's dashboards", the trainee email search with the placeholder "Find trainee by email, first name or last name", a "Request for" group of four checkboxes (Measurements enabled, Nutrition, Training and Planning disabled) and a Request access button. Roadmap item S-49 (MS-40), issue #181.

## Current State Analysis

- The trainer panel renders a `find-trainee` `CollapsibleTile` with `TraineeEmailSearch` inside a plain form that POSTs to `/api/trainer-links` (`src/components/trainer/TrainerPanel.astro:143-163`). The POST answers only with redirects to `/measurements?requested=…` or `/measurements?error=…` (`src/pages/api/trainer-links/index.ts:57-92`), so a request from any other page would throw the trainer onto `/measurements`.
- `TraineeEmailSearch` already implements the S-29 rules (debounced-by-serial GET `/api/trainer-links?q=`, at most 10 unlinked matches from the server, choosing a row fills the field, Esc/outside click closes the list, an empty submit is blocked through the enclosing form's `submit` event with the "Enter an email address" toast) (`src/components/trainer/TraineeEmailSearch.tsx:47-230`). Its placeholder is hard-coded to "Find trainee by email" (`:196`).
- `find-trainee` is a trainer-only switchable component in the version registry (`src/lib/components.ts:49`); `isComponentShown` and `isModuleOn` already exist (`src/lib/components.ts:224-232`).
- The top bar is SSR-rendered by `src/components/Topbar.astro`, which reads names, avatar and component settings through `readTopbarProfile` (`src/lib/services/profile-details.ts:84-107`) — it does **not** select `role` today. `topbarModel` (`src/lib/topbar.ts`) builds links and the account menu; `TopbarActions.tsx` renders everything right-aligned (`justify-end`), so the left side is free.
- `src/components/ui/` has `checkbox`, `input`, `button`, `label` but no `dialog`.
- When the tile goes, the "Find trainee is off" branch of the `/measurements` empty card loses its meaning (`TrainerPanel.astro:131-135, 180-189`).
- The tile's open state is remembered in a cookie/storage key `findTraineeOpenStorageKey` (`src/lib/measurement-page.ts:97-99`, read in `src/pages/measurements.astro:150, 429`).
- Tests on the old entry point: `tests/e2e/hub-collaborations.spec.ts:214-232` (types into the `/measurements` Email textbox and clicks "Request read access"), `scripts/smoke.mjs:826` and `:1528` (trainer `/measurements` body contains / trainee body forbids "Find trainee by email"); `scripts/smoke.mjs` also checks the POST redirect contract in ~8 places (`:836-1129`).

## Desired End State

- A signed-in **trainer** whose Measurements module is on and whose `find-trainee` component is not off sees, at the top left of the top bar on every page, a search-styled trigger with a magnifier and "Find trainee". Trainees and guests see the top bar exactly as today.
- On a narrow screen the trigger keeps its label while the left slot has room and collapses to the magnifier alone (still labelled "Find trainee" for assistive tech) when it does not.
- Clicking the trigger (or Enter/Space on it) opens a centered modal dialog; Esc or a click on the overlay closes it and focus returns to the trigger. No keyboard shortcut opens it.
- In the dialog: heading Find trainee, subtitle "Request access to a trainee's dashboards", the email search (placeholder "Find trainee by email, first name or last name"; it still searches by email only), a "Request for" group — Measurements checked and enabled, Nutrition, Training, Planning disabled — and a Request access button that is disabled while Measurements is unchecked.
- Request access sends in place. On `sent` the dialog closes and the existing notice "Your request for read access to measurements has been sent to <email>" toasts on the current page. On not found / pending / granted / failure the dialog stays open and shows the outcome message from `requestOutcomeMessage` / `requestFailedMessage`; an empty email keeps the existing "Enter an email address" behaviour.
- `/measurements` no longer has a Find trainee tile. A trainer with no trainees sees one card that points to Find trainee in the top bar (or to Settings → Components when Find trainee is off).
- The Settings → Components "Find trainee" row now shows or hides the top-bar field.

### Key Discoveries:

- POST `/api/trainer-links` keeps its redirect branch; smoke (`scripts/smoke.mjs:836-1129`) asserts it, and a page left open during a deploy may still post the old form.
- `requestOutcomeMessage` (`src/lib/collaborations.ts:51-63`) and `requestFailedMessage` (`:71`) are the single source of outcome copy — reuse them in the JSON answer.
- `PageErrorToasts` supports `tone="notice"` (`src/components/measurements/PageErrorToasts.tsx`) and is already used from islands — reuse it for the success toast.
- `dashboards` (`src/lib/dashboards.ts:10-15`) is the ordered list Measurements, Nutrition, Training, Planning with `enabled` — drive the checkboxes from it so they enable themselves when a dashboard ships.
- The top bar row is a card `flex justify-between` in `Topbar.astro:65`; `TopbarActions` owns the whole row.

## What We're NOT Doing

- No search by first or last name — the placeholder announces it, a follow-up task adds it.
- No Ctrl/⌘ K (or any) keyboard shortcut and no kbd hint.
- No access requests for Nutrition, Training or Planning; their checkboxes are disabled and the server still asks only for read access to measurements.
- No change to the request RPC, the database, RLS or migrations.
- No Find trainee entry for trainees or guests.
- No removal of the `find-trainee` component from the registry, and no change to the redirect branch of POST `/api/trainer-links`.
- No change to Hub → Collaborations beyond the e2e entry point.

## Implementation Approach

Build the dialog island and its JSON request path first, previewable in the trainer kitchen sink without touching the live top bar. Then wire it into the top bar behind a model flag computed on the server from role + module + component setting. Finally remove the old tile and move smoke and e2e to the new entry point, so at each phase end the app has exactly one working way to request a trainee.

## Critical Implementation Details

- **Form submit and the empty-email guard** — `TraineeEmailSearch` blocks an empty submit by listening to its closest `<form>`'s `submit` event. The dialog must keep a real `<form>` around it and do its fetch in the form's own `onSubmit` handler that respects `event.defaultPrevented` (the search's listener prevents default on an empty email); otherwise the empty case would post.
- **Search list inside the dialog** — the match list is absolutely positioned below the input (`TraineeEmailSearch.tsx:209`); the dialog content must not clip overflow, and its outside-click handler must not treat a click on a match as "outside" the dialog (the list is rendered inside the dialog content, so Radix keeps it inside).
- **Toast after close** — the success toast must be rendered by the top-bar island's own state (outside the dialog content), so it survives the dialog unmounting.

## Phase 1: Dialog and JSON request

### Overview

Add the shadcn Dialog, give POST `/api/trainer-links` a JSON answer, and build the `FindTraineeDialog` island with its trigger, previewed in the trainer kitchen sink.

### Changes Required:

#### 1. shadcn Dialog

**File**: `src/components/ui/dialog.tsx`

**Intent**: Add the shared Dialog primitive the find dialog is built on; it gives the centered modal, overlay click and Esc to close, focus trap and focus return.

**Contract**: Installed with `npx shadcn@latest add dialog` (new-york, `radix-ui` package already present). No hand edits beyond what lint/format require.

#### 2. JSON answer for the request

**File**: `src/pages/api/trainer-links/index.ts`

**Intent**: When the POST asks for JSON, answer with the outcome instead of a redirect, so the dialog can stay on the current page; the redirect branch stays as is.

**Contract**: A request whose `Accept` header includes `application/json` gets `json({ outcome, message }, status)`: `outcome` is `"sent" | "pending" | "granted" | "not_found" | "empty" | "failed"`, `message` is the existing copy (`requestOutcomeMessage`, `"Enter an email address"`, `requestFailedMessage`, `"Supabase is not configured"`). Status 200 for `sent`, 400 for `empty`, 409 for `pending`/`granted`, 404 for `not_found`, 500 for `failed`/not configured, 401 when signed out. The form's optional `dashboards` field is accepted but only `measurements` is requested (the RPC is unchanged). Validation stays with zod.

#### 3. Request helpers

**File**: `src/lib/find-trainee.ts` (+ `src/lib/find-trainee.test.ts`)

**Intent**: Keep the dialog's pure logic testable: which Request for options exist and are enabled, whether Request access is enabled, and how a JSON answer becomes "close + toast" or "stay + message".

**Contract**: `requestForOptions()` returns the four `dashboards` entries with `{ id, label, enabled }`; `canRequestAccess(selected: Dashboard[])` is true only when at least one enabled dashboard is selected; `readRequestAnswer(value: unknown)` returns `{ kind: "sent"; message } | { kind: "error"; message }`, falling back to `requestFailedMessage` for anything malformed. Copy constants for the dialog live here: title "Find trainee", description "Request access to a trainee's dashboards", placeholder "Find trainee by email, first name or last name", trigger label "Find trainee", group label "Request for", button "Request access".

#### 4. Placeholder prop on the email search

**File**: `src/components/trainer/TraineeEmailSearch.tsx`

**Intent**: Let the dialog pass its own placeholder while the search keeps all its S-29 behaviour.

**Contract**: Optional `placeholder?: string`, defaulting to today's "Find trainee by email".

#### 5. Find trainee island

**File**: `src/components/trainer/FindTraineeDialog.tsx`

**Intent**: The trigger plus the dialog: a search-styled button (magnifier + "Find trainee") opening a centered Dialog with the title, description, `TraineeEmailSearch`, the Request for checkboxes, and Request access; it submits via `fetch` with `Accept: application/json`, closes and toasts on `sent`, shows the message inside the dialog otherwise.

**Contract**: Default export `FindTraineeDialog({ compactLabel?: boolean })` (no server props needed). The trigger is a `Button` with `aria-label="Find trainee"` and `data-find-trainee-trigger`; the label text sits in a span that can be hidden by the parent's container query (Phase 2). Measurements checkbox starts checked; Nutrition, Training, Planning render `disabled`. Request access is `disabled` when `canRequestAccess` is false or a send is in flight. Reopening the dialog starts from an empty email, Measurements checked and no message. The in-dialog message uses an `aria-live="polite"` region styled with role tokens (`text-destructive` for errors). Success toast via `PageErrorToasts` `tone="notice"` rendered next to the Dialog, not inside it. Styling uses role tokens and shared components only.

#### 6. Kitchen-sink preview

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Show the trigger and an opened dialog state for visual review before the top bar uses it.

**Contract**: One new preview section with `<FindTraineeDialog client:load />` and a note on its states (default, Measurements unchecked → button disabled, outcome message).

### Success Criteria:

#### Automated Verification:

- Unit tests for `find-trainee.ts` pass (options order and enabled flags, `canRequestAccess` with none / measurements / only disabled ids, `readRequestAnswer` for each outcome and malformed input): `npm test`
- Lint passes: `npm run lint`
- Type and Astro checks pass: `npx astro check`
- Production build passes: `npm run build`
- Smoke passes unchanged against the preview (redirect branch intact): `npm run smoke`

#### Manual Verification:

- On `/kitchen-sink/trainer` the trigger opens a centered dialog with Find trainee, the subtitle, the search with the new placeholder, Request for with only Measurements enabled, and Request access
- Esc and a click on the overlay close the dialog and focus returns to the trigger
- Unchecking Measurements disables Request access; checking it again enables it
- Signed in as a trainer, sending a real trainee email closes the dialog and shows the sent toast without leaving the page; an unknown email keeps the dialog open with "No trainee with that email"

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Top bar entry point

### Overview

Render the Find trainee trigger at the top left of the top bar for trainers whose Measurements module and Find trainee component are on, collapsing to the magnifier when the label does not fit.

### Changes Required:

#### 1. Role in the top-bar read

**File**: `src/lib/services/profile-details.ts`

**Intent**: The top bar needs the role to decide whether to show Find trainee; read it in the same single profile query.

**Contract**: `TopbarProfile` gains `role: Profile["role"] | null` (via `parseProfileRole`); `readTopbarProfile` selects `role` in the existing `.select(...)`.

#### 2. Model flag

**File**: `src/lib/topbar.ts` (+ `src/lib/topbar.test.ts`)

**Intent**: Decide on the server whether the trigger renders, so trainees and guests never ship it.

**Contract**: `TopbarModelInput` gains optional `findTraineeOn?: boolean` (default false); `TopbarModel` gains `findTrainee: boolean`, true only when signed in and `findTraineeOn`. Guests always get `false`. Tests: guest → false; signed-in default → false; signed-in with `findTraineeOn: true` → true.

#### 3. Top bar wiring

**File**: `src/components/Topbar.astro`

**Intent**: Compute `findTraineeOn` from the read profile: role is trainer, Measurements module on, and `isComponentShown(components, "find-trainee")`; a missing profile row resolves to off.

**Contract**: Passes `findTraineeOn` into `topbarModel` and `findTrainee` into `TopbarActions`; the `preview` path keeps accepting `TopbarModelInput`.

#### 4. Layout of the row

**File**: `src/components/TopbarActions.tsx`

**Intent**: Put the trigger in a left slot that can shrink, keep the existing right cluster (links / hamburger, theme or bell, avatar) unchanged, and hide the label when the left slot is too narrow.

**Contract**: The row becomes `justify-between` with a left `min-w-0` container that is a Tailwind container-query context (`@container`); the trigger's label span is hidden below a container size variant (e.g. `@max-3xs:`/`@3xs:` style built-in variants — no arbitrary values), leaving the magnifier and `aria-label`. When `findTrainee` is false the left slot is empty and the right cluster still sits at the right. Keeps the S-34 first-tap behaviour of the existing menus untouched.

#### 5. Previews and docs

**File**: `src/pages/kitchen-sink/home.astro`, `CLAUDE.md`

**Intent**: Show a trainer top bar with the trigger in the home kitchen sink; record in the CLAUDE.md UI notes that a trainer's top bar shows Find trainee at the top left, opening the find dialog.

**Contract**: One extra `Topbar preview={…findTraineeOn: true}` example; one sentence added to the CLAUDE.md "UI" bullet about the top bar.

### Success Criteria:

#### Automated Verification:

- Topbar model tests for the `findTrainee` flag pass: `npm test`
- Lint passes: `npm run lint`
- Home token check passes: `npm run check:home-tokens`
- Type and Astro checks pass: `npx astro check`
- Production build passes: `npm run build`

#### Manual Verification:

- A trainer sees Find trainee at the top left on `/`, `/measurements`, `/hub`, `/profile` and `/settings`; a trainee and a guest do not
- Switching Find trainee off in Settings → Components (or the Measurements module off) hides the trigger; switching it on shows it again
- At 390 px and 375 px wide the trigger keeps its label beside the hamburger, bell and avatar; at 320 px only the magnifier shows and still opens the dialog
- Hamburger and avatar menus still open on the first tap on iOS Safari

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Remove the tile and move tests

### Overview

Drop the Find trainee tile from `/measurements`, reword the no-trainee card, and move smoke and e2e to the top-bar entry point.

### Changes Required:

#### 1. Trainer panel without the tile

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Remove the Find trainee tile and its form; the `?requested=` notice and the other toasts stay. Replace the "Find trainee is off" card case with a no-trainee card.

**Contract**: Props `findTraineeOpen` and the `findTile` / `findRenders` logic are removed. The empty card renders when tiles render and nothing else can: every component off → existing `ComponentsOffCard`; otherwise a trainer with no trainee → `ComponentsOffCard` titled "No trainees yet" with a message pointing to Find trainee in the top bar when `find-trainee` is shown, or "Request access to a trainee after switching Find trainee on in" + Settings → Components when it is off. `ComponentsOffCard` gains an optional way to render without the Settings link if needed.

#### 2. Open-state cookie

**File**: `src/pages/measurements.astro`, `src/lib/measurement-page.ts` (+ `src/lib/measurement-page.test.ts`)

**Intent**: Stop reading and passing the tile's open state, and remove the now unused storage key helper and its tests.

**Contract**: `findTraineeOpenStorageKey` and `preferredFindTraineeOpen` are removed; nothing else changes on the page.

#### 3. Trainer kitchen sink

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Remove the `findTraineeOpen` usage and update the panel notes that describe the Find trainee tile and "Request read access"; add the no-trainee card example.

**Contract**: Copy only; the dialog preview from Phase 1 stays.

#### 4. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Assert the new entry point instead of the old tile text.

**Contract**: `:826` trainer `/measurements` body contains `data-find-trainee-trigger`; `:1528` trainee journal forbids `data-find-trainee-trigger`. Redirect-branch checks stay; add one check that POST with `Accept: application/json` and an unknown email answers 404 JSON with "No trainee with that email".

#### 5. E2E

**File**: `tests/e2e/hub-collaborations.spec.ts`, new `tests/e2e/find-trainee.spec.ts`

**Intent**: The Hub flow requests access through the top-bar dialog; a dedicated spec covers the dialog contract.

**Contract**: Hub step: click the `Find trainee` trigger, fill the dialog's Email textbox (keep the hydration retry), choose the match, click Request access, expect the sent toast and the dialog closed. New spec (trainer storage state): dialog opens on click with the title and subtitle; Esc closes it; a click outside closes it; Nutrition, Training, Planning are disabled; unchecking Measurements disables Request access; an unknown email keeps the dialog open with "No trainee with that email"; a trainee does not see the trigger.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type and Astro checks pass: `npx astro check`
- Production build passes: `npm run build`
- Smoke passes against the preview with local Supabase: `npm run smoke`
- E2E passes, including `find-trainee.spec.ts` and the updated Hub flow: `npx playwright test`

#### Manual Verification:

- `/measurements` as a trainer shows no Find trainee tile; with no trainees it shows the No trainees yet card pointing to the top bar
- With Find trainee off and no trainees the card points to Settings → Components
- Requesting from `/hub/collaborations` keeps the trainer on that page and the new pending row appears after reload

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `find-trainee.ts`: option order and enabled flags from `dashboards`; `canRequestAccess` with empty, measurements-only, and disabled-only selections; `readRequestAnswer` for every outcome and for malformed JSON.
- `topbar.ts`: `findTrainee` is false for guests and by default, true only with `findTraineeOn`.

### Integration Tests:

- Smoke: trainer page carries the trigger marker, trainee page does not; the JSON branch answers 404 for an unknown email; the existing redirect checks still pass.
- E2E: open/close (Esc, outside click), disabled checkboxes, button disabled when Measurements is unchecked, unknown email message, full request from Hub with the sent toast.

### Manual Testing Steps:

1. Sign in as a trainer, click Find trainee on `/hub`, request a seeded trainee, confirm the toast and that you stay on `/hub`.
2. Request the same trainee again; the dialog stays open with the pending message.
3. Resize to 320 px; only the magnifier shows and still opens the dialog.
4. Sign in as a trainee; no Find trainee in the top bar.

## Performance Considerations

The role comes from the same single profile query the top bar already makes; no extra round trip. The search keeps its existing per-keystroke GET with the request-serial guard.

## Migration Notes

No schema change. The POST redirect branch stays, so a page loaded before the deploy that still shows the tile keeps working.

## References

- Roadmap item: `context/foundation/roadmap.md` S-49 (MS-40), issue #181
- Trainee search (S-29): `src/components/trainer/TraineeEmailSearch.tsx`
- Request API: `src/pages/api/trainer-links/index.ts:57-92`
- Outcome copy: `src/lib/collaborations.ts:51-71`
- Component registry: `src/lib/components.ts:49`, `:224-232`
- Top bar: `src/components/Topbar.astro`, `src/components/TopbarActions.tsx`, `src/lib/topbar.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dialog and JSON request

#### Automated

- [x] 1.1 Unit tests for `find-trainee.ts` pass (options order and enabled flags, `canRequestAccess` with none / measurements / only disabled ids, `readRequestAnswer` for each outcome and malformed input): `npm test` — cd8cc55
- [x] 1.2 Lint passes: `npm run lint` — cd8cc55
- [x] 1.3 Type and Astro checks pass: `npx astro check` — cd8cc55
- [x] 1.4 Production build passes: `npm run build` — cd8cc55
- [x] 1.5 Smoke passes unchanged against the preview (redirect branch intact): `npm run smoke` — cd8cc55

#### Manual

- [x] 1.6 On `/kitchen-sink/trainer` the trigger opens a centered dialog with Find trainee, the subtitle, the search with the new placeholder, Request for with only Measurements enabled, and Request access — cd8cc55
- [x] 1.7 Esc and a click on the overlay close the dialog and focus returns to the trigger — cd8cc55
- [x] 1.8 Unchecking Measurements disables Request access; checking it again enables it — cd8cc55
- [x] 1.9 Signed in as a trainer, sending a real trainee email closes the dialog and shows the sent toast without leaving the page; an unknown email keeps the dialog open with "No trainee with that email" — cd8cc55

### Phase 2: Top bar entry point

#### Automated

- [x] 2.1 Topbar model tests for the `findTrainee` flag pass: `npm test` — e400cbf
- [x] 2.2 Lint passes: `npm run lint` — e400cbf
- [x] 2.3 Home token check passes: `npm run check:home-tokens` — e400cbf
- [x] 2.4 Type and Astro checks pass: `npx astro check` — e400cbf
- [x] 2.5 Production build passes: `npm run build` — e400cbf

#### Manual

- [x] 2.6 A trainer sees Find trainee at the top left on `/`, `/measurements`, `/hub`, `/profile` and `/settings`; a trainee and a guest do not — e400cbf
- [x] 2.7 Switching Find trainee off in Settings → Components (or the Measurements module off) hides the trigger; switching it on shows it again — e400cbf
- [x] 2.8 At 390 px and 375 px wide the trigger keeps its label beside the hamburger, bell and avatar; at 320 px only the magnifier shows and still opens the dialog — e400cbf
- [x] 2.9 Hamburger and avatar menus still open on the first tap on iOS Safari — e400cbf

### Phase 3: Remove the tile and move tests

#### Automated

- [x] 3.1 Unit tests pass: `npm test`
- [x] 3.2 Lint passes: `npm run lint`
- [x] 3.3 Type and Astro checks pass: `npx astro check`
- [x] 3.4 Production build passes: `npm run build`
- [x] 3.5 Smoke passes against the preview with local Supabase: `npm run smoke`
- [x] 3.6 E2E passes, including `find-trainee.spec.ts` and the updated Hub flow: `npx playwright test`

#### Manual

- [x] 3.7 `/measurements` as a trainer shows no Find trainee tile; with no trainees it shows the No trainees yet card pointing to the top bar
- [x] 3.8 With Find trainee off and no trainees the card points to Settings → Components
- [x] 3.9 Requesting from `/hub/collaborations` keeps the trainer on that page and the new pending row appears after reload
