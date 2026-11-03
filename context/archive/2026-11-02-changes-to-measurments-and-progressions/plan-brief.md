# Top progression 0.9 (RC) and Unified Period Pickers — Plan Brief

> Full plan: `context/changes/changes-to-measurments-and-progressions/plan.md`

## What & Why

We are shipping Top progression 0.9 as a release candidate that most users see by default. It reads better than 0.1: each circumference chart has its own filter, the period choice is an arrowed box on the right, Month charts mark the days with progress, and its charts are grouped bar charts in the style of the shadcn "Bar Chart - Multiple" (the loss pair as "Bar Chart - Negative") instead of radars. At the same time, every measurements tile gets period boxes of one fixed width, and the browser's actions get a tidy footer (roadmap S-51, MS-42, issue #187).

## Starting Point

Top progression exists only as 0.1. It is a preview, off by default, with one shared Circumferences menu, Week/Month/Year/Years buttons, and Month axes made of calendar weeks. Saving Settings writes every component's value, so most users have it stored as "off". There are two copies of the period picker, and each only sets a minimum width. Visualize/Clear sit in a separate row below the right-aligned pager.

## Desired End State

Settings offers Off, v0.1 (preview) and v0.9 (RC), and 0.9 is the default for never-saved users and for everyone previously on Off. 0.9 carries a yellow "RC" badge with the tooltip "Release candidate - it may contain bugs.". 0.9's four charts are grouped bar charts, the loss pair negative, each pair on one shared scale. 0.1 stays selectable and unchanged (radars included) except for the shared picker width. Every period box is exactly as wide as "September 2026". Under the table, Visualize, Clear and "x of 15 selected" sit on the left, and the pager sits on the right behind a vertical divider when it shows.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Who gets 0.9 | A data migration moves stored "off" to "0.9"; 0.1 choosers keep 0.1; null settings get the new default | "On by default" reaches existing users while respecting an explicit 0.1 choice. |
| Filter | One filter per circumference chart (gain, loss), each remembered separately; none on the weight charts | The weight charts have one series, and mixing kg with cm would distort the radar. |
| Reach into 0.1 | 0.1 shares the fixed-width picker; its buttons, menu and week axes stay | One picker for every tile; 0.1 changes only by box width. |
| Month axis labels | Label progress days; when fewer than 6, add evenly spread anchors (first, last, then inner: 1, 31, 7, 13, 19, 25 for 31 days), skipping one next to a progress day | At least 6 orientation points keep a 28–31-axis radar readable (raised from 3 in Phase 3). |
| Anchor days | Evenly spread over the month length | Deterministic for every month length. |
| RC badge | Yellow "RC" with a tooltip; Settings reads "v0.9 (RC)" | Mirrors the Preview badge and stays narrow on a phone. |
| Footer | One row: actions on the left, a vertical divider and the pager on the right when paged | Compact, and the actions never move when pages appear. |
| Period box arrows | Step Week ↔ Month ↔ Year ↔ Years and stop at the ends | Matches the date picker's arrows. |
| Name | Keep "Top progression" | Matches "Progression"; no copy or test churn. |
| 0.9 chart kind (Phase 5) | Grouped bar charts (loss charts negative), 4 cards kept, no range select in the card; only changed sub-periods drawn (all 5 years on Years) | The tile's pickers already own the window, and fixed-width grouped bars keep each field readable (an area-chart attempt was dropped after review). |
| 0.9 X axis (Phase 5) | Day-number labels on the bar chart's X axis; a pinned value axis with units | Note 8 stays as agreed, and `labelMonthDays` already has tests. |

## Scope

**In scope:** a shared `PeriodPicker` with a fixed width; the browser footer row; opt-in day axes and the label rule for Month; the 0.9 island with per-chart filters and an arrowed period box; version stages (stable/rc/preview); a `--warning` token and the RC badge; page wiring by version; the Off→0.9 data migration; unit and e2e updates; bar charts for 0.9, the Month-wide period box for Progression and 0.9, and the compact table footer (Phase 5).

**Out of scope:** a rename; changing 0.1's controls or axes; filters on the weight charts; wrap-around arrows; promoting 0.9 to stable or removing 0.1; schema changes; Progression layout changes beyond the picker; a range select in the 0.9 cards; stacked bars or a merged gain/loss chart; bar charts in 0.1.

## Architecture / Approach

The registry's `preview` boolean becomes `stage`, and `ComponentTile` carries `stage` and `version`, so `TopChangesTile` renders either `TopChangesCharts` (0.1) or the new `TopChangesChartsRc` (0.9). Both reuse `useChartPeriodRead` and `ChartPeriodControls`, which gains `periodControl: "buttons" | "picker"`. They also share `subPeriodTotals`, which gains `monthAxis: "weeks" | "days"`. `CollapsibleTile` renders a `VersionBadge` by stage. In Phase 5 the 0.9 island swaps `TopChangeChart` (radar) for a new `TopChangeBarChart` with the same props, and both share helpers extracted into `top-change-chart-parts.tsx`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared period picker + footer | One fixed-width picker in every tile; the footer row with a divider | A fixed width that still stretches; the row wrapping on a phone |
| 2. Daily Month axes | Day rows and the top-up-to-6 label rule, unit-tested | Off-by-one in the month length or the middle day |
| 3. 0.9 island | Per-chart filters, an arrowed period box, the kitchen sink | 28–31 radar axes crowding on a phone |
| 4. Release as RC | Stages, the yellow badge, wiring, the Off→0.9 migration, tests | Migration timing against the old Worker; yellow contrast |
| 5. Bar charts in 0.9 | The radars become grouped/negative bar charts; one Month-wide period box; compact footer; 0.1 untouched | 28–31 day slots overflowing the card (the plot scrolls under a pinned axis) |

**Prerequisites:** S-41, S-46 and S-47 are done; local Supabase is available for `migration-check` and e2e.
**Estimated effort:** ~4–5 sessions across 5 phases.

## Open Risks & Assumptions

- A user who deliberately switched Top progression off sees 0.9 once (stored "off" can't tell a default from a choice). This was accepted.
- While the old Worker still runs after the migration, a Settings save writes "off" back. The window is short and accepted.
- The fixed width truncates any label wider than "September YYYY", such as some cross-month weeks. The full label stays in the aria-label.

## Success Criteria (Summary)

- Existing and new users see Top progression 0.9 with a yellow RC badge, and 0.1 stays selectable and unchanged.
- 0.9 draws bar charts and 0.1 draws radars.
- Every period box in every measurements tile is the same width and never changes size.
- Visualize, Clear and the selection count sit on the left of one row under the table, with a divider before the pager when it shows.
