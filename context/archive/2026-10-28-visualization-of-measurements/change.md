---
change_id: visualization-of-measurements
title: Line charts visualizing measurement history with selectable entries
status: archived
created: 2026-10-28
updated: 2026-10-28
archived_at: 2026-10-28T19:57:07Z
---

## Notes

1) Build 8 line charts showing the progression of measurements across all entries in the selected week, month, year, or multiple years (default: the currently selected month).
Each chart shows one value: one for weight, another for chest circumference, etc.
The x-axis must at least be divided by the values present in the entries; if there are very many of them, the axis is divided per day for a week, per week for a month, per month for a year, and per month for multiple years.
The y-axis is divided in steps of 5, with the maximum value matching the allowed range of the corresponding measurement input field. Hovering over the line shows the points where entries were made (a tooltip with the entry's details + the difference from the previous entry).
2) The charts live in a separate tile placed above the new-entry tile and the entries table. Like "Add your next measurements", it must collapse like an accordion, hiding all charts.
3) Also add a "Visualize" button below the measurements table: selecting x entries with checkboxes visualizes those entries on the charts — selection allowed up to x values. Next to it, a "Clear" button restores the original visualization of all measurements from the given month.
4) Selections must be remembered by the browser.

Revised during implementation: the charts tile sits below the measurements table, and the period views plot the latest entry per day, month or year (see `plan.md` → Deviations).
