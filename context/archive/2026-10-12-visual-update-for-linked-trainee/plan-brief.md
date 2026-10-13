# Linked trainee field — Plan Brief

> Full plan: `context/changes/visual-update-for-linked-trainee/plan.md`
> Research: `context/changes/visual-update-for-linked-trainee/research.md`

## What & Why

A trainer's linked trainees are a wrapping row of emails under `Body measurements`. This change turns that row into one centered email field, matching the month control above saved entries: click the email to open the list, use the arrows to move through it, and scroll when more than six trainees are linked.

## Starting Point

`TrainerPanel.astro` renders every linked email as an anchor to `/measurements?trainee=`. `selectTrainerPreview` sorts those emails A–Z and picks the selected trainee. The month control in `MeasurementBrowser.tsx` already has the arrows, the toggling list, the longest-label width, and `max-h-68` past six items. The email row has none of that, and the month group stays left-aligned in the journal toolbar.

## Desired End State

The closed field shows the selected email, centered in its button and centered under the heading. Arrows are always visible. For `ada@`, `bea@`, `cyd@` in that order, with `bea@` selected, left opens `ada@` and right opens `cyd@`. The ends are disabled. The open list shows every email in that same order, and seven or more emails scroll in the same way the month list does. Choosing an email or an enabled arrow still opens that trainee's journal through `?trainee=`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Arrows | Always visible, disabled at the ends | The month field keeps both chevrons on screen, including when a neighbor is missing | Plan |
| Neighbor | Previous and next index in the array the panel receives | For `ada@`, `bea@`, `cyd@` with `bea@` selected, left is `ada@` and right is `cyd@`; `linkedAt` stays the default-selection rule | Plan |
| Centering | The whole control is centered under the heading, and the email text is centered in the button | The notes place the field under `Body measurements`, and the month label is `text-center` | Plan |
| Width | The middle button is as wide as the longest linked email | The month button sizes itself from its longest label | Research |
| Scroll | Vertical `max-h-68` only when there are more than six emails | That is the month list's threshold and class | Research |
| Selection | Keep `selectTrainerPreview` and navigate with `?trainee=` | The picker must open the trainee the existing selector already chose | Research |
| Markup | A new `client:load` island; the month control stays in `MeasurementBrowser` | The month control also stores a preference and loads a page | Plan |
| List rows | Anchors with `aria-current="page"` and button styles | The row is a navigation, and the scroll effect finds that attribute | Plan |

## Scope

**In scope:**

- `adjacentTrainerLinks` plus unit tests
- `LinkedTraineeField` wired under `Body measurements`
- Home-token scan entry for the new file
- Trainer kitchen sink copy, the one-trainee disabled arrows, and a seven-email Long list state

**Out of scope:**

- A shared picker extracted from the month control
- Sort, default selection, the link form, the heading rule, and the read-only journal
- Arrows hidden until the seventh trainee, arrows ordered by `linkedAt`, or arrows that only scroll
- A new Playwright spec, a smoke-assertion edit, or a schema change

## Architecture / Approach

`selectTrainerPreview` still sorts and selects on the server. The new helper only reads that array. `TrainerPanel` centers a content-sized `LinkedTraineeField` (`client:load`, root `relative z-20 w-max`) under the heading. The `z-20` root keeps the open list above the month toolbar. Enabled arrows and list rows are links. Disabled ends are buttons. Open, Escape, outside click, and the six-item scroll class follow the month control.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Adjacent trainee rule | Tested previous/next on the given array | An arrow that follows `linkedAt` opens a different trainee than the row beside it |
| 2. Centered linked-trainee field | The island, the token-scan entry, and the kitchen sink states | A full-width group hides the centering, or `client:only` drops the selected email from the HTML smoke reads |

**Prerequisites:** Research is complete. Roadmap prerequisites S-12, S-13, and S-27 are done. No new dependency and no migration.
**Estimated effort:** About one session across two phases.

## Open Risks & Assumptions

- `max-h-68` was not measured as a row count. Copying the class keeps this list the same height as the month list.
- With the list closed, only the selected email is on screen. The other emails appear when the list opens. Smoke still sees the selected email because `client:load` renders it in the initial HTML.

## Success Criteria (Summary)

- With `bea@` selected in `ada@`, `bea@`, `cyd@`, left opens `ada@`, right opens `cyd@`, and both ends disable.
- The field is centered under `Body measurements`, the list scrolls only past six emails, and the journal below is still the selected trainee's.
- Zero links and the existing error panels still omit the field.
