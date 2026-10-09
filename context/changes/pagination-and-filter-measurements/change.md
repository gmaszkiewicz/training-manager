---
change_id: pagination-and-filter-measurements
title: Pagination and filter measurements
status: impl_reviewed
created: 2026-10-08
updated: 2026-10-09
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

https://github.com/gmaszkiewicz/training-manager/issues/74

- One month at a time (`YYYY-MM`): months that have a row, plus the month of UTC today, newest first.
- Page size is the buttons 5, 10, and 15 on the right. The month stays a select. Neither has a visible label.
- Page 1 is the newest rows. Previous, the page label, and Next sit on the right, and only when the month has more rows than the page size.
- A fresh browser opens on the current month and 10. Page size is stored per account, month per trainee. The page index is not stored.
- Changing the month or the page size returns to page 1. An open edit or delete stays on that row's page and does not overwrite the saved month.
- No rows: `No measurements yet`. A selected month with none: `No measurements in this month`.
- The server returns one page, the month names, and the page count. One older row supplies the arrow for the oldest visible row. Other rows stay off the page.
- A preference cookie repeats the saved month and page size so the first HTML does not wait on `localStorage`. The address stays `/measurements`.
- The trainer sees the same list, without Edit or Delete. One page size per account, a separate month per trainee.
- A row with no delta still reserves one delta line.
