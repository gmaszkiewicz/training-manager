# Measurement copy and the measurements route — Implementation Plan

## Overview

Move the measurements screen from `/dashboard` to `/measurements`, drop the role word from the greeting, and polish the trainer finder and the field row so each unit sits beside its name and the difference versus the previous entry sits under the value.

## Current State Analysis

On `HEAD`, the protected screen is `src/pages/dashboard.astro` with document title `Dashboard`. `PROTECTED_ROUTES` is `["/dashboard"]` (`src/middleware.ts`). Sign-in, sign-up, measurement POST, and trainer-link POST redirect to `/dashboard`. The signed-in nav label is already `Measurements`, and its href is `/dashboard` (`src/lib/topbar.ts`). Guest greeting is `Hello guest`. A trainee reads `Hello trainee` and a trainer reads `Hello trainer`, each with the email beside that phrase.

The trainee card heading is `Body measurements` (`src/components/journal/TraineeJournal.astro`). The trainer card heading is `Body measurements`, the unavailable heading is `Dashboard`, the email control has a visible `Email` label, and `Link trainee` is not full width (`src/components/trainer/TrainerPanel.astro`). Linked-trainee hrefs use `/dashboard?trainee=`.

The form label is already `` `${field.label} ${field.unit}` `` (`src/components/measurements/MeasurementForm.tsx`). The list label is the name only, and the value text appends the unit (`src/components/measurements/MeasurementList.astro`). The delta is a sibling beside the value, without `font-semibold`. The date column uses the same `w-28` as each measurement column, and the date input has no reserved space for the calendar icon. The loaded journal and trainer cards use `min-w-[calc(73rem+4px)]`, commented as nine `w-28` columns plus gaps and padding.

`scripts/smoke.mjs` calls `/dashboard`. `scripts/check-home-tokens.mjs` lists `src/pages/dashboard.astro`. `CLAUDE.md` cites `src/pages/dashboard.astro`.

The uncommitted working tree already follows the end state below. Implementation confirms that tree against these contracts and edits only where a contract is missed.

## Desired End State

A guest reads `Hello, guest`. A signed-in trainee or trainer reads `Hello,` and their email, with no role word. A signed-in user whose role is null still reads the email only.

The screen, its nav href, and the redirects that open it use `/measurements`. The nav label stays `Measurements`. The document title is `Measurements`. The unavailable trainer heading is `Measurements`. `/dashboard` has no page and no redirect, so that address is a 404.

The trainer heading is `Find trainee by email`. The email field has no visible label and keeps the accessible name `Email`. `Link trainee` is `w-full` of that form, the same width treatment as `Add measurement`. When at least one trainee is linked, `Body measurements` is the heading above those emails.

The trainee heading is `Add your next measurement`. Each field label reads the name and its existing unit separated by a space (`Weight kg`, `Chest cm`, and the rest of `measurementFields`). The visible value has no unit. The delta text is unchanged (`↑`, `↓`, or `0.0` from `formatDelta`) and sits under the value with `font-semibold`. The date column is `w-36` on the form and the list. The day digits stay fully visible beside the calendar icon. The loaded card floor grows by the same 2rem the date column gained, to `min-w-[calc(75rem+4px)]`.

### Key Discoveries:

- Greeting text is produced by `topbarModel` in `src/lib/topbar.ts` and rendered with a space between greeting and email in `src/components/TopbarActions.tsx`. Changing the model changes the phrase.
- Form labels on `HEAD` already include the unit. The list value at `src/components/measurements/MeasurementList.astro` is the place that still prints the unit on the number.
- Delta math lives in `src/lib/measurement-deltas.ts`. This slice only moves and weights the existing `formatDelta` text. An entry with `deltas: null` still shows no comparison.
- `w-28` is 7rem and `w-36` is 9rem. The loaded card floor at `calc(73rem+4px)` stays aligned only if it becomes `calc(75rem+4px)` when the date column grows.
- Roadmap S-13 records that `/dashboard` 404s. `src/middleware.ts` must stop listing that path, and nothing should replace the deleted page with a redirect.

