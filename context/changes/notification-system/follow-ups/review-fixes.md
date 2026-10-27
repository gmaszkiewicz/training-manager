# Review fixes — notification-system

Queued from `reviews/impl-review.md`.

## F2 — Notification flood via request → withdraw loops

- **Where**: `supabase/migrations/20261027200000_notifications.sql:96-108` (trigger `notify_trainer_link_change`)
- **Problem**: Each request → withdraw cycle writes two notifications for the trainee. There is no rate limit, dedupe or cap.
- **Options**:
  - In the trigger, skip `link_requested` / `link_cancelled` when the same actor already has an unread notification of that kind for this recipient within N minutes.
  - Or rate-limit `request_trainee_link` per trainer → trainee pair.
- **Done when**: a smoke step that loops request → withdraw several times leaves a bounded number of notifications for the trainee.
