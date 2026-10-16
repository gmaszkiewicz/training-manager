# Inline measurement errors and clearer button states — Plan Brief

> Full plan: `context/changes/some-display-changes/plan.md`
> Research: `context/changes/some-display-changes/research.md`

## What & Why

On `/measurements`, measurement errors appear only after Add, under the input. MS-22 asks for the error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and for active and inactive buttons to stand apart.

## Starting Point

`MeasurementForm` parses the whole form on submit and clears a field's message on change. `FormField` renders that message under the input. The heading and the labels are separated by `mb-6`, with no reserved error line. Pressed day, month, and page-size buttons use filled versus outline plus `aria-pressed`. Disabled buttons are the same variant at 50% opacity. The longest measurement sentence is 54 characters and does not fit in the 112px column.

## Desired End State

Add and Edit keep a one-line gap between the heading and the measurement labels. Leaving an invalid measurement, or clicking Add, fills that gap with the first invalid measurement message, on one line, and the labels stay put. Date and Note still explain themselves under their controls, on Add. An enabled pressed button shows a ring. A disabled button is muted fill and muted text, including on the other screens that share `Button`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| When the error appears | On blur and on Add | An untouched form stays quiet, and typing `8` on the way to `80` does not flash | Plan |
| Where it sits | One reserved line between the heading and the labels; first message in field order | The 54-character sentence cannot fit on one line inside the Weight column, and a second line would move the labels | Plan |
| Date and Note | Under the control, on Add only | MS-22 names Weight kg, Chest cm, and the rest | Plan |
| Edit | Same band and timing as add | The form already shares one submit path | Plan |
| Button pair | Pressed ring, and disabled muted fill instead of 50% opacity | The notes name both pressed and disabled buttons; light-mode filled versus outline is already near-black versus white | Plan |
| Where button styles live | Shared `button.tsx` | The roadmap already records that other screens change with a shared button style | Research |

## Scope

**In scope:**

- Blur and Add for the eight measurement fields, on add and on edit
- A one-line band that shows the first of those messages
- Optional `FormField` props so auth forms keep the error under the input
- Pressed ring and muted disabled treatment on the shared button

**Out of scope:**

- Keystroke validation, and errors on the fresh empty form
- Date and Note in the band
- More than one measurement message at a time
- New copy, new tokens, or changes to filled versus outline colors
- A pressed ring on the selected trainee link, which does not set `aria-pressed`

## Architecture / Approach

Blur calls the existing per-field schema and updates only that field. Add still runs the full schema, which is what sets Date, Note, and every invalid measurement. The band reads the first measurement message in `measurementFields` order and does not pass `error` into `FormField`, so the sentence is not repeated under the input. The ring and the muted disabled styles live on the button base classes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Reserved measurement error line | One-line band, blur plus Add, unit tests for which message wins | A full-form parse on blur would flag every empty field |
| 2. Shared button contrast | Pressed ring and muted disabled on `button.tsx` | Every disabled `Button` changes, including pending Add and trainer arrows |

**Prerequisites:** S-27 is done. Research for this change is complete. No migration.
**Estimated effort:** About one session across two phases.

## Open Risks & Assumptions

- In light mode the pressed ring is a smaller change than the disabled treatment, because filled versus outline is already near-black versus white.
- Disabled muted styles ship to every disabled `Button` in the same release.
- The selected trainee control does not set `aria-pressed`, so it does not gain the ring.
- Planning did not measure the 54-character line in a browser. The fit assumes the wide journal card, not the `w-28` column.

## Success Criteria (Summary)

- Leaving Weight at `8` shows `Weight must be between 20 and 400 kg` on one line above the labels, and the labels do not move.
- Weight `12.34` and Chest `abc` show only the Weight message until Weight is valid. Add still refuses the hidden Chest error.
- A selected day, month, or page size shows a ring, and a disabled button reads as muted rather than as a faded copy of an active one.
