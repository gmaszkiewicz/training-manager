---
change_id: password-reminder-fix
title: Keep password reset links valid for a while and allow resending expired ones
status: implementing
created: 2026-10-26
updated: 2026-10-26
archived_at: null
---

## Notes

1. Improve the password reminder so the reset link does not expire as soon as it is clicked and the page is left, but only after a set time, e.g. 15 minutes.
2. Also make it possible to send a second link if the first one has expired.
