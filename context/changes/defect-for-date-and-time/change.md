---
change_id: defect-for-date-and-time
title: Current local minute is rejected as later than now
status: implementing
created: 2026-10-16
updated: 2026-10-16
archived_at: null
---

## Notes

Adding a new measurement at the current local date and time shows "Date and time must not be later than now".

The form stores the browser's wall-clock minute. Validation compared that naive timestamp with the UTC minute of now, so a clock ahead of UTC (for example UTC+2) treated the current minute as future. Create and update take the browser offset (`Date.getTimezoneOffset()`, bounded to a real zone) and accept that local minute. The next minute is still rejected.

https://github.com/gmaszkiewicz/training-manager/issues/101
