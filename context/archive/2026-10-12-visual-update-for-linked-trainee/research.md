---
date: 2026-10-12T12:09:23+02:00
researcher: gmaszkiewicz
git_commit: cb1fa76f85cd4e7f01552605342bf3e2309af2b6
branch: main
repository: training-manager
topic: "Style the linked trainee list like the month field"
tags: [research, codebase, trainer-panel, measurement-browser]
status: complete
last_updated: 2026-10-12
last_updated_by: gmaszkiewicz
---

# Research: Style the linked trainee list like the month field

**Date**: 2026-10-12T12:09:23+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: cb1fa76f85cd4e7f01552605342bf3e2309af2b6
**Branch**: main
**Repository**: training-manager

## Research Question

How does the trainer linked-trainee list on `/measurements` work today, how does the month field above saved entries work, and which existing contracts does a visual match have to keep?

## Summary

On the trainer branch of `/measurements`, a loaded non-empty link list is a wrapping row of email anchors directly under the centered `Body measurements` heading. Each anchor navigates to `/measurements?trainee=<traineeId>`. Display order is email A–Z. With no matching `?trainee=` value, the selected link is the greatest `linkedAt`, with a lower `traineeId` winning a tie (`src/lib/trainer-preview.ts:11-35`, `src/components/trainer/TrainerPanel.astro:70-91`).

The month field to copy is inline in `MeasurementBrowser`. In that JSX the label text is centered inside the middle button, chevron buttons sit on both sides, a click toggles a floating list, and `dates.length > 6` adds `max-h-68 overflow-y-auto`. The chevrons step to the nearest earlier or later month string and are disabled when that neighbor is null (`src/components/measurements/MeasurementBrowser.tsx:176-193`, `:415`, `:529-604`). That group is the left item of a toolbar; this JSX does not center the group in the card.

Issue 92 asks to replace the wrapping email row with a centered email field under `Body measurements`, matching that month field. The link form, `?trainee=` selection, A–Z display order, the absent heading when there are zero links, and the read-only browser stay in the current code and in the archived contracts cited below. Two readings are still open: whether the chevrons stay on screen when the list has six or fewer emails, and whether “centered” means the label inside the button, the whole control under the heading, or both.

## Detailed Findings

### Linked-trainee list today

`/measurements` renders `TrainerPanel` for a non-trainee role (`src/pages/measurements.astro:114-120`, `:167-183`). There is no second trainer measurements route in that page.

When `mode === "trainer"` and `trainerLinksLoaded` is true, the card shows the link form. The heading, email list, and browser render when `trainerLinks.length > 0`, and that block is absent when the length is 0 (`src/components/trainer/TrainerPanel.astro:61-114`):

- The `h1` is `Find trainee by email` (`:55-56`).
- The form is a native POST to `/api/trainer-links`. When `selectedLink` is set, it includes a hidden `trainee` input. The email control is an `Input` with `aria-label="Email"`. The submit button text is `Link trainee` and `className="w-full"` (`:63-68`).
- The `h2` text is `Body measurements`, with `text-center` (`:72`).
- The list is a `ul` with `flex flex-wrap items-start gap-4`. This `ul` has no `justify-center` (`:73-74`).
- Each item is an `<a href={/measurements?trainee=${encodeURIComponent(link.traineeId)}}>` whose text is `link.email`. The selected id gets `aria-current="page"`, `font-semibold`, and `text-card-foreground`. Other links use `text-muted-foreground`. Shared link classes include `whitespace-nowrap`, `hover:underline`, and `focus-visible:ring-ring` (`:77-88`).
- `MeasurementBrowser` with `readOnly={true}` and `subjectTraineeId={selectedLink.traineeId}` renders under that list when measurements loaded (`:93-108`).

`selectTrainerPreview` copies the links and sorts with `a.email.localeCompare(b.email)` (`src/lib/trainer-preview.ts:11`). An empty array returns `selected: null` (`:13-15`). A `traineeId` that matches a link selects that link (`:17-21`). Otherwise the selected link is the one with the greatest `linkedAt`; equal `linkedAt` keeps the lower `traineeId` (`:24-33`). The page passes `Astro.url` `trainee` into that function and does not redirect an unknown id (`src/pages/measurements.astro:119-121`).

