---
change_id: some-display-changes
title: Show inline measurement errors and clearer button states
status: new
created: 2026-10-15
updated: 2026-10-15
archived_at: null
---

## Notes

1) When adding a new entry, show errors immediately above the labels Weight kg, Chest cm, and the rest, instead of only after clicking Add.
2) Add a light margin between "Add your next measurement" and the labels Weight kg, Chest cm, and the rest, so the errors fit on one line and do not shift the layout.
3) Active and inactive buttons should stand out more from each other.

**View:** the measurements journal on `/measurements`. Errors and the heading live in `src/components/measurements/MeasurementForm.tsx` and `src/components/journal/TraineeJournal.astro`. Pressed and disabled buttons on that same view live in `MonthGrid.tsx`, `MeasurementBrowser.tsx`, and the date popup in `MeasurementForm.tsx`, through `src/components/ui/button.tsx`. One view.

**Token source:** existing design system. Values live in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components live in `src/components/ui`.

**Slice:** S-30 · **MS-22** — user can see a field error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and can tell active buttons from inactive ones.

https://github.com/gmaszkiewicz/training-manager/issues/99
