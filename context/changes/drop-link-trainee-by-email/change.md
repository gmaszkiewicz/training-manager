---
change_id: drop-link-trainee-by-email
title: Drop the legacy link_trainee_by_email function after the Hub release
status: implementing
created: 2026-10-27
updated: 2026-10-27
archived_at: null
---

## Notes

Drop the legacy link_trainee_by_email function now that the Hub/request flow (S-37, hub-collaborations-handle) is live in production; remove its smoke consent-bypass check and regenerate types. Also record review finding F5 (re-request after decline) as accepted: a declined request is simply removed and the trainer may send a new one right away, no block or cooldown.