## What We're NOT Doing

- Redirecting `/dashboard` to `/measurements`.
- Changing stored measurements, delta calculation, validation limits, or who can link a trainee.
- Coloring a delta as good or bad.
- Wrapping units in parentheses or adding a separate unit control. The unit stays the existing string, space-separated, on the label.
- Widening the trainer card before a selected trainee's measurements load. `Link trainee` is `w-full` inside the current `w-max` card.
- Edit or delete of an entry (S-05, S-06).

## Implementation Approach

Treat `HEAD` as the baseline and the contracts below as the target. The working tree is already aimed at that target, so each phase is a confirmation pass plus a fill-in where something still matches `HEAD`. Phase 1 moves the route and the greeting. Phase 2 changes copy and row layout on the same screen. Shared behavior stays in `topbarModel`, `measurementFields`, and `formatDelta`.

## Phase 1: Measurements route and greeting

### Overview

The protected screen and every redirect that opens it live at `/measurements`. The greeting has a comma and no role name. The visible `Dashboard` title and the unavailable heading become `Measurements`.

### Changes Required:

#### 1. Measurements page

**File**: `src/pages/dashboard.astro` (remove), `src/pages/measurements.astro` (add)

**Intent**: Serve the existing trainee journal and trainer panel from `/measurements` so the old address no longer opens the screen.

**Contract**: `measurements.astro` keeps the data loading from `dashboard.astro` and sets `Layout` title to `Measurements`. `dashboard.astro` is removed. No replacement route redirects `/dashboard`.

#### 2. Protection and redirects

**File**: `src/middleware.ts`, `src/pages/api/auth/signin.ts`, `src/pages/api/auth/signup.ts`, `src/pages/api/measurements/index.ts`, `src/pages/api/trainer-links/index.ts`, `src/components/trainer/TrainerPanel.astro`

**Intent**: Send signed-in users, failed posts, and trainer preview links to the new path, and stop treating `/dashboard` as protected.

**Contract**: `PROTECTED_ROUTES` is `["/measurements"]`. Success and error redirects that currently target `/dashboard` target `/measurements`, preserving query strings (`error`, `trainee`). Trainer preview anchors use `/measurements?trainee=`. The unavailable heading in `TrainerPanel.astro` is `Measurements`. Sign-out still returns to `/`.

#### 3. Greeting and nav href

