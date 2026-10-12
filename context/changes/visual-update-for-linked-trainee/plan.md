# Linked trainee field Implementation Plan

## Overview

Replace the wrapping row of trainee emails under `Body measurements` with a centered field that matches the month control above saved entries. The closed field shows the selected email. Arrows are always on screen and step to the previous or next email in the list the panel already receives. More than six emails make the open list scroll.

## Current State Analysis

On the trainer branch of `/measurements`, `TrainerPanel.astro` renders `Body measurements` only when `trainerLinks.length > 0`. Under that heading, a `ul` with `flex flex-wrap` shows every email as an anchor to `/measurements?trainee=<traineeId>`. The selected anchor uses `aria-current="page"`. `selectTrainerPreview` sorts those links with `email.localeCompare` and chooses the selected link: a matching `?trainee=` wins, otherwise the greatest `linkedAt`, with the lower `traineeId` breaking a tie.

The month control to copy lives inline in `MeasurementBrowser.tsx`. Outline icon buttons sit on both sides of a center button. The center button toggles a floating list, sizes itself from the longest label, and centers that label. `dates.length > 6` adds `max-h-68 overflow-y-auto`. Escape and a pointer down outside the group close the list. The month group itself stays left-aligned in the journal toolbar.

The trainer switch is a full document navigation. The month switch is client state inside a `client:load` island. The email row has no open, dismiss, or arrow behavior. The kitchen sink still describes two trainees in one row, `hover:underline`, and no disabled control.

## Desired End State

A trainer with at least one linked trainee sees one email control centered under `Body measurements`. The email text is centered in the middle button, and that button is as wide as the longest linked email. Left and right arrows are always visible. For `ada@`, `bea@`, `cyd@` in that array order, with `bea@` selected, left opens `ada@` and right opens `cyd@`. On `ada@` the left arrow is disabled. On `cyd@` the right arrow is disabled. One trainee disables both arrows.

Clicking the email opens a floating list of every linked email, in the same array order. The current email is marked `aria-current="page"`. A second click, Escape, or a pointer down outside the control closes the list. Six emails show the list at full height. Seven or more add the month list's `max-h-68` vertical scroll, and opening the list scrolls the current email toward the vertical center.

Enabled arrows and list rows are links to `/measurements?trainee=<traineeId>`. The link form, the heading rule, `selectTrainerPreview`, and the read-only journal stay as they are. Zero links, a failed trainee load, and the unavailable panel still omit the field.

### Key Discoveries:

- The email row is `src/components/trainer/TrainerPanel.astro:70-91`. The month group to copy is `src/components/measurements/MeasurementBrowser.tsx:528-604`, with the scroll flag at `:415` and the scroll-into-view effect at `:441-452`.
- `selectTrainerPreview` (`src/lib/trainer-preview.ts:11-35`) already returns A–Z links. The kitchen sink passes its own array and does not call that function.
- `Button` supports `asChild` (`src/components/ui/button.tsx:35-47`), so an enabled step can be an anchor with outline or default button classes. There is no Popover or ScrollArea in `src/components/ui`.
- `scripts/check-home-tokens.mjs` scans `TrainerPanel.astro` and the trainer kitchen sink. A new component file is checked only after its path is added to `FILES`. `max-h-68` does not match the arbitrary-size pattern.
- Smoke case `trainer default shows the later email` (`scripts/smoke.mjs:607-611`) expects the selected trainee's email in the document body. `client:load` server-renders the closed button; `client:only` would drop that email.

## What We're NOT Doing

- Extracting a shared picker from `MeasurementBrowser`. The month control also writes a preference and loads a page.
- Changing who is selected, the A–Z sort, the link form, the `Body measurements` heading rule, or the read-only journal.
- Hiding the arrows when there are six or fewer trainees.
- Stepping by `linkedAt`, or using the arrows to scroll the list.
- Left-aligning the control on the card.
- Arrow-key movement inside the open list.
- A new Playwright spec. No current spec under `e2e/` covers this panel.
- A schema change or a smoke-assertion edit.

## Implementation Approach

Add a pure neighbor function beside `selectTrainerPreview`. It reads the array it is given and returns the previous and next items. The page keeps sorting. The kitchen sink keeps the array it already passes.

