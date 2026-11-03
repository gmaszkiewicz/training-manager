# Review fixes: cookie-cleanup

Queued from reviews/impl-review.md (2026-11-03).

- [x] **F2 — Flaky find-trainee e2e under the full suite.** During the review, `npx playwright test` failed once on `tests/e2e/find-trainee.spec.ts:107` and `:125` (2 failed, 15 did not run). Both passed in isolation, and a second full run passed 44/44. Not caused by cookie-cleanup. Next step: `npx playwright test tests/e2e/find-trainee.spec.ts --repeat-each=10 --trace=on`, find the race, and fix it in its own change.
  - 2026-11-03: `--repeat-each=10` gave 71 passed (7 tests × 10 + setup). Not reproducible on its own; it fails only under full-suite load. Closed; reopen if CI fails on it again.
