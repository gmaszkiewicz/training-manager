# Trainer panel UI Implementation Plan

## Overview

Restyle the trainer panel on `/dashboard`, and the unresolved-role fallback that shares its shell, onto the trainee journal's visual contract. Remove the starter glass utility once that shell is the last consumer. Linking, preview selection, and measurement data stay as they are.

## Current State Analysis

A signed-in trainee on `/dashboard` renders `TraineeJournal`: a light `max-w-2xl` card (`border-border bg-card text-card-foreground`), muted welcome copy, `ServerError` for load failure, and an outline `Button` for Sign out (`src/components/journal/TraineeJournal.astro:19-41`). `Input`, `Label`, and `Button` already live in `src/components/ui/`. `MeasurementList` already uses role tokens (`src/components/measurements/MeasurementList.astro:28-48`).

Every other role still renders the starter glass card in `src/pages/dashboard.astro:81-161`: `bg-cosmic`, `border-white/10 bg-white/10 backdrop-blur-xl`, a blue-to-purple heading, palette copy, a raw email input, raw buttons, and raw error sentences. That branch is the trainer panel when `role === "trainer"` (`dashboard.astro:86-147`) and the unresolved-role fallback otherwise (`dashboard.astro:149-150`, heading "Dashboard", sentence "Could not open your journal"). Sign out sits in the same card (`dashboard.astro:152-159`).

`@utility bg-cosmic` in `src/styles/global.css:113` is referenced only from that shell. `scripts/check-home-tokens.mjs` scans the journal, the list, and the form, and does not scan `dashboard.astro`. There is no trainer kitchen sink. `/kitchen-sink/journal` is the pattern to follow.

Preview stays on `/dashboard?trainee=<uuid>`. The link form is a native POST to `/api/trainer-links`. A failed link can return the selected trainee id from a hidden `trainee` field (`src/pages/api/trainer-links/index.ts:16-21` and `:44`). A trainer with zero links sees the form and no empty-list sentence. "No measurements yet" appears only after a trainee is selected and has no entries (`dashboard.astro:133-134`).

## Desired End State

A trainer who signs in sees the same light card as the trainee journal: welcome, the email link form, trainee links, the read-only measurement preview, and outline Sign out. Existing sentences stay word for word. A profile whose role is neither trainee nor trainer sees "Could not open your journal" and Sign out on that same card. `/dashboard` no longer uses `bg-cosmic`, and the utility is gone. `/kitchen-sink/trainer` shows the states this panel has, and the token check covers the new component, the sink, and `dashboard.astro`.

### Key Discoveries:

- The journal shell to copy is `TraineeJournal.astro:19-21`: outer `flex min-h-screen items-center justify-center p-4`, inner `div` (not `Card`) `w-full max-w-2xl rounded-2xl border border-border bg-card p-8 text-card-foreground`, heading `mb-6 text-center text-2xl font-bold text-card-foreground`.
- `Input` forwards native input props (`src/components/ui/input.tsx:5-17`), so a server-rendered `name="email"` still submits the POST.
- `ServerError` renders nothing when `message` is missing (`src/components/auth/ServerError.tsx:7-8`). `TraineeJournal` renders it from Astro without `client:load`.
- `selectTrainerPreview` always selects a trainee when the link list is non-empty (`src/lib/trainer-preview.ts:13-35`). The empty-list case and the measurements-empty case are different states.
- S-09 left this branch, the unresolved-role glass, and `bg-cosmic` for this change (`context/archive/2026-09-29-trainee-journal-ui/research.md` charges 4 and 5). Roadmap S-10 is that change (`context/foundation/roadmap.md` MS-04).

## What We're NOT Doing

