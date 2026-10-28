---
change_id: improvment-for-status-collaborations
title: Per-dashboard access in the Collaborations panel instead of a single link status
status: planned
created: 2026-10-28
updated: 2026-10-28
archived_at: null
---

## Notes

Rework the Collaborations panel:

1. Replace the Status column with a nested Access column, split by dashboard: measurements, nutrition, training, planning. Only measurements works now; design the other three for later. For now, finding a trainee from the measurements card sends them a request for read access to measurements.
2. The statuses change: "linked" goes away and becomes "read" for now. The "unlink" action is renamed to "revoke", and on the trainee side "remove" is also renamed to "revoke".
3. A single dashboard will have many access options later. If the access types fit on screen, list them. When they stop fitting, copy the measurement Note cell solution (`note-fit` in `MeasurementBrowser.tsx`: text when it fits, otherwise an icon that opens a dialog) and only swap the StickyNote icon for one that stands for access.
4. Each access dashboard now gets its own action button.
5. Carry these changes into the notifications and the toasts as well.
