---
change_id: calendar-upgrade-and-visual-fixes
title: Upgrade the journal calendar and saved entry display
status: implementing
created: 2026-10-11
updated: 2026-10-12
archived_at: null
---

## Notes

S-27. Outcome: user can move through the journal on a week of day buttons, open the month grid from the month name, set date and time together in one field, and read each saved entry's values centered with the same icons as a new measurement. PRD refs: MS-19.

1) Journal calendar: a Month field with the English month and year, a previous arrow, and a next arrow. Clicking the month and year opens a floating list of the current month plus every month that has entries. The entries do not move down.
2) Date and time stays one field. Its popup contains the month grid and the time together.
3) Center the values on saved entries, and add the same icons used when adding a new measurement.

View: trainee journal at `/measurements` (`src/components/journal/TraineeJournal.astro`). Token source: existing design system in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components: `src/components/ui`.

https://github.com/gmaszkiewicz/training-manager/issues/88
