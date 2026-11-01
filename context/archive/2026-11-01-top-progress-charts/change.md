---
change_id: top-progress-charts
title: Radial charts panel for top weight and circumference gains and losses
status: archived
created: 2026-11-01
updated: 2026-11-01
archived_at: 2026-11-01T07:14:55Z
---

## Notes

Add another chart panel using shadcn radial charts.
The panel lives on its own tile, like the line charts panel.
The charts show the largest and smallest changes in weight and body circumferences within a given week, month, year, and the last 5 years.
The panel shows four charts:
- first: top weight gain
- second: top gain across all circumference measurements, on one chart
- third: top weight loss
- fourth: top loss across all circumference measurements, on one chart

The circumference charts get filtering, and every chart gets a legend.
Match the shadcn style, and the buttons and fields of the line charts tile.

Clarified during Phase 3: the charts show sums, not single deltas.
- Circumference charts: per body part, the sum of its gains (or losses) in the period, e.g. thigh +1 in January and +1 in February = 2, chest 0 + 1 = 1. Gains and losses are summed separately.
- Weight charts: which sub-period had the largest summed gain (or loss): a day in a week or month, a month in a year, a year in the last 5 years.
- Charts are radar charts (not radial bar charts): weight axes are the sub-periods with the largest one highlighted; circumference axes are the selected body parts (at least 3).
- Final shape: axes are sub-periods (week: dates, month: calendar weeks, year: months, years: 5 years); circumference charts are Radar Chart - Multiple with one coloured series per body part; weight uses the same axes with one series. Each chart shows which sub-period had the largest summed gain or loss.
