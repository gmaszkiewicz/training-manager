# Component Version System Implementation Plan

## Overview

Add a Settings → Components screen where a signed-in user switches each module (Measurements, Nutrition, Training, Planning) on or off and picks off or a version for each component of a module, saved with one button and a toast. The menu and the `/measurements` tiles follow those choices; a preview version carries a red badge with a warning tooltip on its tile. To make the measurements components independently switchable, the add form and the entries list first become two separate collapsible tiles: **New measurements** and **Measurements**.

## Current State Analysis

- **Settings** (`src/pages/settings.astro:21-23`) renders one tab, `change-password`, passed inline to `AccountTabs`. Profile keeps its tabs as data in `src/lib/profile-tabs.ts` and uses one page per tab (`/profile`, `/profile/avatar`). `AccountTabs` maps tab values to Lucide icons (`src/components/account/AccountTabs.tsx:7-13`).
- **Save pattern**: Details posts a form to `src/pages/api/profile/index.ts`, which validates with zod (`parseProfileNames`) and redirects to `/profile?notice=profile-saved` or `?error=...` via `authPage`; the form shows the notice as a toast through `useFormErrors` (`src/components/profile/ProfileDetailsForm.tsx:48-52`).
- **Modules** already exist as data: `src/lib/dashboards.ts:10-15` lists Measurements (enabled) and Nutrition, Training, Planning (disabled). Hub → Collaborations' Access column uses it.
- **Menu**: `topbarModel` in `src/lib/topbar.ts` returns the signed-in links Home and Measurements. `src/components/Topbar.astro:35-38` already reads the profile row on every signed-in page through `readTopbarProfile` (`src/lib/services/profile-details.ts`), in parallel with the bell. A column on that row gates the menu with no extra Supabase call (S-43 kept round trips low).
- **Tiles**: `src/components/journal/TraineeJournal.astro` puts the add form (`<details data-add-form>` titled "Add your next measurement", with its own inline open-state script) and `MeasurementBrowser` (the list, with Visualize/Clear) inside one card. In edit mode the card shows an "Edit measurement" heading and form instead of the add form. `ChartsTile` (line charts, "progression") and `TopChangesTile` ("top changes") render after it through `src/components/measurements/CollapsibleChartTile.astro`. `TrainerPanel.astro` has no add form: the trainee picker and search, the list, and the same two chart tiles.
- **Landing**: sign-in and sign-up land on `/measurements` (`src/pages/api/auth/signin.ts:21`, `signup.ts:32`). `/hub` redirects to `/hub/collaborations` and is never gated.
- **Middleware** (`src/middleware.ts`) protects `/settings` by prefix and server-verifies it with `getUser()`, so `/settings/components` is covered without changes.
- **Profiles RLS**: `profiles_update_own` already exists (`supabase/migrations/20261026120000_profile_names.sql`), and writes are limited by per-column grants (`grant update (first_name, last_name)`).
- **shadcn/ui** in `src/components/ui/` has no `select`, `switch`, `badge` or `tooltip` (`LibBadge.astro` is something else).
- **E2E** references to the old copy: `tests/e2e/measurement-prefill.spec.ts` and `tests/e2e/measurements-narrow.spec.ts` look up "Add your next measurement". `tests/e2e/top-changes-charts.spec.ts` assumes the Top changes tile is visible, which stops being true once it defaults to off.

## Desired End State

- `/settings` shows two tabs: Change password and Components (`/settings/components`).
- Components lists four module sections in `dashboards` order. Measurements has an on/off switch and a table of the components **for the signed-in user's role** only (component name, then a select with "Off" or a version):
  - Trainee: New measurement, Edit measurement, Your measurements, Progression: Off / v1.0 (default v1.0); Top progression: Off / v0.1 (preview) (default Off)
  - Trainer: Find trainee, Measurements for, Progression: Off / v1.0 (default v1.0); Top progression: Off / v0.1 (preview) (default Off)
