---
change_id: query-optimization
title: Query optimization
status: archived
created: 2026-10-10
updated: 2026-10-10
archived_at: 2026-10-10T06:36:53Z
---

## Notes

S-24 on M-1. https://github.com/gmaszkiewicz/training-manager/issues/77

The month list is no longer built by walking every `measured_on` in batches of 1000. One call to `public.measurement_months(p_trainee_id)` returns the distinct `YYYY-MM` values for the rows the signed-in user is allowed to see (security invoker, RLS).

- The month page, the exact count, the difference versus an entry outside the page, and the page sizes 5/10/15 stay as they were.
- `measurementMonths` still adds the UTC current month when that month has no rows.
- Smoke checks the month catalog, the June weight difference, and both a linked and an unlinked trainer.
- Shipped in https://github.com/gmaszkiewicz/training-manager/pull/78. Plan review approved; phases 1 and 2 are closed.