Then add a small React island, `LinkedTraineeField`, and render it with `client:load` from `TrainerPanel` in place of the email `ul`. The island copies the month control's markup, dismiss behavior, width trick, and scroll class. Enabled steps are real links. Disabled ends are disabled buttons. The Astro wrapper centers the content-sized control under the heading.

Update the trainer kitchen sink in the same phase so its Default, hover, focus, and disabled notes describe the field, and add one seven-email state for the scrollbar.

## Critical Implementation Details

### User experience spec

The centered group has to be content-sized and above the month toolbar (`relative z-20 w-max` on the island root, `flex justify-center` on the Astro wrapper). The month wrapper is `relative z-10` (`MeasurementBrowser.tsx:529`) and follows the island, so a root without `z-20` lets that toolbar paint over the first list row. The date popover uses the same `relative z-20` (`MeasurementForm.tsx:561`). A `w-full` group stretches to the card, which is at least `75rem` once measurements load (`TrainerPanel.astro:52`), and then centering has nothing to move. The floating list is `w-full` of that content-sized root, so it is as wide as both arrows plus the longest email. List rows are anchors with `aria-current="page"`. The scroll-into-view query is `[aria-current='page']`. The month list's `[aria-pressed='true']` query does not apply to these links.

### State sequencing

`adjacentTrainerLinks` uses array index only. It does not sort and it does not read `linkedAt`. Production passes the array from `selectTrainerPreview`. The kitchen sink's Default array stays `[sampleLink, secondLink]`, so the disabled left arrow means "first in this array."

## Phase 1: Adjacent trainee rule

### Overview

Lock the previous and next trainee as the neighbors in the array the panel already receives, and cover that rule with unit tests before any markup changes.

### Changes Required:

#### 1. Neighbor helper

**File**: `src/lib/trainer-preview.ts`

**Intent**: Give the island one place to ask which link sits immediately before and after the selected id, so the arrows cannot invent a different order than the list.

**Contract**: Export this function. It does not mutate `links`. It finds the first index whose `traineeId` equals the argument. `previous` is the item at that index minus one when the index is greater than zero, and `null` otherwise. `next` is the item at that index plus one when the index exists and is not the last index, and `null` otherwise. An id that is absent, including an empty string, returns both `null`. A one-item array returns both `null`.

```ts
export function adjacentTrainerLinks(
  links: readonly TrainerLink[],
  traineeId: string,
): { previous: TrainerLink | null; next: TrainerLink | null };
```

#### 2. Unit tests

**File**: `src/lib/trainer-preview.test.ts`

**Intent**: Record the agreed `ada@` / `bea@` / `cyd@` cases so a later change to selection or sort cannot silently retarget the arrows.

**Contract**: Add cases, and leave the existing `selectTrainerPreview` cases as they are. Use three links in this array order: `ada@example.com`, `bea@example.com`, `cyd@example.com`. `bea@` returns `ada@` as previous and `cyd@` as next. `ada@` returns `previous: null`. `cyd@` returns `next: null`. A one-link array returns both `null`. An id that is not in the array returns both `null`. Give the links distinct `linkedAt` values and assert the helper still follows array order when a later `linkedAt` sits earlier in the array.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, and `src/lib/trainer-preview.test.ts` covers `ada@example.com`, `bea@example.com`, `cyd@example.com` in that array order: `bea@` returns `ada@` then `cyd@`; `ada@` has no previous; `cyd@` has no next; one link returns both null; an absent id returns both null; a later `linkedAt` earlier in the array does not change the neighbor
- `npm run lint` passes

**Implementation Note**: Phase 1 has no manual gate. After both automated checks pass, continue to Phase 2.

---

## Phase 2: Centered linked-trainee field

### Overview

Replace the wrapping email row with the centered field, point the home-token scan at the new file, and update the trainer kitchen sink so the new states can be reviewed.

### Changes Required:

#### 1. Linked trainee field

**File**: `src/components/trainer/LinkedTraineeField.tsx`

**Intent**: Reproduce the month control for trainee emails, with navigation instead of month state, so open, dismiss, arrow, and scroll behavior stay recognizable.

**Contract**: Props are `links: readonly TrainerLink[]` and `selectedTraineeId: string`. If that id is not in `links`, render nothing. Otherwise render a `client` component whose root is `relative z-20 w-max`. Inside it, a `role="group"` with `aria-label="Linked trainees"` and `flex items-center gap-2` holds three controls, using `Button`, `ChevronLeft`, and `ChevronRight` the way `MeasurementBrowser.tsx:531-577` does:

