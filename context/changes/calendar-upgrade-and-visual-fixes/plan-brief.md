# Journal calendar and saved-entry display — Plan Brief

> Full plan: `context/changes/calendar-upgrade-and-visual-fixes/plan.md`
> Research: `context/changes/calendar-upgrade-and-visual-fixes/research.md`

## What & Why

The journal still picks a month from a `yyyy-mm` dropdown, and the date field still opens the browser's native picker. Saved metric numbers sit in plain boxes with no icon. This plan replaces the dropdown with a Monday-first week strip and an expandable month grid, puts that grid and the time in one date-and-time popup, and centers saved numbers beside the same icons used for a new measurement.

## Starting Point

`MeasurementBrowser` is the shared list for the trainee journal and the trainer preview. It pages one calendar month at a time. The add form uses `Scale` for weight and `Ruler` for circumferences, with the number left-aligned. There is no calendar component and no date-picker library. The journal's "today" is a UTC date; a new entry's default minute is the browser's local time.

## Desired End State

The toolbar shows the week containing the marked day and a name such as `October 2026`. Clicking the name expands the month. Clicking 7 October highlights that day and leaves every October row in the list. Clicking 28 September, when that month is listed, loads every September row and shows the week of the 28th. On open, today is marked when it falls in the loaded month; otherwise the newest entry's day is marked. The date field still submits one `YYYY-MM-DDTHH:mm` value, and its popup keeps the grid and the time open after a day click. Saved numbers and deltas are centered, with the icon on the left.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Journal control | Week strip; the month name expands the grid; a day click closes the grid | Chosen from the week-strip mockup | Research |
| Date and time | One field; the popup has the month grid and the time; a day click leaves it open | Chosen from the date-time mockup | Research |
| Day click | All rows in that day's month | Replaces the dropdown and keeps the existing one-month page | Plan |
| Saved values | Left icon, centered number and delta | The number is what gets centered, and the icon matches the form | Plan |
| Week start | Monday | Sunday 11 October 2026 belongs to the week of Monday 5 October | Plan |
| Opening day | Today when it is in the loaded month, otherwise the newest entry; an empty month uses the 1st | The strip opens on a day inside the month the list is already showing | Plan |
| Today | The UTC date the journal already passes in | That date is the one that already chooses the current month | Plan |
| Other months | A day outside the known month list is visible and disabled | The page request would otherwise substitute the current month | Plan |
| Edit focus | The entry still chooses the month and page; the strip still uses the opening day | The opening rule has no exception for the focused row | Plan |

## Scope

**In scope:**

- Monday-first week strip and expandable month grid on the shared list, including the trainer preview
- One date-and-time popup that reuses the month grid and keeps the current submit value
- Saved metric icons, centered numbers, and centered deltas

**Out of scope:**

- A single-day list filter, week arrows, and storing the highlighted day
- A new date library, form-input realignment, a date icon, column widths, and the card floor
- The form's future-day ceiling on the journal, and merging the UTC and local clocks

## Architecture / Approach

Pure calendar functions in `src/lib/journal-calendar.ts` own the week, the grid, the opening day, and the month-change rule. A shared month grid renders those cells with `Button`. The journal calls the existing month reload only when the clicked day belongs to another known month. The highlighted day stays a `YYYY-MM-DD`; that reload updates the loaded month and does not replace the highlight. The paged payload adds `newestMeasuredOn` so a later focus page can still mark the newest day. The form submits the same `measured_on` string through the new popup.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Calendar rules | Tested week, grid, opening day, and month-change functions | A wrong October date would shift every later check |
| 2. Journal week strip | Dropdown replaced on the trainee and trainer lists | Edit focus must not wipe the clicked day or hide the newest day |
| 3. Date and time popup | One field whose popup keeps the grid and the time | The submitted value must stay `YYYY-MM-DDTHH:mm` |
| 4. Saved values | Left icons with centered numbers and deltas | The icon can crowd a long delta inside `w-28` |

**Prerequisites:** Research in this change folder. No database migration.
**Estimated effort:** About 2 sessions across 4 phases.

## Open Risks & Assumptions

- The paged response must include `newestMeasuredOn`. Without it, edit focus on a later page cannot mark the newest day.
- The week strip is wider than the old `w-40` select. It stays in the existing toolbar row and uses the current role tokens.
- Form dismissal is a second press, Escape, or a pointer press outside the popup. The approved mockup specified that a day click leaves it open.

## Success Criteria (Summary)

- Sunday 11 October 2026 shows as the week of Monday 5 October, and a same-month click does not change the rows.
- A click in another known month loads that whole month on page 1, and the date popup still submits one minute-precision value.
- Saved weight and circumference values are centered, with `Scale` or `Ruler` on the left, on both the trainee journal and the trainer preview.