Zero loaded links omit the `h2`, the list, and the browser (`TrainerPanel.astro:70`). `trainerLinksLoaded === false` shows `Could not load trainees` and omits the form (`:116-117`). A selected link whose measurements fail to load keeps the email list and shows `Could not load measurements` (`:109-110`).

The kitchen-sink Default state passes two links and describes them as “two trainees in one row” (`src/pages/kitchen-sink/trainer.astro:7-18`, `:63-71`). This file has no state with more than two links. Its hover note says trainee links use `hover:underline` (`:86`).

Smoke, on a trainer account before any link, expects body text `Find trainee by email` and forbids `No measurements yet` (`scripts/smoke.mjs:431-433`). After a successful link it expects a redirect to `/measurements?trainee=${traineeId}` (`:441-443`). A later case requests `/measurements?trainee=` for a trainee this trainer has not linked and expects a linked trainee’s note while forbidding the unlinked trainee’s note (`:642-644`). No Playwright spec under `e2e/` matches `Link trainee` or `measurements?trainee`.

### Month field that is the motif

The control is not a separate component. `MeasurementBrowser.tsx` imports `Button` from `@/components/ui/button` and `ChevronLeft` / `ChevronRight` from `lucide-react` (`:2-3`). It does not import a popover, select, or scroll-area module.

Structure in the returned toolbar (`:528-604`):

- Parent row: `mt-6 flex w-full flex-wrap items-start gap-4` (`:528`). The month group is the first child. The page-size group uses `ml-auto` (`:606`). This month group has no `justify-center` and no `mx-auto`.
- The group is `role="group"` with `aria-label="Month"` (`:530`).
- Left and right controls are `Button` `variant="outline"` `size="icon"`, labelled `Previous month` and `Next month` (`:531-543`, `:564-577`).
- The middle control is `Button` `variant="outline"` `className="grid"`. Its visible span uses `text-center` (`:545-562`). Invisible copies of `monthButtonLabels(dates, month)` set the button width to the longest of those labels (`:65-68`, `:555-561`). `aria-expanded` follows `monthListOpen`. `aria-label` is `monthLabel(month)` (`:549-550`).
- Clicking the middle button toggles `monthListOpen` (`:551-553`).
- The open list is an absolutely positioned `div`: `bg-popover text-popover-foreground border-border absolute top-full left-0 z-10 mt-2 flex w-full flex-col gap-2 rounded-md border p-2 shadow-md` (`:579-585`). The callback is `dates.map` with no `.slice` or `.filter` on that array (`:587`). The entry equal to `month` uses `variant="default"` and `aria-pressed` (`:587-601`).

`monthListScrolls` is `dates.length > 6` (`:415`). That condition adds `max-h-68 overflow-x-hidden overflow-y-auto` (`:584`). Six or fewer dates leave those classes off. The map has no `.slice`. When the list opens and `monthListScrolls` is true, an effect sets `scrollTop` so the `[aria-pressed='true']` element is centered in the container (`:441-452`). This research did not measure the computed height of `max-h-68` or count visible rows in a browser. `global.css` `@theme inline` does not define that utility (`src/styles/global.css:75-113`).

`earlierMonth` returns the greatest string in `knownMonths` that is `< current`, or null (`:176-183`). `laterMonth` returns the least string that is `> current`, or null (`:186-193`). The icon buttons call `chooseMonth` with that neighbor and set `disabled` when it is null (`:536-540`, `:569-573`). String order is not the same thing as dropdown index: `viewOf` builds `dates` newest-first (`src/lib/measurement-page.ts:99-112`), while the arrows compare the `YYYY-MM` strings.

While `monthListOpen` is true, Escape and a document `pointerdown` outside `monthFieldRef` set it false (`MeasurementBrowser.tsx:417-438`). This effect does not handle ArrowLeft or ArrowRight.

`chooseMonth` closes the list, returns immediately when the chosen value is the current month or is absent from `dates`, writes the month preference when both account and subject ids parse, and otherwise loads page 1 (`:462-482`). On the trainer panel the browser is paged: the page passes `dates`, `page`, and `pageCount` (`TrainerPanel.astro:102-106`), and `paged` is those three props being present (`MeasurementBrowser.tsx:282`). In that mode the list reads `remoteDates`, initially `datesProp` (`:297`, `:396-397`).