- Previous: `aria-label="Previous trainee"`. When `adjacentTrainerLinks` returns `previous: null`, a disabled `Button` `type="button"` `variant="outline"` `size="icon"`. Otherwise `Button` `asChild` wrapping an anchor to `/measurements?trainee=` plus `encodeURIComponent(previous.traineeId)`.
- Center: `Button` `type="button"` `variant="outline"` `className="grid"`, `aria-expanded` following the open flag, `aria-label` equal to the selected email. Click toggles the list. An invisible grid of every `link.email` sets the width, matching `MeasurementBrowser.tsx:555-561`. The visible span is `text-center` and shows the selected email.
- Next: the same pattern as Previous, with `aria-label="Next trainee"` and the `next` link.

The open list uses the month list classes at `MeasurementBrowser.tsx:579-585`: `bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md`. When `links.length > 6`, also add `max-h-68 overflow-x-hidden overflow-y-auto`. Each row is `Button` `asChild`, `variant="default"` for the selected id and `variant="outline"` otherwise, wrapping an anchor to that trainee. The selected anchor sets `aria-current="page"`. Do not set `aria-pressed`.

While the list is open, Escape and a document `pointerdown` outside the root set it closed, matching `MeasurementBrowser.tsx:417-438`. When the list is open and `links.length > 6`, set `scrollTop` so the `[aria-current='page']` element is centered, using the same formula as `MeasurementBrowser.tsx:450`. Mount this island with `client:load`.

#### 2. Panel wiring

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Put the field in the centered slot under the heading and remove the wrapping email row.

**Contract**: Keep the `h2` (`Body measurements`, `text-center`) on `trainerLinks.length > 0`. Replace the `div.min-w-0` / `ul` block at `:73-92` with a `flex justify-center` wrapper. Inside it, when `selectedLink` is non-null, render `LinkedTraineeField` with `client:load`, `links={trainerLinks}`, and `selectedTraineeId={selectedLink.traineeId}`. Leave the link form, the hidden `trainee` input, the measurement browser, and both `ServerError` branches unchanged.

#### 3. Token scan

**File**: `scripts/check-home-tokens.mjs`

**Intent**: Keep the new island under the same literal-color and arbitrary-size gate as `TrainerPanel.astro`.

**Contract**: Add `src/components/trainer/LinkedTraineeField.tsx` to `FILES`. Use role tokens and shared `Button` variants in that file. `max-h-68` stays, because the month list already uses it and the scanner does not flag it.

#### 4. Kitchen sink

**File**: `src/pages/kitchen-sink/trainer.astro`

**Intent**: Make the review surface show the closed field, a disabled pair of arrows, and a list long enough to scroll.

**Contract**:

- Default keeps `trainerLinks={[sampleLink, secondLink]}` and `selectedLink={sampleLink}`. Update the section copy: two trainees in a centered email field, the first array item selected, the left arrow disabled, the right arrow linking to the second trainee. Drop "two trainees in one row."
- Hover: the email button and list rows use `Button` outline and default hover. Drop the `hover:underline` claim for trainee links. `Link trainee` stays `hover:bg-primary/90`.
- Focus-visible: tab reaches the email button and an enabled arrow. The ring is the shared `--ring` from `Button`. A disabled arrow is not in the tab order.
- Disabled: point at the existing one-trainee panel in "Empty, no measurements." Both arrows are disabled. Replace the sentence that says this change adds no disabled control.
- Add a "Long list" section with seven links in array order `trainee-a@example.com` through `trainee-g@example.com`, `selectedLink` equal to `trainee-d@example.com`, `idPrefix="long-list-"`, and the same sample entry and `today="2026-09-15"` as Default so the wide card renders. Copy states that the open list scrolls, the current row moves toward the vertical center, left links to `trainee-c`, and right links to `trainee-e`.
- Leave zero links, trainee-load error, measurements error, and unavailable sections in place. Their rendered panels stay as they are.

### Success Criteria:

#### Automated Verification:

- `npm run check:home-tokens` passes with `src/components/trainer/LinkedTraineeField.tsx` listed in `scripts/check-home-tokens.mjs`
- `npm test` passes
- `npm run lint` passes
- `npx astro check` passes

#### Manual Verification:

