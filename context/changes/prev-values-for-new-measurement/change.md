---
change_id: prev-values-for-new-measurement
title: Prefill a new measurement with weight and circumferences from the previous one
status: implemented
created: 2026-10-29
updated: 2026-10-29
archived_at: null
---

## Notes

A feature where entering a new measurement checks whether a previous measurement exists and, based on it, autofills the weight and circumference values (copies the values from the previous measurement).
If there is no earlier measurement, nothing is entered into the new measurement's fields.

Scope change during Phase 1 (requested by the user): changing the date or time in the add form now refills the measurement fields from the entry before the chosen minute, instead of keeping the latest entry's values. Fields the trainee typed in keep their value; when no earlier entry exists, the untyped fields are emptied. The page reads the latest entry with a wall-clock bound of now + 14h + 1 min, because `measured_on` stores the trainee's local time.