- Adding an empty-list sentence for zero linked trainees. The link form is that state.
- Changing link, preview, or measurement behavior: no create, edit, delete, or reply. The POST target, field names, redirects, and `selectTrainerPreview` stay.
- Editing `:root`, `.dark`, or any role-token value. Adding `Card`. Adding a dark-mode toggle.
- A client island, pending label, or disabled control for Link trainee. Disabled and loading are N/A on this panel.
- Restyling `MeasurementList`, `TraineeJournal`, or the measurement form.
- A separate `/trainer` route.
- Good/bad coloring on measurement deltas.

## Implementation Approach

Extract the non-trainee branch into one Astro component that uses the journal shell and the existing `Input`, `Label`, `Button`, and `ServerError`. `dashboard.astro` keeps its data loading and chooses the trainee journal or this panel. The link form stays a native POST, including the hidden `trainee` field. After the page stops using `bg-cosmic`, delete that utility in the same phase. Phase 2 adds `/kitchen-sink/trainer`, extends `scripts/check-home-tokens.mjs`, and records the sink in `CLAUDE.md`.

There is no library phase and no token-value phase. `Input`, `Label`, `Button`, and `ServerError` already exist. The roles this view reads are the ones deposited in `context/archive/2026-09-29-trainee-journal-ui/tokens.md`. Do not add a second token file.

## Critical Implementation Details

- **Native POST.** The email control has to be a real `input` with `name="email"`, `type="email"`, `required`, and an `id` the label points at. `Input` already forwards those props. Do not wrap the form in a client island. The API reads `form.get("email")` (`src/pages/api/trainer-links/index.ts:36-39`).
- **Hidden trainee id.** When a trainee is selected, keep `<input type="hidden" name="trainee" value={selectedLink.traineeId} />`. A failed link redirects with that id only when it is a UUID (`index.ts:16-21`, `:44`).
- **One email id per page.** The sink mounts several forms. `idPrefix` (default `""`) is applied to the email input id and the label `htmlFor` as `${idPrefix}email`. The hidden field has no id.

---

## Phase 1: Trainer panel

### Overview

Replace the glass shell with the journal card for the trainer panel and the unresolved-role fallback. Remove `@utility bg-cosmic` once `dashboard.astro` no longer references it.

### Changes Required:

#### 1. Trainer panel component

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Give the non-trainee branch its own component so the glass classes can leave `dashboard.astro` without touching the trainee journal.

**Contract**: Props: `mode` (`"trainer"` or `"unavailable"`), `email` (`string | undefined`), `serverError` (`string | null`), `trainerLinksLoaded` (`boolean`), `trainerLinks` (`TrainerLink[]`), `selectedLink` (`TrainerLink | null`), `trainerMeasurementsLoaded` (`boolean`), `entries` (`MeasurementWithDeltas[]`), `idPrefix` (`string`, default `""`). Outer and inner shell classes match `TraineeJournal.astro:19-21`. The inner panel is a `div`, not `Card`, and is not `text-center`. Heading classes match the journal heading (`text-2xl`, not the current `text-3xl`).

`mode === "trainer"`: heading text `Trainer`. Welcome line matches the journal (`text-muted-foreground`, email `font-semibold text-card-foreground`, copy `Welcome,` plus the email). When `serverError` is set, render `ServerError` with that string under the welcome. When `trainerLinksLoaded` is false, render `ServerError` with `Could not load trainees` and do not render the form or the list. When it is true, render the link form: `method="POST"` `action="/api/trainer-links"`, classes `mt-6 space-y-3`, optional hidden `trainee` input, `Label` text `Email` with `htmlFor={`${idPrefix}email`}`, `Input` with `id={`${idPrefix}email`}` `name="email"` `type="email"` `required`, and `Button` `type="submit"` text `Link trainee`. When `trainerLinks.length > 0`, render the email list (`mt-6 space-y-2 text-sm`). Each link href is `/dashboard?trainee=` plus the encoded id, `aria-current="page"` when it is the selected trainee. Unselected classes: `text-muted-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring`. Selected adds `font-semibold text-card-foreground`. When `selectedLink` is set and `trainerMeasurementsLoaded` is true, render `MeasurementList` or, when `entries.length === 0`, `No measurements yet` (`mt-6 text-sm text-muted-foreground`). When `selectedLink` is set and measurements did not load, render `ServerError` with `Could not load measurements`. When the loaded list is empty, render the form and nothing under it.

