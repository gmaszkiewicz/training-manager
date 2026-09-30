# Trainee journal visual contract Implementation Plan

## Overview

Move the trainee journal on `/dashboard` off the starter glass card and onto the same role tokens as sign-in. The trainer branch in that page stays on the glass shell.

## Current State Analysis

A signed-in trainee sees the `role === "trainee"` branch in `src/pages/dashboard.astro` (lines 78–97) inside one shared shell: `bg-cosmic`, `border-white/10 bg-white/10 text-white`, and a `from-blue-200 to-purple-200` heading (lines 73–75). Welcome, empty, and load-failure copy use `text-blue-100`. Sign out is a raw button after both role branches (lines 164–171). `MeasurementList.astro` repeats the glass row classes. `MeasurementForm.tsx` already uses role tokens, including an inner `bg-card` panel that exists so the fields stay light on that dark shell. Date and note are still a local `controlClass` plus raw `label`, `input`, and `textarea`. There is no `textarea` in `src/components/ui/`, and no `card`.

Sign-in is the migrated centered screen: `border-border bg-card text-card-foreground` and `text-muted-foreground` (`src/pages/auth/signin.astro`). `body` already applies `bg-background text-foreground`. Logged-out visits to `/dashboard` redirect to `/auth/signin`. The token check in `scripts/check-home-tokens.mjs` includes `MeasurementForm.tsx` and does not include `dashboard.astro` or `MeasurementList.astro`.

## Desired End State

A trainee who opens `/dashboard` sees a light journal card on the page background, with the list, empty sentence, load failure, date, note, submit, and Sign out reading the existing roles. A trainer on the same route still sees the glass shell. `/kitchen-sink/journal` shows the seven states. The token check fails if the journal component or the list grows a palette class again.

### Key Discoveries:

- The trainee branch and the trainer branch share one shell (`src/pages/dashboard.astro:73-76`). Editing that wrapper restyles the trainer panel.
- `MeasurementList` is also rendered for a selected trainee (`src/pages/dashboard.astro:148`). Restyling it changes that preview. Duplicating the list is not the fix.
- `MeasurementForm` is only mounted from the trainee branch (`src/pages/dashboard.astro:86`). Its inner card is a light surface for a dark parent, not a second design system.
- `FormField` requires an `icon` (`src/components/auth/FormField.tsx:17`), so date and note use `Input`, `Label`, and `Textarea` directly.
- `SubmitButton` already supports `forcePending` (`src/components/auth/SubmitButton.tsx:9-14`). The journal page has no separate measurements-loading branch; the list renders after the server call.
- `ServerError` is the destructive message with a border, a tint, and an icon (`src/components/auth/ServerError.tsx:11`). The load-failure sentence currently uses the same blue as the welcome line.

## What We're NOT Doing

- Restyling the trainer branch, the unresolved-role line ("Could not open your journal"), or that branch's raw Sign out.
- Editing `:root`, `.dark`, or `@utility bg-cosmic`. Removing `bg-cosmic`. Adding a dark-mode toggle.
- Adding `Card`, running `shadcn init`, or installing Playwright or a new lint dependency.
- Adding a measurements-loading skeleton. The page does not have that state.
- Duplicating `MeasurementList` to spare the trainer preview.
- Changing measurement data, validation, field names, POST targets, or visible copy. Delta coloring stays out (no good/bad colors).
- Putting `dashboard.astro` or the kitchen sink on the token check.
- Linking the kitchen sink from the home page or the bar.

## Implementation Approach

Follow the auth visual change: library, then a token deposit that does not change values, then the view, then the states. Phase 1 adds `Textarea` through the existing shadcn setup. Phase 2 records the roles this view will read. Phase 3 moves the trainee branch into `src/components/journal/TraineeJournal.astro` so the cleaned shell lives in a file the token check can own, retokenizes the list, and replaces the raw date, note, and Sign out controls. Phase 4 adds `/kitchen-sink/journal`, extends `scripts/check-home-tokens.mjs`, and names the sink in `CLAUDE.md`.

Charge map: missing tokens land in Phase 3 (shell, copy, list rows, load failure). Missing `Textarea`, `Input`, and `Label` for date and note, and `Button` for Sign out, land in Phase 1 and Phase 3. `Card` stays deferred. The shared shell is the accidental-architecture charge and lands in Phase 3 by giving the trainee branch its own component. The ungated shell and list land in Phase 4. Trainer markup, `bg-cosmic`, and a theme toggle stay deferred.

## Critical Implementation Details