- Kitchen sink Default: the control is centered under `Body measurements`, the email text is centered in the middle button, the left arrow is disabled, the right arrow's href is the second trainee's `/measurements?trainee=` URL, the open list shows both emails with no scrollbar, and a second click, Escape, or a pointer down outside closes the list
- A one-trainee panel: both arrows are disabled, and the open list shows that one email with no scrollbar
- Kitchen sink Long list, with `trainee-d@example.com` selected: the open list has a vertical scrollbar, that row sits toward the vertical center, left links to `trainee-c` and right links to `trainee-e`, and the arrows disable only on `trainee-a` and `trainee-g`
- Zero links, "Could not load trainees", and the unavailable panel omit the field
- The link form and the `MeasurementBrowser` month field are unchanged, and the closed field includes the selected email in the initial HTML

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- `adjacentTrainerLinks` for the middle of `ada@` / `bea@` / `cyd@`, both ends, a single link, an absent id, and a `linkedAt` that disagrees with array order.
- Existing `selectTrainerPreview` cases stay green so the default selected trainee does not move.

### Integration Tests:

- No new Playwright spec.
- Existing smoke stays valid because the closed `client:load` button still contains the selected email (`scripts/smoke.mjs` case `trainer default shows the later email`). Other emails appear after the list opens and do not need to be in that response.

### Manual Testing Steps:

1. Open `/kitchen-sink/trainer`. On Default, confirm the centered field, the disabled left arrow, the right-arrow href, and that the list opens and closes by click, Escape, and an outside pointer down.
2. On "Empty, no measurements", confirm both arrows are disabled and the single-email list does not scroll.
3. On Long list, open the list and confirm the scrollbar, the centered current row, and the `trainee-c` / `trainee-e` hrefs. Check the first and last emails disable the matching arrow.
4. Confirm zero links, the trainee-load error, and unavailable still omit the field, and that the month control above a sample entry still steps months.

## Performance Considerations

The open list renders every linked email, the same way the month list renders every month. No virtualization. A trainer's link count is the size of that list.

## Migration Notes

No data migration. The change is presentation on top of the current trainer links and `?trainee=` route.

## References

- Related research: `context/changes/visual-update-for-linked-trainee/research.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/92
- Month control: `src/components/measurements/MeasurementBrowser.tsx:415-452`, `:528-604`
- Current email row: `src/components/trainer/TrainerPanel.astro:70-91`
- Selection and sort: `src/lib/trainer-preview.ts:11-35`
- Token gate: `scripts/check-home-tokens.mjs:29-39`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Adjacent trainee rule

#### Automated

- [x] 1.1 `npm test` passes, and `src/lib/trainer-preview.test.ts` covers `ada@example.com`, `bea@example.com`, `cyd@example.com` in that array order: `bea@` returns `ada@` then `cyd@`; `ada@` has no previous; `cyd@` has no next; one link returns both null; an absent id returns both null; a later `linkedAt` earlier in the array does not change the neighbor — a48c4c5
- [x] 1.2 `npm run lint` passes — a48c4c5

### Phase 2: Centered linked-trainee field

#### Automated

- [x] 2.1 `npm run check:home-tokens` passes with `src/components/trainer/LinkedTraineeField.tsx` listed in `scripts/check-home-tokens.mjs` — 28967bc
- [x] 2.2 `npm test` passes — 28967bc
- [x] 2.3 `npm run lint` passes — 28967bc
- [x] 2.4 `npx astro check` passes — 28967bc

#### Manual

- [x] 2.5 Kitchen sink Default: the control is centered under `Body measurements`, the email text is centered in the middle button, the left arrow is disabled, the right arrow's href is the second trainee's `/measurements?trainee=` URL, the open list shows both emails with no scrollbar, and a second click, Escape, or a pointer down outside closes the list — 28967bc
- [x] 2.6 A one-trainee panel: both arrows are disabled, and the open list shows that one email with no scrollbar — 28967bc
- [x] 2.7 Kitchen sink Long list, with `trainee-d@example.com` selected: the open list has a vertical scrollbar, that row sits toward the vertical center, left links to `trainee-c` and right links to `trainee-e`, and the arrows disable only on `trainee-a` and `trainee-g` — 28967bc
- [x] 2.8 Zero links, "Could not load trainees", and the unavailable panel omit the field — 28967bc
- [x] 2.9 The link form and the `MeasurementBrowser` month field are unchanged, and the closed field includes the selected email in the initial HTML — 28967bc
