# Review follow-ups: avatar-select

From `reviews/impl-review.md`.

## F5 — Clean up orphaned avatar files

- **Accepted risk:** two overlapping saves, or an upload that overlaps a remove, can leave a file in `avatars/<user-id>/` that `profiles.avatar_path` does not point to. A failed delete of the old file has the same result, and so does an upload sent straight to Storage, which the `avatars_insert_own` policy allows. The avatar shown is never broken. Wasted storage is capped by the bucket's 2 MB file limit and its MIME types.
- **Follow-up:** add a scheduled cleanup that deletes objects in `avatars` whose name no profile's `avatar_path` references and that are older than a short grace period. Include orphans left after an account is deleted; the plan's "What We're NOT Doing" excluded that case.
- **Where:** a future change; not scheduled on the roadmap.