- **shadcn must not rewrite tokens.** `npx shadcn@latest add textarea` may edit `src/styles/global.css`. Restore `:root`, `.dark`, and `@utility bg-cosmic` before Phase 1 ends. Do not run `shadcn init`.
- **One shell, one card.** `MeasurementForm`'s inner `bg-card` panel exists because the dashboard parent is glass. Remove that wrapper in the same phase as the trainee shell. Leaving it nests a card inside the new card.
- **Sign out cannot stay shared.** It sits after both role branches inside the one glass shell. The trainee control moves into `TraineeJournal`. The raw button stays inside the glass shell for the trainer branch and the unresolved-role line.
- **Do not scan `dashboard.astro`.** Trainer palette classes remain on purpose. The check lists only files this change leaves fully clean.
- **SSR-only React on the trainee shell.** Sign out `Button` and load-failure `ServerError` in `TraineeJournal.astro` render without a `client:` directive. Confirm in Phase 3 manual verification that Sign out POST works and load-failure markup appears before adding hydration.

## Phase 1: Library

### Overview

Add the missing note primitive. Do not add a panel primitive, and do not change token values.

### Changes Required:

#### 1. Textarea

**File**: `src/components/ui/textarea.tsx`

**Intent**: The note field needs one Textarea from this repo's system, instead of a native textarea with a local class.

**Contract**: Add Textarea with `npx shadcn@latest add textarea`, using the existing `components.json` (`style` `new-york`, `cssVariables` true, `ui` alias `@/components/ui`). Do not add `card`. Do not edit `:root`, `.dark`, or `@utility bg-cosmic`. If the CLI edits `src/styles/global.css`, restore those blocks before the phase ends. Dependency updates required by Textarea may change `package.json`. No other dependencies. The new file lives at `src/components/ui/textarea.tsx`.

### Success Criteria:

#### Automated Verification:

- `src/components/ui/textarea.tsx` exists
- `src/components/ui/card.tsx` does not exist
- `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged
- `npm run lint` passes

#### Manual Verification:

- Textarea uses the existing CSS variables and does not introduce a second palette

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Tokens

### Overview

Name the roles this change will read. Leave the values where they are.

### Changes Required:

#### 1. Token deposit

**File**: `context/changes/trainee-journal-ui/tokens.md`

**Intent**: The next session must reuse the existing roles instead of inventing colors for the journal card.

**Contract**: List `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, and `ring`. State that the values are the current ones in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`) and that this change does not edit them. `accent` and `accent-foreground` are there because Sign out uses Button `outline`. `muted` is there because list rows sit on the card. Do not modify `src/styles/global.css`.

### Success Criteria:

#### Automated Verification:

- `context/changes/trainee-journal-ui/tokens.md` lists `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, and `ring`, and states those values stay in `src/styles/global.css`
- `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged

#### Manual Verification:

- The listed roles are the ones the journal shell, list rows, fields, errors, submit button, and Sign out will use

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: View

### Overview

Give the trainee journal its own token shell, and move the list, date, note, load failure, and Sign out onto the recorded roles. Leave the trainer glass in `dashboard.astro`.

### Changes Required:

#### 1. Trainee shell

**File**: `src/components/journal/TraineeJournal.astro`

**Intent**: A trainee sees the sign-in visual contract. The trainer shell in `dashboard.astro` is no longer the parent of that branch.

**Contract**: New Astro component. Props: `email` (string or undefined), `measurementsLoaded` (boolean), `entries` (`MeasurementWithDeltas[]`), `serverError` (string or null), and optional `idPrefix` (string, default `""`) forwarded only to `MeasurementForm`. Outer wrapper: `flex min-h-screen items-center justify-center p-4`, no `bg-cosmic`. Inner panel stays a `div`: `w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-card-foreground`. Width stays `max-w-2xl` because the form and list are wider than the sign-in card (`max-w-sm`). Heading text is `Journal`, classes `mb-6 text-center text-2xl font-bold text-card-foreground`. Welcome copy stays `Welcome,` plus the email; the line is `text-muted-foreground`, and the email is `font-semibold text-card-foreground`. When `measurementsLoaded` is true, render `MeasurementForm` with `client:load`, `serverError`, and `idPrefix`, then either `No measurements yet` (`mt-6 text-sm text-muted-foreground`) when `entries.length === 0` or `MeasurementList` otherwise. When `measurementsLoaded` is false, do not render the form; render `ServerError` with the message `Could not load your measurements`. Sign out is a POST form to `/api/auth/signout` containing `Button` from `@/components/ui/button` with `type="submit"` and `variant="outline"`, no `client:` directive, label `Sign out`. Do not add `Card`. Do not use palette classes.

#### 2. Dashboard branch

**File**: `src/pages/dashboard.astro`

**Intent**: The trainee branch leaves the shared glass shell. Trainer and unresolved-role markup stay in it, including their Sign out.

**Contract**: When `role === "trainee"`, render `TraineeJournal` with the page's `user?.email`, `measurementsLoaded`, `entries`, and `serverError`, and do not render the glass wrapper. Otherwise keep the current glass wrapper, its `bg-cosmic` page, and the raw Sign out form posting to `/api/auth/signout`. The glass heading is `Trainer` when `role === "trainer"` and `Dashboard` otherwise. Do not change trainer copy, trainer classes, trainer forms, or the unresolved-role sentence `Could not open your journal`. Do not pass `idPrefix`.

#### 3. Measurement list

**File**: `src/components/measurements/MeasurementList.astro`

**Intent**: Rows read the same roles as the card, including when a trainer is previewing entries inside the old shell.

**Contract**: Keep the list structure, `measured_on` on `<time>`, accessible names, `formatDelta`, and the note only when present. Row: `rounded-lg border border-border bg-muted p-4 text-sm text-card-foreground`. The date is `font-semibold text-card-foreground`. The note is `text-muted-foreground`. Do not add hover behavior. Do not color deltas by direction. Do not use palette classes.

#### 4. Date, note, and form surface

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: Date and note use the shared controls, and the form no longer paints a second card once the journal shell is the card.

**Contract**: Keep the POST to `/api/measurements`, field names, validation, and visible labels (`Date`, `Note`, `Add measurement`, `Adding measurement...`). Add optional `idPrefix?: string` defaulting to `""`. Live dashboard does not pass it. Element ids become `` `${idPrefix}measured_on` ``, `` `${idPrefix}${field.field}` ``, and `` `${idPrefix}note` ``. `name` attributes stay `measured_on`, the measurement field names, and `note`. On every `FormField`, pass `name={field.field}` explicitly so prefixed ids never become POST names (`FormField` defaults `name` to `id`). Remove `controlClass` and the inner `border-border bg-card text-card-foreground rounded-2xl border p-8` wrapper. Keep `className="text-left"` on the form and `space-y-4` around the fields. Date uses `Label` (`text-muted-foreground`) and `Input` (`type="date"`, `max`, controlled value). Note uses `Label` and `Textarea` (`rows={3}`, `maxLength={1000}`). An error sets `aria-invalid` and keeps `FieldError` (`CircleAlert` and `text-destructive`) next to that field. Do not pass palette classes or arbitrary sizes. Do not pass `forcePending`. `ServerError` and `SubmitButton` stay.

### Success Criteria:

#### Automated Verification:

- The hardcoded-value scan returns no matches on `src/components/journal/TraineeJournal.astro`, `src/components/measurements/MeasurementList.astro`, and `src/components/measurements/MeasurementForm.tsx`
- `src/components/journal/TraineeJournal.astro` does not contain `bg-cosmic`, and `src/pages/dashboard.astro` still contains `bg-cosmic`
- Trainee Sign out and the trainer Sign out both post to `/api/auth/signout`, and the measurement form still posts to `/api/measurements`
- `npm run lint` passes
- `npm run smoke` passes against a running server (`BASE_URL` default `http://localhost:4321`)

#### Manual Verification:

- A signed-in trainee sees a light card on the page background, with no glass panel and no gradient heading, and Sign out is an outline button that POSTs to `/api/auth/signout` without requiring client hydration
- An empty journal shows "No measurements yet", a failed load shows "Could not load your measurements" in ServerError (SSR, no extra island) and hides the form, and a journal with entries shows the list on role tokens
- A signed-in trainer still sees the glass shell, the raw Sign out, and the restyled list when a trainee has entries

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: States

### Overview

Show the seven journal states on a kitchen sink, and make the existing token check fail if the journal shell or the list grows a palette class again.

### Changes Required:

#### 1. Journal kitchen sink

**File**: `src/pages/kitchen-sink/journal.astro`

**Intent**: Review can see every journal state without a screenshot tool, including the states the happy path never hits.

**Contract**: Public route `/kitchen-sink/journal`. Do not add it to `PROTECTED_ROUTES` in `src/middleware.ts`. Do not link it from the bar or the home. Render it with `bg-background text-foreground`. Sections, in order:

