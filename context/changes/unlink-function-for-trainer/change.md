---
change_id: unlink-function-for-trainer
title: Trainer and trainee profile actions, unlink list, and role labels
status: preparing
created: 2026-10-17
updated: 2026-10-17
archived_at: null
---

## Notes

On the trainer profile page, a second option appears:

1. Change password as a button. The trainee profile has this button too.
2. Unlink trainees as a button. Only the trainer sees it.

Unlink trainees is new. After the trainer clicks it, a list of linked trainees appears, and each trainee can be unlinked. That list follows the home page style, with pagination and page sizes of 5, 10, and 15. Profile and Change password do not show pagination or a control for how many trainees appear on a page. Profile, Change password, and the linked-trainee list show their data in the same main div, so that region is the same size on all three.

3. The profile in the header displays Trainee profile or Trainer profile.

S-32, MS-24. A trainer can unlink a linked trainee from a home-style list paged 5, 10, or 15. Profile and Change password use that same main data div and do not show pagination or a trainee-count control. Both roles see Change password as a button, and the header profile reads Trainee profile or Trainer profile.

https://github.com/gmaszkiewicz/training-manager/issues/109
