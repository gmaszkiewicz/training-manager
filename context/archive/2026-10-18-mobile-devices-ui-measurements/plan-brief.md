# Measurements Screen on a Phone — Plan Brief

> Full plan: `context/changes/mobile-devices-ui-measurements/plan.md`

## What & Why

A trainee and a linked trainer should open `/measurements` on a phone and still read and enter every field, the difference versus the previous entry, and the trainer controls. The screen is one non-wrapping row whose card is about 1284px wide, and the page clips anything past the viewport, so Navel and the fields beyond it cannot be reached.

## Starting Point

The add form and each saved entry fix the date at `w-56` and each of the eight metrics at `w-28`. Loaded cards force a floor of about 1204px. The month toolbar, the note, and the trainer search already use the card width. The linked-trainee button sizes itself to the longest email. Playwright checks a signed-out redirect on desktop Chrome only.

## Desired End State

From 360px up to the wide cutoff, the date and eight metrics stack in one column, the calendar fits, and the trainer can search, link, and move between trainees. The difference stays under each value. At `calc(80rem + 4px + 15px)` (1299px) and wider, the current one-line row is back.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Narrow layout | Stack the date and eight metrics in one column | A 360px screen cannot show that row and keep the numbers readable |
| Breakpoint | Below `calc(80rem + 4px + 15px)` (1299px) | That is the saved-entry card (`80rem + 4px`) plus the 15px scrollbar gutter; Tailwind's `xl` step is 19px short |
| Floor | 360px, with `px-1` gutters | The calendar's 318px day grid then fits in a 327px content box after the 15px gutter, and day buttons stay 36px |
| Wide screens | Keep today's one-line row and column widths | The horizontal row stays whenever the viewport can hold it |
| Trainer email | Truncate inside the card | The control sizes itself to the longest email and would push the arrows off screen |
| Verification | One signed-in Playwright test in the existing Chrome project | It locks a clipped field at 360px and the one-line row at 1400px |

## Scope

**In scope:**

- The measurement form, each saved entry, both cards, the calendar popover, and the trainer search and linked-trainee control
- A named `measurement-row` breakpoint in the theme
- One Playwright spec for the 360px stack and the 1400px row
- The journal and trainer kitchen sinks, because they render the same components

**Out of scope:**

- A mobile app, measurement data, validation, and delta math
- The shared top bar, `Button`, `Input`, and auth screens
- A second Playwright project, and automated coverage of trainer controls, the open calendar, edit, and delete
- Viewports narrower than 360px

## Architecture / Approach

Default styles are the narrow stack. A theme breakpoint, `measurement-row` at `calc(80rem + 4px + 15px)`, restores today's `flex-nowrap` row and the wide card floor. The form and the saved list share those classes, so the trainer preview follows the same cutoff. Long emails are constrained on the trainer controls themselves. The page's horizontal clip stays; the card simply stops being wider than the viewport.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Narrow layout | Stacked fields, a 360px calendar, and trainer controls inside the card; the wide row unchanged | The calendar has 9px to spare at 360px after the scrollbar gutter, and the email sizer can still widen the card if it stays unconstrained |
| 2. Playwright lock | A signed-in test at 360×800 and at 1400×900 | The end-to-end user must be a trainee, or the form is not on the page |

**Prerequisites:** S-28, S-29, and S-30 are done. The end-to-end job already signs in a throwaway trainee.
**Estimated effort:** about two sessions, one per phase.

## Open Risks & Assumptions

- At 360px the content box is 327px and the calendar is 318px. Extra horizontal padding, a scrollbar gutter wider than 15px, or a day button wider than `min-w-9` clips the grid.
- The wide card floor `min-w-[calc(75rem+4px)]` stays, even though it was computed for a narrower date column. `w-max` still grows the card to the real row.
- The Playwright spec does not sign in a trainer. Trainer search, the open calendar, edit, and delete are a manual check.
- Viewports under 360px are outside this plan.

## Success Criteria (Summary)

- At 360px a trainee can read and type every field, open the calendar, and see the difference under each value, with nothing clipped.
- At 1299px or wider the date and eight metrics sit on one row, as they do today.
- A trainer can search, link, and move between trainees at 360px, and `npx playwright test` fails if a field is clipped at 360px or the wide metrics leave one row.