- **Default** — one `TraineeJournal` with `measurementsLoaded`, a sample email, `serverError` null, and one static `MeasurementWithDeltas` that has `measured_on`, every measurement field, a note, and deltas for every field. Define that fixture as a const in the `journal.astro` frontmatter (use `measurementFields` and `MeasurementWithDeltas`; no fetch). This is the only form that uses the unprefixed ids.
- **Hover** — state that submit uses Button `hover:bg-primary/90`, and that Sign out uses the outline hover (`hover:bg-accent`). State that list rows are not controls, so row hover is N/A.
- **Focus-visible** — the date field, one measurement field, the note, the submit button, and Sign out from that single default journal are present to tab through. The ring is the shared `--ring`.
- **Disabled** — `SubmitButton` with `client:load` and `forcePending`, so the control is disabled, with `pendingText` `Adding measurement...`. `MeasurementForm` does not pass `forcePending`.
- **Error** — `TraineeJournal` with `measurementsLoaded` false, so `ServerError` shows `Could not load your measurements` and the form is absent. Also one `FormField` with `client:load`, `id="sink-measured-on"`, `type="date"`, `label="Date"`, `error="Date is required"`, and a decorative icon (same pattern as `AuthSinkStates` — do not import the private `FieldError` from `MeasurementForm`). Do not reuse `id="measured_on"`.
- **Empty** — `TraineeJournal` with `measurementsLoaded`, `entries` empty, and `idPrefix="empty-"`, so the sentence `No measurements yet` shows under a second form whose ids do not collide with Default.
- **Loading** — `SubmitButton` with `client:load` and `forcePending`, showing `Adding measurement...` and the spinner. State on the page that a separate measurements-loading state is N/A because the journal renders only after the server call returns.

Do not quote palette class names or `ring-[3px]` in the page text. The sink is not one of the scanned files.

#### 2. Token check

**File**: `scripts/check-home-tokens.mjs`

**Intent**: A palette class on the trainee shell or the measurement list fails the check that CI already runs.

**Contract**: Append `src/components/journal/TraineeJournal.astro` and `src/components/measurements/MeasurementList.astro` to the existing `FILES` list. Do not add `src/pages/kitchen-sink/journal.astro`, `src/pages/dashboard.astro`, `src/styles/global.css`, or files under `src/components/ui`. `MeasurementForm.tsx` is already listed. Keep the script name, the npm script `check:home-tokens`, and the existing `.github/workflows/ci.yml` step. Do not add a second checker and do not add a lint dependency.

#### 3. Rule

**File**: `CLAUDE.md`

**Intent**: The next agent can find the journal sink next to the home and auth sinks.

**Contract**: In the existing UI block, add that the journal kitchen sink is `/kitchen-sink/journal`. Keep the current sentences about `src/styles/global.css`, `src/components/ui`, `npx shadcn@latest add`, literal colours, `/kitchen-sink/home`, and `/kitchen-sink/auth`. Do not create a second rules file.

### Success Criteria:

#### Automated Verification:

- `src/pages/kitchen-sink/journal.astro` exists, `PROTECTED_ROUTES` in `src/middleware.ts` does not include it, and no bar or home component links to `/kitchen-sink/journal`
- `npm run check:home-tokens` exits 0, and `scripts/check-home-tokens.mjs` lists `src/components/journal/TraineeJournal.astro` and `src/components/measurements/MeasurementList.astro` and does not list the kitchen sink or `dashboard.astro`
- `.github/workflows/ci.yml` still runs `npm run check:home-tokens`
- `CLAUDE.md` names `/kitchen-sink/journal` beside `/kitchen-sink/home` and `/kitchen-sink/auth`
- `npm run lint` passes

#### Manual Verification:

- `/kitchen-sink/journal` shows default, hover, focus-visible, disabled, error, empty, and loading, and marks list-row hover and a separate measurements-loading state as N/A with the reasons in this plan
- The sink is readable at a desktop width and at one mobile width
- Tabbing the default journal shows a visible focus ring on the date field, a measurement field, the note, the submit button, and Sign out

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- No new unit test is required for this visual change. Validation copy, POST targets, and delta formatting stay.

### Integration Tests:

- `npm run check:home-tokens` is the regression gate for palette classes on the journal shell and the list, once Phase 4 adds those files.
- `npm run lint` covers the new component and the sink.

### Manual Testing Steps:

1. Sign in as a trainee with no entries and confirm the light card, the form, "No measurements yet", and outline Sign out.
2. Add a measurement and confirm the list rows, the note, and the deltas on role tokens.
3. Sign in as a trainer and confirm the glass shell and raw Sign out, and that a trainee with entries shows the restyled list inside that shell.
4. Open `/kitchen-sink/journal` at a desktop width and one mobile width, and tab the default journal through date, a measurement, note, submit, and Sign out.