The archived calendar plan states the same control: previous/next arrows over months in `dates`, disabled at the ends, a floating list, scroll when there are more than six months, close on second click, outside click, and Escape (`context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan.md:26-28`). That plan also says the scrolling list “shows six rows”. The current class is `max-h-68`; the row count was not remeasured here, so that sentence stays a plan claim rather than a measured result.

### Tokens and shared components

The month classes resolve through the semantic colors and radius in `src/styles/global.css`: `--popover` and `--popover-foreground` (`:12-13`, dark `:46-47`), `--border` (`:23`, dark `:57`), `--primary` for the pressed list button via `Button` `default` (`button.tsx:12`, `global.css:14-15`), and `--radius` / `--radius-md` (`global.css:7`, `:79`). Outline buttons use `--background`, `--border`, `--accent`, and `--input` through `button.tsx:16`. Focus uses `--ring` (`global.css:25`, `button.tsx:8`).

`src/components/ui` contains `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, and `LibBadge.astro`. That directory listing has no Popover, Select, DropdownMenu, or ScrollArea file. The trainer email field uses `Input`; the month center control uses `Button`.

`scripts/check-home-tokens.mjs` scans `TrainerPanel.astro`, `MeasurementBrowser.tsx`, and `src/pages/kitchen-sink/trainer.astro` (`:29-33`). Its pattern rejects literal colors and arbitrary `-[…px]` / `-[…rem]` utilities (`:38-39`). `max-h-68` does not match that pattern. A new component file is outside `FILES` until that list includes it. `TrainerPanel.astro` already uses `min-w-[calc(75rem+4px)]` (`:52`); the pattern requires a digit immediately after `[`, so this existing class does not match.

### What a match changes, and what it leaves in place

Issue 92 outcome: “A trainer sees linked trainees as a centered email field under Body measurements, matching the month field above saved entries.” Its risk sentence is that replacing the wrapping links with a picker can hide a trainee or open the wrong journal. `change.md` adds the Polish note: a centered email field, click to expand, and, when there are more than six protégés, a scrollbar and left/right arrows, under `Body measurements`.

| Contract | Where it stands for this change |
| --- | --- |
| Link by email, preview the linked trainee’s entries, no invite | PRD FR-007 and FR-008 (`context/foundation/prd.md:81-84`). Unchanged by issue 92. |
| POST `/api/trainer-links`, hidden `trainee`, full-width `Link trainee`, `aria-label="Email"`, `h1` `Find trainee by email`, `h2` when `trainerLinks.length > 0` | Archived copy plan (`context/archive/2026-09-30-measurement-copy-polish/plan.md:123`) and current markup (`TrainerPanel.astro:55-72`). The new field sits under that `h2`; the notes do not move the form. |
| A–Z emails, `?trainee=` match, otherwise greatest `linkedAt` | `trainer-preview.ts:11-35`. Issue 92 does not replace this function. |
| Unknown `?trainee=` must not show that other trainee’s journal | Smoke case at `scripts/smoke.mjs:642-644`. |
| Emails beside each other, wrapping when they do not fit one line, with no horizontal scrollbar on that list | Shipped in `context/archive/2026-09-30-horizontal-measurements/plan.md:17` and implemented as `flex flex-wrap` (`TrainerPanel.astro:74`). Issue 92 replaces that presentation with a picker. |
| Same read-only `MeasurementBrowser`, including its Month field, below the trainee control | Current order (`TrainerPanel.astro:72-108`) and the calendar plan (`plan.md:32`). |

The month motif and the Polish “more than six” sentence agree on a vertical scrollbar past six items. They do not say the chevrons page the open list horizontally. In this month JSX both chevron buttons sit outside the `monthListScrolls` condition (`:531-577`); the scrollbar classes are added when that flag is true (`:584`).

## Code References

- `src/components/trainer/TrainerPanel.astro:63-91` — link form, `Body measurements`, wrapping email anchors
- `src/lib/trainer-preview.ts:11-35` — A–Z sort and selection
- `src/pages/measurements.astro:114-133` — trainer links and preview load
- `src/components/measurements/MeasurementBrowser.tsx:176-193` — earlier/later month strings
- `src/components/measurements/MeasurementBrowser.tsx:415-452` — six-item scroll flag and scroll-into-view
- `src/components/measurements/MeasurementBrowser.tsx:528-604` — month group, toggle, floating list
- `src/components/ui/button.tsx:7-33` — outline, default, and icon sizes
- `src/styles/global.css:6-113` — role colors and radius used by those classes
- `src/pages/kitchen-sink/trainer.astro:58-88` — two-link Default state and `hover:underline` note
- `scripts/smoke.mjs:431-443` — trainer heading and link redirect
- `scripts/smoke.mjs:642-644` — unknown `?trainee=` does not reveal the unlinked journal
- `scripts/check-home-tokens.mjs:29-39` — files and patterns a restyle must keep clean

## Architecture Insights

The trainee switch is a full document navigation. The month switch is client state inside the `client:load` island, plus a preference write and a paged fetch. Copying open, Escape, and outside-click behavior needs client state the current `<a>` list does not have. Selection can still be a navigation to `?trainee=` so `selectTrainerPreview` remains the selector.

The month list width follows the group (`w-full` on the absolute panel, which includes both icon buttons). The center button width follows the longest label in `dates`, not the current label alone (`monthButtonLabels`). An email field copied from that pattern would size from the linked emails the same way.

There is no shared picker in `src/components/ui` to import. The month markup is the reference implementation.

## Historical Context (from prior changes)

- `context/archive/2026-09-30-horizontal-measurements/plan.md:17` — supported as the shipped presentation: emails sit beside each other, wrap, and that list has no horizontal scrollbar. Issue 92 replaces that presentation. The plan’s other rule, that a selected trainee still opens that trainee’s measurements, is still the live `?trainee=` behavior.
- `context/archive/2026-09-30-measurement-copy-polish/plan.md:123` — supported by current `TrainerPanel.astro:55-72`: finder `h1`, `Body measurements` `h2` when `trainerLinks.length > 0`, full-width submit, `aria-label="Email"`.
- `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan.md:26-28` — supported for arrows, disabled ends, floating list, threshold of more than six, and dismiss behavior, because those match `MeasurementBrowser.tsx` as cited above. The phrase “shows six rows” is partial: the code applies `max-h-68`, and this research did not measure the row count.
- `context/archive/2026-09-30-trainer-panel-ui/plan.md` — partial if read as current UI. Later copy and top-bar work replaced its Welcome heading, on-panel sign-out, and `/dashboard?trainee=` route. The live heading and route are the ones in `TrainerPanel.astro` and `measurement-copy-polish/plan.md:123`.

`context/foundation/roadmap.md` has no slice whose Change ID is `visual-update-for-linked-trainee`. S-12 in that file is the horizontal-measurements outcome, not this picker.

## Related Research

A search of the 12 `research.md` files under `context/archive/` for `linked trainee` and `flex-wrap` returned no matches. `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/research.md` does not contain `month list`, `dates.length > 6`, or `chevron`. The month-field contract used above is in that change’s `plan.md`, not its research note. No other `research.md` under `context/changes/` exists for this picker.

## Open Questions

1. Chevron visibility. In `MeasurementBrowser.tsx:531-577` both arrow buttons render with no `dates.length` check; each is `disabled` when its neighbor is null. The Polish sentence in `change.md` places “strzałki lewo prawo” in the clause about more than six protégés. Issue 92 says “matching the month field” and does not mention a count. The plan has to pick one reading.
2. What the left and right arrows step through. Month arrows use string order of `YYYY-MM`, not the newest-first dropdown index (`MeasurementBrowser.tsx:176-193`, `measurement-page.ts:111`). Trainee display order is email `localeCompare` (`trainer-preview.ts:11`). `change.md` does not name the trainee neighbor rule.
3. Which box is centered. The month label is `text-center` inside the middle button (`MeasurementBrowser.tsx:562`). The month group itself is the left child of the toolbar (`:528-529`). Issue 92 and `change.md` place the email field under the centered `Body measurements` heading. Centering the whole arrow group in the card is not a class on the month control.
4. Rendered row count at `max-h-68`. The archived plan says six rows (`calendar-upgrade-and-visual-fixes/plan.md:28`). This research did not measure it. Copying the class reproduces the month field without settling that count.