- Nutrition, Training and Planning each show a switch that is off and disabled, a "Not available yet" note, and no table.
- When the Measurements switch is off, its rows stay visible but disabled, and their chosen versions are kept on save.
- One Save button under the tables saves everything and shows the "Components saved" toast. A failed save shows an error toast.
- The menu shows Measurements only while the signed-in user's Measurements module is on. With it off, `/measurements` redirects to `/hub`, and that includes the landing after sign-in and sign-up.
- On `/measurements`, each tile renders only when its component is on, by the **signed-in user's own** choices (a trainer's own settings gate the trainer's view). New measurement and Edit measurement apply to trainees only; Find trainee and Measurements for apply to trainers only. If every component of the role is off, one empty-state card says so and links to Settings → Components.
- Trainee tiles: New measurement and Your measurements are separate collapsible tiles. New measurement keeps the S-33 default (open) and its remembered open state. Your measurements keeps five per page and Visualize/Clear. Edit mode shows a non-collapsible "Edit measurement" card above the list tile, even when New measurement is off.
- Trainer tiles: Find trainee (email search + Request read access) and Measurements for (the trainee picker under its title, then the read-only list) are separate collapsible tiles. There is no "Body measurements" heading.
- When Edit measurement is off, the row Actions menu keeps Delete, and Edit stays visible but disabled, with a tooltip saying the Edit measurement component is off. An `?edit=` link falls back to the normal view.
- A tile whose chosen version is a preview shows a red badge, "Preview", next to its title. Its tooltip reads that this is a preview version and may contain bugs.

### Key Discoveries:

- `readTopbarProfile` (`src/lib/services/profile-details.ts`) is the single per-page profile read; adding the column there keeps the menu gate free.
- `/measurements` already resolves the profile through `ensureProfile` (`src/pages/measurements.astro:215`). The page needs the settings before it starts its reads, so that it can redirect and skip reads for off components.
- The add form's inline open-state script (`TraineeJournal.astro:514-558`) duplicates the one in `CollapsibleChartTile.astro:678-712`, except for the server-error `data-restore` rule. The New measurements tile must keep that rule: the form starts open after a server error and does not overwrite the stored choice.
- `dashboards.ts` `enabled` means "built". The registry must not confuse it with the user's per-module switch: a module that isn't built is locked off whatever is stored.

## What We're NOT Doing

- No per-trainee settings for a trainer's preview: a trainer never reads a trainee's settings, and no cross-user RLS is added.
- No refusal by the measurement APIs (`/api/measurements/*`) when a component or the module is off. Gating is the menu, the page redirect and the tiles only.
- No Nutrition, Training or Planning components or pages. Their sections stay locked.
- No second version of any component. The registry supports several versions, but each component ships with one.
- No change to Hub → Collaborations' Access column. It keeps using `dashboards`, not the user's module switch.
- No reset of component choices when a module is switched off.
- No blocking of an all-off save. The empty-state card handles it.
- No separate `component_settings` table (decided: jsonb on profiles).

## Implementation Approach

Phase 1 is a pure UI refactor that lands the two-tile structure with unchanged behavior, so gating later only wraps tiles that already exist. Phase 2 adds the registry, the single source of truth for modules, components, versions, preview flags and defaults. Its lenient parser means a null, stale or malformed stored value never breaks a page and falls back to the defaults per key. Phase 3 builds the screen on the Details save pattern. Phase 4 wires the gates into the top bar and `/measurements`, adds the preview badge to the shared tile, and updates the e2e suite.

The stored shape is sparse and versioned by key:

```ts
// profiles.component_settings (null = all defaults)
{ modules: { measurements: true }, components: { "new-measurement": "1.0", "measurements": "1.0", "progression": "1.0", "top-changes": "off" } }
```

Reading resolves every registry key: an unknown module or component key is ignored, and an unknown version falls back to that component's default. Writing stores the full resolved object for the built modules only.

## Critical Implementation Details

