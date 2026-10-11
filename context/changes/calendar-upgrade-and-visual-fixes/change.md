---
change_id: calendar-upgrade-and-visual-fixes
title: Upgrade the journal calendar and saved entry display
status: planned
created: 2026-10-11
updated: 2026-10-11
archived_at: null
---

## Notes

1) Journal calendar: a week strip of day buttons. Clicking the month name (for example "October 2026") expands the month grid.
2) Date and time stays one field. Its popup contains the month grid and the time together.
3) Center the values on saved entries, and add the same icons used when adding a new measurement.

View: trainee journal at `/measurements` (`src/components/journal/TraineeJournal.astro`). Token source: existing design system in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components: `src/components/ui`.

https://github.com/gmaszkiewicz/training-manager/issues/88