`mode === "unavailable"`: heading text `Dashboard`. Body sentence `Could not open your journal` (`text-muted-foreground`). Do not render welcome, the form, links, or measurements.

Both modes end with the Sign out form from `TraineeJournal.astro:37-41`: POST `/api/auth/signout`, `Button` `type="submit"` `variant="outline"`, text `Sign out`.

Do not add palette utilities, `bg-cosmic`, `backdrop-blur`, or arbitrary sizes in this file. Do not change `ServerError`, `Input`, `Label`, or `Button`.

#### 2. Dashboard branch

**File**: `src/pages/dashboard.astro`

**Intent**: Keep trainee rendering and the existing server loads, and send every other role through the new panel.

**Contract**: When `role === "trainee"`, keep the current `TraineeJournal` props and do not pass `idPrefix`. Otherwise render `TrainerPanel` with `mode` `"trainer"` when `role === "trainer"` and `"unavailable"` otherwise, plus `user?.email`, `serverError`, `trainerLinksLoaded`, `trainerLinks`, `selectedLink`, `trainerMeasurementsLoaded`, and `entries`. Do not render the glass wrapper. Remove the page's `MeasurementList` import. Leave the frontmatter loads (`ensureProfile`, `listTrainerLinks`, `selectTrainerPreview`, `listMeasurements`) unchanged. The page must not contain `bg-cosmic` or palette colour utilities.

#### 3. Remove the cosmic utility

**File**: `src/styles/global.css`

**Intent**: Delete the starter page background now that no view references it.

**Contract**: Remove `@utility bg-cosmic` and its gradient body. Do this only after `dashboard.astro` no longer uses the class. Leave `:root`, `.dark`, `@theme inline`, and the `body` role styles unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run check:home-tokens` passes
- `src/pages/dashboard.astro` and `src/components/trainer/TrainerPanel.astro` do not contain `bg-cosmic`, `backdrop-blur`, or Tailwind palette colour utilities
- `src/styles/global.css` no longer defines `@utility bg-cosmic`, and the `:root` and `.dark` colour variables are unchanged

#### Manual Verification:

- A signed-in trainer with a linked trainee sees the light card: welcome, Email field, Link trainee, the trainee link, the measurement list or "No measurements yet", and outline Sign out
- A trainer with zero linked trainees sees the link form and no empty-list sentence
- Submitting an unknown email while a trainee is selected shows ServerError "No trainee with that email", keeps the form, and stays on that trainee
- The trainee journal on `/dashboard` is unchanged

Load-failure and unresolved-role screens are built in this phase. They are checked on `/kitchen-sink/trainer` in Phase 2, because a healthy local stack has no way to open them.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: States and guard

### Overview

Put every trainer-panel state on one kitchen-sink page, and make the token check fail if glass literals return to this view.

### Changes Required:

#### 1. Trainer kitchen sink

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Give reviewers one page that shows the panel states, matching `/kitchen-sink/journal`.

**Contract**: Public review page, not linked from the product. Follow the journal sink chrome: `Layout` title `Kitchen sink — trainer`, page `bg-background text-foreground`, a `max-w-4xl` column, an `h1`, and a short intro that names `/dashboard`. Each state is a `section` with an `h2`.

Render `TrainerPanel` (no `client:load`) for these panels, each form panel with its own `idPrefix`:

- Default: `mode="trainer"`, links loaded, one selected link, one sample `MeasurementWithDeltas` entry, `serverError={null}`, `idPrefix=""`.
- Empty, zero links: links loaded, `trainerLinks={[]}`, `selectedLink={null}`, `entries={[]}`, `idPrefix="links-"`. No empty-list sentence.
- Empty, no measurements: links loaded, one selected link, `entries={[]}`, `trainerMeasurementsLoaded={true}`, `idPrefix="empty-"`. Shows `No measurements yet`.
- Error, query: same as Default plus `serverError="No trainee with that email"`, `idPrefix="error-query-"`.
- Error, trainees: `trainerLinksLoaded={false}`, form absent, message `Could not load trainees`.
- Error, measurements: one selected link, `trainerMeasurementsLoaded={false}`, message `Could not load measurements`, `idPrefix="error-measurements-"`.
- Unavailable: `mode="unavailable"`. Heading `Dashboard`, sentence `Could not open your journal`, Sign out.

Hover and Focus-visible sections are prose only, pointing at the Default panel. Hover: Link trainee uses `hover:bg-primary/90`, Sign out uses outline `hover:bg-accent`, trainee links use `hover:underline`, list rows are not controls. Focus-visible: tab the email field, Link trainee, the trainee link, and Sign out; the ring is `--ring`.

Disabled section is prose only: N/A because Link trainee is a full-page POST and this change adds no pending or disabled control. Loading section is prose only: N/A because the panel renders only after the server calls return. Do not add a client component for those two states. Sample link and sample entry can be local constants. Use a UUID-shaped `traineeId`. Do not import `JournalSinkStates`.

#### 2. Token check

**File**: `scripts/check-home-tokens.mjs`

**Intent**: Fail the existing check if this view grows palette literals again.

**Contract**: Append `src/components/trainer/TrainerPanel.astro`, `src/pages/kitchen-sink/trainer.astro`, and `src/pages/dashboard.astro` to `FILES`. Do not change `PATTERN`. The sink prose must not contain palette colour utilities or the substrings the pattern flags.

#### 3. Agent rule

**File**: `CLAUDE.md`

**Intent**: Tell the next agent where the trainer sink lives, next to the other sinks.

**Contract**: Under `### UI`, add the line `Trainer kitchen sink: `/kitchen-sink/trainer`.` immediately after the journal sink line. Do not edit the `10x-cli` generated block. Do not add a second UI rules file.