**State sequencing on `/measurements`.** Settings must be known before the page starts its parallel reads. Read `component_settings` together with the role in the existing profile step (extend `ensureProfile`'s select, or a sibling read run in parallel with it), then redirect or skip reads: no chart range reads when both Progression and Top changes are off, no previous-entry read when New measurements is off. Skipping must not reintroduce sequential round trips for the default case.

**Migration ordering.** The column is nullable with no default backfill, and the previous Worker never selects it, so the migration reaches hosted Supabase safely before the new Worker.

## Phase 1: Split the journal tiles

### Overview

Turn the shared add-form + list card into two collapsible tiles, New measurements and Measurements, with an "Edit measurement" card in edit mode. Behavior is otherwise unchanged and every tile still always renders.

### Changes Required:

#### 1. Collapsible tile supports the add form's restore rule

**File**: `src/components/measurements/CollapsibleChartTile.astro` (consider renaming it to `CollapsibleTile.astro` and updating its imports)

**Intent**: Let the shared tile host the add form and the list, so all four measurements tiles share one collapsible element and one open-state script.

**Contract**: Add an optional `restore` prop (default `true`). When it is `false`, the script must not restore the stored state and must skip the first load toggle, matching today's add-form `data-restore` behavior. `note` stays optional. Keep the `data-charts-tile` / `data-chart-tile` attributes that the chart islands use, or keep them chart-only and pass a neutral `tileId`.

#### 2. Trainee journal renders separate tiles

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: Replace the single card with a New measurements tile (the add form, storage key `addFormStorageKey`, starts open per `addFormStartsOpen`, `restore` false after a server error) and a Measurements tile (the `MeasurementBrowser`) that has its own open-state key. In edit mode, render a non-collapsible "Edit measurement" card in place of the New measurements tile. Notice toasts and the load-failure state stay. The load failure renders under a "New measurements" heading.

**Contract**: Tile order is New measurements (or Edit measurement), Measurements, Progression charts, Top changes. A new `listOpenStorageKey(accountUserId)` plus parser in `src/lib/measurement-page.ts`, following `chartsOpenStorageKey` / `parseChartsOpen`, defaults to open.

#### 3. Trainer panel tiles

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Split the trainer's card into two collapsible tiles: **Find trainee** (the email search and Request read access) and **Measurements for** (the trainee picker directly under the title, then the read-only list). Drop the "Body measurements" heading. Toasts stay; the unavailable state keeps its "Measurements" card.

**Contract**: Measurements for uses the same `listOpenStorageKey(trainerAccountId)`. Find trainee gets `findTraineeOpenStorageKey(accountUserId)` plus `parseFindTraineeOpen`, defaults to open, and after a server error starts open with `restore` false. Measurements for renders the picker even when the list failed to load. `src/pages/measurements.astro` passes `listOpen` for both roles and `findTraineeOpen` for the trainer.

#### 4. Copy references

**Files**: `tests/e2e/measurement-prefill.spec.ts`, `tests/e2e/measurements-narrow.spec.ts`, `src/pages/kitchen-sink/journal.astro` (and `src/components/kitchen-sink/JournalSinkStates.tsx` if it carries the heading)

**Intent**: Point the e2e locators at "New measurements" and show the split tiles in the journal kitchen sink.

**Contract**: No assertions are removed. Only the copy and locators change.

### Success Criteria:

#### Automated Verification:

- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Unit tests pass: `npm test` (including the new `listOpenStorageKey` parser test in `src/lib/measurement-page.test.ts`)
- E2E passes: `npx playwright test`
- Build succeeds: `npm run build`

#### Manual Verification:

- As a trainee on `/measurements`: New measurements and Measurements are two separate collapsible tiles, New measurements starts open, and the list shows five per page.
- Collapsing each tile and reloading keeps each tile's own state.
- After a failed save, New measurements is open with the error, and the stored choice is untouched on the next visit.
- Edit opens an "Edit measurement" card above the list, and Cancel returns to New measurements.
- Visualize/Clear under the list still drive the Charts tile.
- As a trainer, the list sits in a Measurements tile under the picker.
- Phone width: both tiles fit without horizontal scroll.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Component registry and storage

### Overview

Introduce the registry and the per-user stored choices, and expose them through the top-bar profile read. Nothing user-visible yet.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261101120000_profile_component_settings.sql`

**Intent**: Store a user's module and component choices on their own profile row, writable only by them.

**Contract**: `alter table public.profiles add column component_settings jsonb null;` plus a `check (component_settings is null or jsonb_typeof(component_settings) = 'object')` constraint and `grant update (component_settings) on public.profiles to authenticated;`. The existing `profiles_update_own` and `profiles_select_own` policies cover it, so no new policy is needed. Regenerate `src/db/database.types.ts` with `npm run db:types`.

#### 2. Registry

**File**: `src/lib/components.ts` (new) and `src/lib/components.test.ts`

**Intent**: Define the single source of truth that the screen, the API, the top bar and the page use.

**Contract**:
- `componentModules`: the modules in `dashboards` order. Each has `id: Dashboard`, `label`, `built` (taken from `dashboards[].enabled`), `defaultOn`, and `components`.
- Each component has `id` (`"new-measurement" | "edit-measurement" | "measurements" | "find-trainee" | "trainee-measurements" | "progression" | "top-changes"`), `label` ("New measurement", "Edit measurement", "Your measurements", "Find trainee", "Measurements for", "Progression", "Top progression"), `roles: Role[]` (trainee only: new-measurement, edit-measurement, measurements; trainer only: find-trainee, trainee-measurements; both: progression, top-changes), `versions: { id: string; label: string; preview: boolean }[]` and `defaultVersion: string | "off"`.
- The defaults are: Measurements module on; every component at `"1.0"` except top-changes, which is `"off"`, its only version being `{ id: "0.1", preview: true }`.
- `componentsForRole(moduleId, role)` returns the module's components that apply to the role, in registry order.
- `resolveComponentSettings(raw: unknown): ComponentSettings` parses leniently and returns a value for every key. An unbuilt module always resolves to off.
- `componentSettingsSchema` (zod) validates a submitted form: known keys only, versions in the registry, and module values `on`/`off` only for built modules.
- `isComponentShown(settings, componentId)`: the module is on and the version is not `"off"`. `shownVersion(settings, componentId)` returns `{ label, preview } | null`. `isModuleOn(settings, moduleId)`.

Types `ComponentSettings`, `ComponentId` and `ModuleId` go in `src/types.ts`.

#### 3. Service reads and writes

**File**: `src/lib/services/profile-details.ts` (or a new `src/lib/services/component-settings.ts`)

**Intent**: Add `component_settings` to `readTopbarProfile`'s select and return the resolved settings. Add `readComponentSettings` for the Settings page and `updateComponentSettings(supabase, userId, settings)` that follows `updateProfileNames`: the update must touch exactly one row, otherwise it reports a failure.

**Contract**: `TopbarProfile` gains `components: ComponentSettings`. A failed or missing profile row resolves to the defaults.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly on local Supabase: `npx supabase db reset`
- Migration check passes: `npm run migration-check`
- Types regenerate with no diff beyond the new column: `npm run db:types`
- Unit tests pass: `npm test` (`components.test.ts` covers null → defaults, unknown keys ignored, an unknown version falling back to the default, an unbuilt module forced off, `isComponentShown` when the module is off, `componentsForRole` for each role, and schema rejection of an unknown version or a switch on an unbuilt module)
- Lint and type check pass: `npm run lint`, `npx astro check`

#### Manual Verification:

- In Supabase Studio, an authenticated user can update only their own `component_settings`, and a string value is refused by the check constraint.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Settings → Components screen

### Overview

Add the Components tab, its form, and the save endpoint, following the Details save pattern.

### Changes Required:

#### 1. Settings tabs

**Files**: `src/lib/settings-tabs.ts` (new), `src/pages/settings.astro`, `src/components/account/AccountTabs.tsx`

**Intent**: Move Settings' tabs into data like `PROFILE_TABS` and add Components.

**Contract**: `SETTINGS_TABS = [{ value: "change-password", label: "Change password", href: "/settings" }, { value: "components", label: "Components", href: "/settings/components" }]`. Add a Lucide icon for `components` (e.g. `Blocks`) in `tabIcons`.

#### 2. shadcn components

**Intent**: Add the missing primitives the form needs.

**Contract**: `npx shadcn@latest add select switch` (new-york style).

#### 3. Components page

**File**: `src/pages/settings/components.astro` (new)

**Intent**: Server-render the tab with the user's resolved settings, a notice from `?notice=components-saved`, and errors from `?error=`. Use the same layout and card as `settings.astro`, with `contentClassName` widened to fit the table.

**Contract**: Reads with `readComponentSettings`, and reads the user's role so the form lists only `componentsForRole(module, role)`. If the read fails, mark the page unavailable and disable Save (same rule as Details: blank defaults must not be saved over the stored choices). Saving keeps the stored values of the other role's components (the form never sends them; the endpoint merges the submitted fields over the stored settings).

#### 4. Components form

**File**: `src/components/settings/ComponentsForm.tsx` (new)

**Intent**: One section per module: a heading with a `Switch` (disabled with a "Not available yet" note when the module is not built), then for built modules a `Table` of component name and a `Select` with "Off" plus each version. A preview version's label carries "(preview)". When the module switch is off, the selects are disabled but keep their values. One Save button (`SubmitButton`) sits under the tables, with toasts through `useFormErrors` as in `ProfileDetailsForm`.

**Contract**: Posts `application/x-www-form-urlencoded` to `/api/settings/components` through `submitAuthForm`. Field names are `module.<moduleId>` (`on`/`off`) and `component.<componentId>` (`off` or a version id). Disabled selects are sent as hidden inputs so their values are kept. Copy lives in `src/lib/component-settings-form.ts` (`COMPONENTS_SAVED_NOTICE = "Components saved"`, `COMPONENTS_UNAVAILABLE_ERROR`, the page error mapping), following `profile-form.ts`.

#### 5. Save endpoint

**File**: `src/pages/api/settings/components.ts` (new)

**Intent**: Validate the submitted choices with `componentSettingsSchema` and save them.

**Contract**: `export const prerender = false`. `POST` only. A signed-out user is sent to `/auth/signin`. Invalid input goes to `/settings/components?error=components-invalid`, a failed write to `?error=components-unavailable`, and success to `?notice=components-saved`, all via `authPage`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test` (`component-settings-form.test.ts` covers parsing form fields to settings, hidden-field values kept for a disabled module, and the error and notice mapping)
- Lint and type check pass: `npm run lint`, `npx astro check`
- Smoke passes: `npm run smoke` (with a new case: anonymous `POST /api/settings/components` → redirect to sign-in)
- Build succeeds: `npm run build`

#### Manual Verification:

- Settings shows Change password and Components tabs, each with an icon. Components shows Measurements with a switch and the 4-row table at the defaults, and Nutrition, Training and Planning locked off with "Not available yet".
- Change Top changes to v0.1 (preview) and Save: the "Components saved" toast appears and the choice persists on reload.
- Switch Measurements off: the rows are disabled with their values kept. Save, reload, switch it back on: the earlier versions are back.
- Dark theme and phone width render correctly.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Gating, preview badge and e2e

### Overview

Make the menu and `/measurements` follow the signed-in user's choices, mark preview tiles, and lock the behavior with e2e tests.

### Changes Required:

#### 1. Menu gate

**Files**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`, `src/components/Topbar.astro`, `src/pages/kitchen-sink/home.astro`

**Intent**: Drop the Measurements link when the Measurements module is off.

**Contract**: `TopbarModelInput` gains `measurementsOn: boolean` (default `true` for previews). `Topbar.astro` passes `isModuleOn(profile.components, "measurements")`.

#### 2. Page gate

**File**: `src/pages/measurements.astro`

**Intent**: Resolve the signed-in user's settings with the profile step. Redirect to `/hub` when the module is off. Skip the reads of off components. Pass a per-tile `shown` map to `TraineeJournal` and `TrainerPanel`.

**Contract**: The redirect is `Astro.redirect("/hub", 302)`, which covers the sign-in and sign-up landing without either endpoint reading settings. For the trainee: New measurement ← `new-measurement`, the Edit measurement card and the row Edit action ← `edit-measurement`, Your measurements ← `measurements`, ChartsTile ← `progression`, TopChangesTile ← `top-changes`. For the trainer: Find trainee ← `find-trainee`, Measurements for (picker + list) ← `trainee-measurements`, and both chart tiles follow the trainer's own settings. With Measurements for off, the chart tiles still chart the selected trainee (the remembered or first linked one).

#### 2a. Edit measurement off

**Files**: the row Actions menu in `MeasurementBrowser` (and its row component), `src/pages/measurements.astro`

**Intent**: With `edit-measurement` off, Edit stays in the row Actions menu but is disabled, and hover or focus shows a tooltip: "The Edit measurement component is off." Delete is unchanged. `?edit=` is ignored and the page renders the normal view.

**Contract**: An `editEnabled` prop (default `true`) through the browser to the row menu. Uses the shadcn `Tooltip` added for the preview badge.

#### 3. Empty state

**Files**: `src/components/journal/TraineeJournal.astro`, `src/components/trainer/TrainerPanel.astro`

**Intent**: When none of the role's applicable components is shown, render one card: "Every Measurements component is off", with a link to Settings → Components (`/settings/components`). The trainer's picker stays above it.

**Contract**: Use the role tokens and the `Button` (link variant) from `src/components/ui`.

#### 4. Preview badge

**Files**: `src/components/measurements/CollapsibleChartTile.astro` (or its renamed version), the four tile call sites

**Intent**: A tile whose shown version is a preview shows a red "Preview" badge next to its title. Hover or focus shows a tooltip: "Preview version — it may contain bugs."

**Contract**: An optional `preview?: boolean` prop. `npx shadcn@latest add badge tooltip`. A `src/components/measurements/PreviewBadge.tsx` island uses `Badge variant="destructive"` with `Tooltip`. The badge is keyboard-focusable and must not toggle the `<details>`: stop the click inside `summary`.

#### 5. E2E

**Files**: `tests/e2e/top-changes-charts.spec.ts`, `tests/e2e/component-settings.spec.ts` (new), `tests/e2e/measurement-charts.spec.ts` if it is affected

**Intent**: The Top changes spec first sets Top changes to v0.1 on Settings → Components, or through a shared helper, and resets it afterwards so other specs keep the defaults. The new spec covers:
- the defaults on the screen;
- the Top changes tile hidden by default, shown after choosing the preview, with the badge and its tooltip;
- Progression off hiding the Charts tile;
- all off showing the empty-state card;
- the Measurements module off removing the menu link and redirecting `/measurements` to `/hub/collaborations`;
- turning it back on restoring everything.

**Contract**: The specs share the one throwaway trainee, so each test restores the defaults in `afterEach`, and the specs that touch settings run serially (`test.describe.configure({ mode: "serial" })`).

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test` (the topbar test covers the Measurements link hidden when `measurementsOn` is false)
- Lint, token check and type check pass: `npm run lint`, `npm run check:home-tokens`, `npx astro check`
- E2E passes: `npx playwright test` (the new `component-settings.spec.ts` and the updated `top-changes-charts.spec.ts`)
- Smoke passes: `npm run smoke`
- Build succeeds: `npm run build`

#### Manual Verification:

- A fresh user sees New measurements, Measurements and the Charts tile, and no Top changes tile.
- After choosing Top changes v0.1, its tile shows the red Preview badge. The tooltip appears on hover and on keyboard focus, and clicking the badge does not collapse the tile.
- With Measurements switched off: the menu has no Measurements link on desktop or in the phone hamburger, `/measurements` lands on Hub, and sign-in lands on Hub. Switching it back on restores everything.
- All components off shows the empty-state card, and its link opens Settings → Components.
- A trainer with Progression off sees no Charts tile while previewing a trainee, and the trainee's own view is unaffected.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `components.test.ts`: lenient resolution (null, partial, unknown keys, unknown version, unbuilt module), the schema, `isComponentShown` and `shownVersion`.
- `component-settings-form.test.ts`: form fields → settings, disabled-module values kept, error and notice copy.
- `topbar.test.ts`: the menu link follows `measurementsOn`.
- `measurement-page.test.ts`: the list open-state key and parser.

### Integration Tests:

- Smoke: an anonymous save is refused.
- E2E: `component-settings.spec.ts` covers the defaults, the preview badge, hiding tiles, the empty state, and module off (menu plus redirect). The existing specs are updated for the tile split and the Top changes default.

### Manual Testing Steps:

1. As a new trainee, check the default tiles and the Components screen defaults.
2. Pick the Top changes preview and check the badge and tooltip on desktop and phone.
3. Switch the Measurements module off, sign out and sign in, and land on Hub.
4. As a trainer, change your own settings and confirm the trainee's view is unchanged.

## Performance Considerations

The top bar keeps a single profile read with one more column. `/measurements` resolves the settings in its existing profile step, not as a new sequential call, and skips the reads of off components. The default configuration must make the same number of Supabase calls as today.

## Migration Notes

The nullable column with no backfill means `null` resolves to the defaults, so existing users get Top changes off until they choose it. The previous Worker never selects the column, so the migration is backward compatible when it reaches hosted Supabase first.

## References

- Change notes: `context/changes/component-version-system/change.md`
- Roadmap item: `context/foundation/roadmap.md` (S-47, MS-38)
- Save pattern: `src/pages/api/profile/index.ts`, `src/components/profile/ProfileDetailsForm.tsx:48-52`
- Modules: `src/lib/dashboards.ts:10-15`
- Top bar read: `src/components/Topbar.astro:35-38`, `src/lib/services/profile-details.ts`
- Tiles: `src/components/journal/TraineeJournal.astro`, `src/components/measurements/CollapsibleChartTile.astro`
- Column grant pattern: `supabase/migrations/20261026120000_profile_names.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Split the journal tiles

#### Automated

- [x] 1.1 Lint passes: `npm run lint` — b6c3af3
- [x] 1.2 Type check passes: `npx astro check` — b6c3af3
- [x] 1.3 Unit tests pass: `npm test` (including the new `listOpenStorageKey` parser test) — b6c3af3
- [x] 1.4 E2E passes: `npx playwright test` — b6c3af3
- [x] 1.5 Build succeeds: `npm run build` — b6c3af3

#### Manual

- [x] 1.6 Trainee sees separate New measurements and Measurements tiles; New measurements starts open; list shows five per page — b6c3af3
- [x] 1.7 Each tile's collapsed state survives a reload independently — b6c3af3
- [x] 1.8 After a failed save New measurements is open with the error and the stored choice is untouched — b6c3af3
- [x] 1.9 Edit opens an Edit measurement card above the list; Cancel returns to New measurements — b6c3af3
- [x] 1.10 Visualize/Clear under the list still drive the Charts tile — b6c3af3
- [x] 1.11 Trainer sees Find trainee (search + request) and Measurements for (picker under the title, then the list) as separate collapsible tiles, with no Body measurements heading — b6c3af3
- [x] 1.12 Phone width: both tiles fit without horizontal scroll — b6c3af3

### Phase 2: Component registry and storage

#### Automated

- [x] 2.1 Migration applies cleanly on local Supabase: `npx supabase db reset` — 5741991
- [x] 2.2 Migration check passes: `npm run migration-check` — 5741991
- [x] 2.3 Types regenerate with no diff beyond the new column: `npm run db:types` — 5741991
- [x] 2.4 Unit tests pass: `npm test` (`components.test.ts`) — 5741991
- [x] 2.5 Lint and type check pass: `npm run lint`, `npx astro check` — 5741991

#### Manual

- [x] 2.6 An authenticated user can update only their own `component_settings`; a non-object value is refused — 5741991

### Phase 3: Settings → Components screen

#### Automated

- [x] 3.1 Unit tests pass: `npm test` (`component-settings-form.test.ts`) — a25e7b7
- [x] 3.2 Lint and type check pass: `npm run lint`, `npx astro check` — a25e7b7
- [x] 3.3 Smoke passes: `npm run smoke` (anonymous save redirects to sign-in) — a25e7b7
- [x] 3.4 Build succeeds: `npm run build` — a25e7b7

#### Manual

- [x] 3.5 Settings shows Change password and Components tabs; Components shows defaults and locked Nutrition, Training, Planning — a25e7b7
- [x] 3.6 Choosing Top changes v0.1 and Save shows the toast and persists on reload — a25e7b7
- [x] 3.7 Measurements switch off disables rows with values kept; switching back on restores the earlier versions — a25e7b7
- [x] 3.8 Dark theme and phone width render correctly — a25e7b7

### Phase 4: Gating, preview badge and e2e

#### Automated

- [x] 4.1 Unit tests pass: `npm test` (topbar `measurementsOn`) — fe953ca
- [x] 4.2 Lint, token check and type check pass: `npm run lint`, `npm run check:home-tokens`, `npx astro check` — fe953ca
- [x] 4.3 E2E passes: `npx playwright test` (new `component-settings.spec.ts`, updated `top-changes-charts.spec.ts`) — fe953ca
- [x] 4.4 Smoke passes: `npm run smoke` — fe953ca
- [x] 4.5 Build succeeds: `npm run build` — fe953ca

#### Manual

- [x] 4.6 A fresh user sees New measurements, Measurements and Charts, and no Top changes tile — fe953ca
- [x] 4.7 With Top changes v0.1 the tile shows the red Preview badge; the tooltip works on hover and focus; the badge click does not collapse the tile — fe953ca
- [x] 4.8 With Measurements off: no menu link (desktop and hamburger); `/measurements` and sign-in land on Hub; back on restores everything — fe953ca
- [x] 4.9 All components off shows the empty-state card linking to Settings → Components — fe953ca
- [x] 4.10 A trainer's own Progression off hides their Charts tile without affecting the trainee — fe953ca
- [x] 4.11 With Edit measurement off, row Edit is disabled with the "component is off" tooltip and Delete still works — fe953ca
- [x] 4.12 Settings → Components lists only the role's rows (trainee: New/Edit measurement, Your measurements; trainer: Find trainee, Measurements for) — fe953ca