## Performance Considerations

No new request and no new client island. The measurement form already hydrates. Sign out renders as static HTML. The kitchen sink is a public review page and is not linked from the product.

## Migration Notes

No schema change and no data migration. `MeasurementList` is shared, so a trainer previewing entries sees the new rows in this release, inside the glass shell, until the trainer visual change. Rollback reverts `TraineeJournal`, the dashboard branch, and the list classes together.

## References

- Research: `context/changes/trainee-journal-ui/research.md`
- Prior visual plan: `context/archive/2026-09-29-auth-signin-form/plan.md`
- Sign-in shell: `src/pages/auth/signin.astro`
- Token check: `scripts/check-home-tokens.mjs`
- Agent UI block: `CLAUDE.md`
- Roadmap slice: `context/foundation/roadmap.md` (S-09)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Library

#### Automated

- [x] 1.1 `src/components/ui/textarea.tsx` exists — bc6fddf
- [x] 1.2 `src/components/ui/card.tsx` does not exist — bc6fddf
- [x] 1.3 `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged — bc6fddf
- [x] 1.4 `npm run lint` passes — bc6fddf

#### Manual

- [x] 1.5 Textarea uses the existing CSS variables and does not introduce a second palette — bc6fddf

### Phase 2: Tokens

#### Automated

- [x] 2.1 `context/changes/trainee-journal-ui/tokens.md` lists `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, and `ring`, and states those values stay in `src/styles/global.css` — 55ab6e1
- [x] 2.2 `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged — 55ab6e1

#### Manual

- [x] 2.3 The listed roles are the ones the journal shell, list rows, fields, errors, submit button, and Sign out will use — 55ab6e1

### Phase 3: View

#### Automated

- [x] 3.1 The hardcoded-value scan returns no matches on `src/components/journal/TraineeJournal.astro`, `src/components/measurements/MeasurementList.astro`, and `src/components/measurements/MeasurementForm.tsx` — 628202a
- [x] 3.2 `src/components/journal/TraineeJournal.astro` does not contain `bg-cosmic`, and `src/pages/dashboard.astro` still contains `bg-cosmic` — 628202a
- [x] 3.3 Trainee Sign out and the trainer Sign out both post to `/api/auth/signout`, and the measurement form still posts to `/api/measurements` — 628202a
- [x] 3.4 `npm run lint` passes — 628202a
- [x] 3.5 `npm run smoke` passes against a running server (`BASE_URL` default `http://localhost:4321`) — 628202a

#### Manual

- [x] 3.6 A signed-in trainee sees a light card on the page background, with no glass panel and no gradient heading, and Sign out is an outline button that POSTs to `/api/auth/signout` without requiring client hydration — 628202a
- [x] 3.7 An empty journal shows "No measurements yet", a failed load shows "Could not load your measurements" in ServerError (SSR, no extra island) and hides the form, and a journal with entries shows the list on role tokens — 628202a
- [x] 3.8 A signed-in trainer still sees the glass shell, the raw Sign out, and the restyled list when a trainee has entries — 628202a

### Phase 4: States

#### Automated

- [x] 4.1 `src/pages/kitchen-sink/journal.astro` exists, `PROTECTED_ROUTES` in `src/middleware.ts` does not include it, and no bar or home component links to `/kitchen-sink/journal` — 81e8b01
- [x] 4.2 `npm run check:home-tokens` exits 0, and `scripts/check-home-tokens.mjs` lists `src/components/journal/TraineeJournal.astro` and `src/components/measurements/MeasurementList.astro` and does not list the kitchen sink or `dashboard.astro` — 81e8b01
- [x] 4.3 `.github/workflows/ci.yml` still runs `npm run check:home-tokens` — 81e8b01
- [x] 4.4 `CLAUDE.md` names `/kitchen-sink/journal` beside `/kitchen-sink/home` and `/kitchen-sink/auth` — 81e8b01
- [x] 4.5 `npm run lint` passes — 81e8b01

#### Manual

- [x] 4.6 `/kitchen-sink/journal` shows default, hover, focus-visible, disabled, error, empty, and loading, and marks list-row hover and a separate measurements-loading state as N/A with the reasons in this plan — 81e8b01
- [x] 4.7 The sink is readable at a desktop width and at one mobile width — 81e8b01
- [x] 4.8 Tabbing the default journal shows a visible focus ring on the date field, a measurement field, the note, the submit button, and Sign out — 81e8b01
