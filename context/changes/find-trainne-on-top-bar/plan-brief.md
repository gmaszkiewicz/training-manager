# Find trainee in the top bar — Plan Brief

> Full plan: `context/changes/find-trainne-on-top-bar/plan.md`

## What & Why

A trainer finds a trainee and requests access from a collapsible tile that only exists on `/measurements`. This change moves Find trainee into the shared top bar as a search field at the top left. The field opens a centered dialog, like the one on ui.shadcn.com, so a trainer can request access from any page without being sent to `/measurements` (roadmap S-49, MS-40, issue #181).

## Starting Point

Today the `find-trainee` tile in `TrainerPanel.astro` wraps `TraineeEmailSearch`, which already applies the S-29 rules (10 matches, no trainees who are already linked), in a form that POSTs to `/api/trainer-links`. That endpoint answers only with redirects to `/measurements`. The top bar is right-aligned, has no role information, and `src/components/ui/` has no Dialog.

## Desired End State

A signed-in trainer (Measurements module on, Find trainee component on) sees a magnifier and "Find trainee" at the top left of the top bar. On a narrow phone only the magnifier shows. Clicking it opens a dialog with the following content:
- the title Find trainee and the subtitle "Request access to a trainee's dashboards"
- the email search with the placeholder "Find trainee by email, first name or last name"
- the Request for checkboxes: Measurements checked, Nutrition, Training and Planning disabled
- a Request access button

Esc or a click outside the dialog closes it. A request that is sent closes the dialog and shows a toast on the same page. Any other outcome keeps the dialog open and shows its message. `/measurements` no longer has the tile.

## Key Decisions Made

| Decision            | Choice                                                     | Why (1 sentence)                                                                  |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Who sees the field  | Trainers only                                              | The search API and the `find-trainee` component are already trainer-only.        |
| Old tile & setting  | Remove the tile; the `find-trainee` setting now gates the top-bar field | One entry point, and the existing on/off choice stays meaningful with no data change. |
| After Request access | Send in place; on sent close the dialog and toast; otherwise stay open with the message | Works from any page, and errors can be fixed without retyping the email. |
| Measurements checkbox | Starts checked; unchecking it disables Request access    | One-click requests still work, and a request without a dashboard can't be sent.  |
| Keyboard shortcut   | None                                                       | Smallest scope, and no override of the browser's Ctrl K.                         |
| API shape           | Add a JSON branch on `Accept: application/json`; keep the redirect | Smoke checks the redirect contract, and pages opened before the deploy keep working. |
| Narrow screens      | A Tailwind container query hides the label; only the magnifier shows | No JS measuring and no arbitrary values.                                  |

## Scope

**In scope:**
- shadcn Dialog
- `FindTraineeDialog` island
- JSON request answer
- role in the top-bar profile read
- top-left trigger
- tile removal and the No trainees yet card
- kitchen-sink previews
- smoke and e2e moved to the new entry point, plus a new dialog spec
- CLAUDE.md UI note

**Out of scope:**
- search by first or last name (follow-up task)
- requests for Nutrition, Training and Planning
- a keyboard shortcut
- DB, RPC and migration changes
- an entry point for trainees or guests
- changes to the redirect branch

## Architecture / Approach

`Topbar.astro` already reads the profile row. It will also read `role`, then set `findTraineeOn` (trainer + Measurements module on + `isComponentShown("find-trainee")`) and pass it to `topbarModel`. That produces `findTrainee`, and `TopbarActions` uses it to render `FindTraineeDialog` in a left `@container` slot. The dialog reuses `TraineeEmailSearch` inside a real `<form>`, so the empty-email guard still works. It POSTs with `Accept: application/json` and maps the answer through the pure helpers in `src/lib/find-trainee.ts`. The success toast is rendered outside the dialog content, so it survives the dialog closing.

## Phases at a Glance

| Phase                          | What it delivers                                                        | Key risk                                                                  |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. Dialog and JSON request     | Dialog island, JSON outcome answer, helpers with unit tests, kitchen-sink preview | The empty-email guard depends on the form submit event; the match list could be clipped in the dialog |
| 2. Top bar entry point         | Role read, `findTrainee` flag, top-left trigger with label collapse      | Fitting the bar on a phone next to the hamburger, bell and avatar; the iOS first-tap fix |
| 3. Remove the tile and move tests | No tile on `/measurements`, No trainees yet card, smoke + e2e on the top bar | E2E hydration flakiness when typing into the dialog search |

**Prerequisites:** S-29, S-40 and S-48 are done; local Supabase is available for smoke and e2e.
**Estimated effort:** about 2–3 sessions across 3 phases.

## Open Risks & Assumptions

- The placeholder mentions first and last name before that search exists. This is the user's explicit copy.
- The label collapse point depends on the container-query variant chosen. The manual check covers 390, 375 and 320 px.
- Removing the tile leaves the `?requested=` notice on `/measurements` reachable only through the redirect branch. It is kept on purpose.

## Success Criteria (Summary)

- A trainer requests read access to a trainee's measurements from the top bar on any page and stays on that page with a toast.
- Trainees and guests see the top bar unchanged; switching Find trainee off in Settings hides the field.
- Lint, astro check, unit tests, build, smoke and e2e all pass with the tile gone.