**File**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`

**Intent**: Greet without a role name, and point the existing Measurements link at the new path.

**Contract**: Guest `greeting` is `Hello, guest` and `email` is null. Trainee or trainer `greeting` is `Hello,` with `email` set. Role null keeps `greeting: null` and still shows the email. The signed-in link stays `{ id: "measurements", label: "Measurements", href: "/measurements" }`. `current` is still pathname equality, so `/measurements?trainee=…` marks Measurements. Tests expect those strings and that href. `TopbarActions` keeps rendering greeting, a space, and email.

#### 4. Checks and review copy that name the old route

**File**: `scripts/smoke.mjs`, `scripts/check-home-tokens.mjs`, `CLAUDE.md`, `src/pages/kitchen-sink/home.astro`, `src/pages/kitchen-sink/journal.astro`, `src/pages/kitchen-sink/trainer.astro`

**Intent**: Keep smoke, the token file list, agent instructions, and kitchen-sink prose on the path and greeting the app now uses.

**Contract**: Smoke requests `/measurements` wherever it requested `/dashboard`, including redirect locations. The trainer case that ran before any link can stay on its current body assertion until Phase 2. `check-home-tokens.mjs` lists `src/pages/measurements.astro` and does not list `src/pages/dashboard.astro`. `CLAUDE.md` states the guest greeting `Hello, guest`, the signed-in greeting `Hello,` plus email with no role word, and that the measurements screen and its redirects live at `/measurements`. Kitchen-sink prose uses those greetings and `/measurements`. The trainer sink's unavailable heading copy says `Measurements`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, with guest greeting `Hello, guest`, signed-in greeting `Hello,`, and the Measurements link href `/measurements` in `src/lib/topbar.test.ts`
- `npm run lint` passes
- `npm run check:home-tokens` passes, and `scripts/check-home-tokens.mjs` lists `src/pages/measurements.astro` and does not list `src/pages/dashboard.astro`
- `src/`, `scripts/`, and `CLAUDE.md` contain no `/dashboard` path
- `npm run smoke` against a running server treats `/measurements` as the protected screen and does not request `/dashboard`

#### Manual Verification:

- A guest on `/` reads `Hello, guest`; a signed-in trainee or trainer reads `Hello,` and their email, with no role word; Measurements goes to `/measurements`
- A signed-out visit to `/measurements` redirects to sign-in; after sign-in the screen is `/measurements`; `/dashboard` responds 404

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Screen copy and field layout

### Overview

The trainer can find a trainee by email without a visible Email label. The trainee, and a linked trainer reading the same list, see the unit on the name, a semibold difference under the number, and a date column wide enough for the calendar icon.

### Changes Required:

#### 1. Trainer finder

**File**: `src/components/trainer/TrainerPanel.astro`, `src/pages/kitchen-sink/trainer.astro`, `scripts/smoke.mjs`

**Intent**: Make the finder say what it does, and give the submit control the same full-width treatment as Add measurement.

**Contract**: Trainer-mode `h1` is `Find trainee by email`. The visible `Email` label is removed. The email input keeps accessible name `Email` (`aria-label`). The submit `Button` has `className="w-full"`. When `trainerLinks.length > 0`, an `h2` reading `Body measurements` sits above the link list; with zero links that heading is absent. The card stays `w-max` until `selectedLink && trainerMeasurementsLoaded`. Smoke's no-link trainer response expects body `Find trainee by email`. Kitchen-sink prose matches these headings.

#### 2. Trainee heading, units, and delta

**File**: `src/components/journal/TraineeJournal.astro`, `src/components/measurements/MeasurementList.astro`, `src/components/measurements/MeasurementForm.tsx`, `src/pages/kitchen-sink/journal.astro`

**Intent**: Name the journal action, put each unit on the label, and place a heavier delta under the value.

**Contract**: Trainee `h1` is `Add your next measurement`. Form labels stay `` `${field.label} ${field.unit}` `` from `measurementFields`. List labels render the same `label` + space + `unit`. List value text is `formatMeasurement` only (one decimal, no unit). `accessibleValue` and `accessibleDelta` still include the unit. The delta element comes after the value box in the same column, uses `font-semibold`, and still renders `formatDelta`. Entries with `deltas: null` render no delta. Do not change `src/lib/measurement-deltas.ts` or `src/lib/measurement-input.ts`.

#### 3. Date column and card floor

**File**: `src/components/measurements/MeasurementForm.tsx`, `src/components/measurements/MeasurementList.astro`, `src/components/journal/TraineeJournal.astro`, `src/components/trainer/TrainerPanel.astro`

**Intent**: Give the date room so the calendar icon does not cover the day, and keep the loaded card as wide as one full row.

**Contract**: Form and list date columns are `w-36 max-w-36 min-w-36 shrink-0`. Measurement columns stay `w-28`. The date input reserves trailing space and pins the native calendar indicator to the end so the day digits stay fully visible. Loaded floors on the trainee journal (`measurementsLoaded`) and the trainer card (`selectedLink && trainerMeasurementsLoaded`) are `min-w-[calc(75rem+4px)]`. The journal comment names `date w-36 + 8×w-28` plus gaps, list padding, card padding, and both borders.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `npm run smoke` against a running server: a trainer with no links sees `Find trainee by email`, and two trainee weight entries still show `↓ 1.5`

#### Manual Verification:

- Trainer card heading is `Find trainee by email`, the email field has no visible Email label, Link trainee is full width of that field, and `Body measurements` appears above linked emails only when a link exists
- Trainee heading is `Add your next measurement`; labels read `Weight kg` and the other fields the same way; the value has no unit; the delta sits under the value and is semibold; the date column is wider than a measurement column and the calendar icon does not cover the day
- `/kitchen-sink/journal` and `/kitchen-sink/trainer` show those same headings and the same field layout

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `src/lib/topbar.test.ts` covers guest `Hello, guest`, signed-in `Hello,`, role-null email only, and Measurements href `/measurements` including a pathname with no query.

### Integration Tests:

- `npm run smoke` covers anonymous redirect, sign-in landing, measurement POST redirects, the weight delta `↓ 1.5`, and the trainer finder heading `Find trainee by email`.

### Manual Testing Steps:

1. Open `/` signed out and read `Hello, guest`. Sign in as a trainee and read `Hello,` plus the email on `/measurements`.
2. Open `/dashboard` and confirm a 404. Sign out and confirm `/measurements` redirects to sign-in.
3. Sign in as a trainer. Confirm the finder heading, the missing visible Email label, the full-width Link trainee button, and `Body measurements` only after a link exists.
4. As a trainee, add two entries and confirm unit-on-label, bare values, semibold delta under the number, and a date field whose day is not under the calendar icon.
5. Repeat the journal and trainer headings on `/kitchen-sink/journal` and `/kitchen-sink/trainer`.

## Performance Considerations

No new queries or payloads. The date column grows by 2rem, and the loaded card floor grows with it so the row stays one line.

## Migration Notes

No database migration. Deleting `src/pages/dashboard.astro` leaves `/dashboard` as a 404. Sessions, measurements, and trainer links stay as they are. The previous Worker briefly 404s that old path once this Worker is deployed; that matches the S-13 risk and needs no schema step.

## References

- Change notes: `context/changes/measurement-copy-polish/change.md`
- Roadmap slice: `context/foundation/roadmap.md` (S-13, MS-07)
- Greeting model: `src/lib/topbar.ts`
- Field units: `src/lib/measurement-input.ts`
- Delta text: `src/lib/measurement-deltas.ts`
- List row: `src/components/measurements/MeasurementList.astro`
- Similar prior plans: `context/archive/2026-09-30-shared-topbar/plan.md`, `context/archive/2026-09-30-horizontal-measurements/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Measurements route and greeting