### Success Criteria:

#### Automated Verification:

- `src/pages/kitchen-sink/trainer.astro` renders TrainerPanel for the default panel, zero links, a selected trainee with no measurements, the query error, trainees load failure, measurements load failure, and the unavailable role
- `scripts/check-home-tokens.mjs` lists `src/components/trainer/TrainerPanel.astro`, `src/pages/kitchen-sink/trainer.astro`, and `src/pages/dashboard.astro`, and `npm run check:home-tokens` passes
- `CLAUDE.md` names `/kitchen-sink/trainer`
- `npm run lint` passes

#### Manual Verification:

- The sink marks Hover and Focus-visible as prose on the Default panel, and marks Disabled and Loading N/A because the link form is a full-page POST with no pending control and the panel renders only after the server calls return
- At a desktop width and one mobile width, the Default card shows the email field, Link trainee, a trainee link, a measurement row, and Sign out without the form overflowing horizontally
- Tabbing the Default panel moves through the email field, Link trainee, the trainee link, and Sign out, and each focus ring uses the shared ring token
- On `/kitchen-sink/trainer`, trainees load failure shows "Could not load trainees" and hides the form
- On `/kitchen-sink/trainer`, a selected trainee whose measurements fail to load shows "Could not load measurements" under the trainee links
- On `/kitchen-sink/trainer`, the unavailable panel shows heading "Dashboard", the sentence "Could not open your journal", and Sign out on the light card

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- This repo has no component unit-test runner for Astro views. Do not add one for this change.
- The automated gate is `npm run lint` and `npm run check:home-tokens`, plus the absence of `bg-cosmic` and palette utilities in the files named in the phase criteria.

### Integration Tests:

- No new API or database test. `npm run smoke` covers auth, not the trainer panel. Do not extend it unless a later change asks for that.

### Manual Testing Steps:

1. Sign in as a trainer who has a linked trainee. Confirm the light card, the selected link, the measurement preview, and Sign out. Submit an unknown email and confirm the error stays on that trainee.
2. Sign in as a trainer with no links. Confirm the form and the absence of an empty-list sentence.
3. Open `/kitchen-sink/trainer` and walk the sections, including keyboard focus on Default, at desktop and one mobile width. On that page, confirm trainees load failure, measurements load failure, and the unavailable role.
4. Sign in as a trainee and confirm the journal still matches `/kitchen-sink/journal`.

## Performance Considerations

The panel stays server-rendered. No new client island and no extra query. Preview and link latency stay whatever the current server loads already cost.

## Migration Notes

No schema change and no stored data change. `@utility bg-cosmic` is removed in Phase 1 only after `dashboard.astro` stops referencing it. It has no other consumer under `src/`.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-10, MS-04)
- Prior contract: `context/archive/2026-09-29-trainee-journal-ui/tokens.md`, `plan.md`, and research charges 4–5
- Journal shell: `src/components/journal/TraineeJournal.astro:19-41`
- Current trainer branch: `src/pages/dashboard.astro:81-161`
- Link redirect: `src/pages/api/trainer-links/index.ts:10-47`
- Journal sink: `src/pages/kitchen-sink/journal.astro`
- Token check: `scripts/check-home-tokens.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Trainer panel

#### Automated

- [ ] 1.1 `npm run lint` passes
- [ ] 1.2 `npm run check:home-tokens` passes
- [ ] 1.3 `src/pages/dashboard.astro` and `src/components/trainer/TrainerPanel.astro` do not contain `bg-cosmic`, `backdrop-blur`, or Tailwind palette colour utilities
- [ ] 1.4 `src/styles/global.css` no longer defines `@utility bg-cosmic`, and the `:root` and `.dark` colour variables are unchanged

#### Manual

- [ ] 1.5 A signed-in trainer with a linked trainee sees the light card: welcome, Email field, Link trainee, the trainee link, the measurement list or "No measurements yet", and outline Sign out
- [ ] 1.6 A trainer with zero linked trainees sees the link form and no empty-list sentence
- [ ] 1.7 Submitting an unknown email while a trainee is selected shows ServerError "No trainee with that email", keeps the form, and stays on that trainee
- [ ] 1.11 The trainee journal on `/dashboard` is unchanged

### Phase 2: States and guard

#### Automated

- [ ] 2.1 `src/pages/kitchen-sink/trainer.astro` renders TrainerPanel for the default panel, zero links, a selected trainee with no measurements, the query error, trainees load failure, measurements load failure, and the unavailable role
- [ ] 2.2 `scripts/check-home-tokens.mjs` lists `src/components/trainer/TrainerPanel.astro`, `src/pages/kitchen-sink/trainer.astro`, and `src/pages/dashboard.astro`, and `npm run check:home-tokens` passes
- [ ] 2.3 `CLAUDE.md` names `/kitchen-sink/trainer`
- [ ] 2.4 `npm run lint` passes

#### Manual

- [ ] 2.5 The sink marks Hover and Focus-visible as prose on the Default panel, and marks Disabled and Loading N/A because the link form is a full-page POST with no pending control and the panel renders only after the server calls return
- [ ] 2.6 At a desktop width and one mobile width, the Default card shows the email field, Link trainee, a trainee link, a measurement row, and Sign out without the form overflowing horizontally
- [ ] 2.7 Tabbing the Default panel moves through the email field, Link trainee, the trainee link, and Sign out, and each focus ring uses the shared ring token
- [ ] 2.8 On `/kitchen-sink/trainer`, trainees load failure shows "Could not load trainees" and hides the form
- [ ] 2.9 On `/kitchen-sink/trainer`, a selected trainee whose measurements fail to load shows "Could not load measurements" under the trainee links
- [ ] 2.10 On `/kitchen-sink/trainer`, the unavailable panel shows heading "Dashboard", the sentence "Could not open your journal", and Sign out on the light card
