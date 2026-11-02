# Component Version System — Plan Brief

> Full plan: `context/changes/component-version-system/plan.md`

## What & Why

A signed-in user gets a Settings → Components screen to switch modules on or off and to pick off or a version for each component. That lets preview components (Top changes v0.1 first) ship hidden until someone chooses them, and lets unbuilt modules stay out of the menu. For the measurements components to be switchable one by one, the add form and the entries list split into two tiles.

## Starting Point

Settings has one tab (Change password). Modules exist as static data in `src/lib/dashboards.ts`. The add form and the list share one card in `TraineeJournal.astro`, and the chart tiles use `CollapsibleChartTile.astro`. The top bar reads the profile row on every page, and sign-in lands on `/measurements`.

## Desired End State

Settings → Components shows Measurements with a switch and a table: New measurements v1.0, Measurements v1.0, Progression v1.0, Top changes Off / v0.1 (preview). Nutrition, Training and Planning are locked off as "Not available yet". One Save button and a toast save the screen. The menu and `/measurements` tiles follow the signed-in user's own choices. A preview tile shows a red badge with a tooltip warning that it may contain bugs. New measurements and Measurements are separate collapsible tiles.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Storage | Nullable `profiles.component_settings` jsonb, lenient read, zod on write | It rides the existing top-bar profile read, so gating adds no Supabase round trip. |
| Trainer's view | The trainer's own settings gate the tiles | One rule everywhere and no cross-user read or RLS. |
| Module off | Hidden from the menu, and `/measurements` redirects to `/hub` (sign-in too) | No dead page or redirect loop; Hub is never gated. |
| Unbuilt modules | Switch locked off with "Not available yet", no table | Nobody can turn on a module that would add a link to nothing. |
| Edit after the split | Own non-collapsible "Edit measurement" card, even when New measurements is off | Editing comes from the list, so an unrelated choice never breaks it. |
| All components off | Empty-state card linking to Settings → Components | It explains the blank page and points to the fix. |
| Rows of an off module | Disabled, values kept | Switching the module back on restores the earlier choices. |

## Scope

**In scope:**
- The tile split
- The registry and the jsonb column
- The Components tab, form and API
- The menu gate, page redirect and tile gates (trainee and trainer)
- The empty state and the preview badge
- E2E and unit tests

**Out of scope:**
- API refusal for off components
- A trainer following a trainee's settings
- Nutrition, Training and Planning content
- Second versions of components
- Changes to the Collaborations Access column
- Blocking an all-off save

## Architecture / Approach

`src/lib/components.ts` is the single registry (modules, components, versions, preview flags, defaults). `resolveComponentSettings` turns any stored value into a full settings object. `readTopbarProfile` returns it for the menu, and the `/measurements` profile step uses it to redirect, skip off reads, and pass a per-tile `shown` map. The screen posts form fields to `POST /api/settings/components`, which validates with zod and redirects with `?notice=` / `?error=` like Details.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Split the journal tiles | New measurements + Measurements tiles, Edit card | Losing the S-33 open default or the server-error restore rule |
| 2. Registry & storage | jsonb column, registry, top-bar read, unit tests | A malformed stored value breaking pages (mitigated by the lenient parser) |
| 3. Components screen | Tab, form, API, toast | Disabled rows dropping their values on submit |
| 4. Gating, badge & e2e | Menu, redirect, tile gates, empty state, badge, e2e | Top changes e2e breaking on the new default; settings leaking between specs on the shared trainee |

**Prerequisites:** S-35, S-41 and S-46 are done. Local Supabase runs in Docker.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- Existing users lose the Top changes tile until they choose it. This is intended per the change notes.
- E2E specs share one throwaway trainee, so the specs that change settings must restore the defaults and run serially.
- "Progression" is assumed to be the line-charts tile, and "measurements" the entries list.

## Success Criteria (Summary)

- A user hides or shows each measurements tile and the whole module from Settings → Components, and the choice persists.
- A preview component stays hidden by default and carries a visible warning once chosen.
- With Measurements off, no menu link and no dead landing; default users make no extra Supabase calls.