#### Automated

- [x] 1.1 `npm test` passes, with guest greeting `Hello, guest`, signed-in greeting `Hello,`, and the Measurements link href `/measurements` in `src/lib/topbar.test.ts` — ce7123f
- [x] 1.2 `npm run lint` passes — ce7123f
- [x] 1.3 `npm run check:home-tokens` passes, and `scripts/check-home-tokens.mjs` lists `src/pages/measurements.astro` and does not list `src/pages/dashboard.astro` — ce7123f
- [x] 1.4 `src/`, `scripts/`, and `CLAUDE.md` contain no `/dashboard` path — ce7123f
- [x] 1.5 `npm run smoke` against a running server treats `/measurements` as the protected screen and does not request `/dashboard` — ce7123f

#### Manual

- [x] 1.6 A guest on `/` reads `Hello, guest`; a signed-in trainee or trainer reads `Hello,` and their email, with no role word; Measurements goes to `/measurements` — ce7123f
- [x] 1.7 A signed-out visit to `/measurements` redirects to sign-in; after sign-in the screen is `/measurements`; `/dashboard` responds 404 — ce7123f

### Phase 2: Screen copy and field layout

#### Automated

- [x] 2.1 `npm test` passes — c43c87a
- [x] 2.2 `npm run lint` passes — c43c87a
- [x] 2.3 `npm run smoke` against a running server: a trainer with no links sees `Find trainee by email`, and two trainee weight entries still show `↓ 1.5` — c43c87a

#### Manual

- [x] 2.4 Trainer card heading is `Find trainee by email`, the email field has no visible Email label, Link trainee is full width of that field, and `Body measurements` appears above linked emails only when a link exists — c43c87a
- [x] 2.5 Trainee heading is `Add your next measurement`; labels read `Weight kg` and the other fields the same way; the value has no unit; the delta sits under the value and is semibold; the date column is wider than a measurement column and the calendar icon does not cover the day — c43c87a
- [x] 2.6 `/kitchen-sink/journal` and `/kitchen-sink/trainer` show those same headings and the same field layout — c43c87a
