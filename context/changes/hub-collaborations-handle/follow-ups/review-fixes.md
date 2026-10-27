# Review follow-ups: hub-collaborations-handle

Source: `reviews/impl-review.md` (full-plan review, 2026-10-27).

## Drop `link_trainee_by_email` in a later release (F4)

- **Why**: migration `20261027120000_trainer_link_requests.sql` keeps `public.link_trainee_by_email(text)` and redefines it to insert `pending` rows, so the previous Worker keeps working during the deploy window. The new Worker no longer calls it, since it uses `request_trainee_link`.
- **When**: in the first release after this change is live on production. By then no running Worker calls the old function. Migrations must stay backward compatible: add first, drop in a later release.
- **What**: a new migration with `drop function if exists public.link_trainee_by_email(text);`. Then remove the consent-bypass check against it in `scripts/smoke.mjs`, or point that check at a different direct-REST path.
- **Check**: `grep -rn link_trainee_by_email src scripts` returns nothing except the smoke check being removed. `npm run migration-check` and `npm run smoke` pass.
- **Status**: done in `drop-link-trainee-by-email`.

## Repeat requests after a decline (F5): accepted

- **Why**: decline, cancel, unlink and remove delete the `trainer_links` row, as the plan says ("What We're NOT Doing": no history). A declined trainer can therefore send the same request again at once (`request_trainee_link` returns `sent`), and a trainee may experience that as spam.
- **Decision**: accepted. A declined request is deleted, and the trainer may send a new one at once. There is no block and no cooldown. The smoke test pins this: it declines a request, sends it again, and expects `sent`.
- **Constraint**: whichever option is chosen, `measurements_select_linked_trainer` must keep reading only `status = 'accepted'`. Any new status must also be excluded from the Hub's "pending first" ordering and from the trainee search.
