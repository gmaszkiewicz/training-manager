---
change_id: some-display-changes
title: Show inline measurement errors and clearer button states
status: impl_reviewed
created: 2026-10-15
updated: 2026-10-16
archived_at: null
---

## Notes

1) When adding a new entry, show errors immediately above the labels Weight kg, Chest cm, and the rest, instead of only after clicking Add.
2) Add a light margin between "Add your next measurement" and the labels Weight kg, Chest cm, and the rest, so the errors fit on one line and do not shift the layout.
3) Active and inactive buttons should stand out more from each other.
4) Each invalid measurement shows in its own bubble above that column while the column is hovered or focused, and for 3 seconds after Add rejects the form. A leading minus reads "cannot be negative".
5) A date and time that is already taken shows "A measurement at that date and time already exists." in a bubble above the date as soon as the day or clock changes. The check asks whether that one minute is taken. A 409 keeps the entered values. Only a 200 `{ ok: true }` that was not a redirect counts as saved.
6) The note shows how many characters are used out of 1000.

**View:** the measurements journal on `/measurements`. Errors and the heading live in `src/components/measurements/MeasurementForm.tsx` and `src/components/journal/TraineeJournal.astro`. Pressed and disabled buttons on that same view live in `MonthGrid.tsx`, `MeasurementBrowser.tsx`, and the date popup in `MeasurementForm.tsx`, through `src/components/ui/button.tsx`. One view.

**Token source:** existing design system. Values live in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components live in `src/components/ui`.

**Slice:** S-30 · **MS-22** — user can see a field error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and can tell active buttons from inactive ones.

https://github.com/gmaszkiewicz/training-manager/issues/99
