---
change_id: test-plan-refresh
title: Refresh the test plan for hosted migrations
status: archived
created: 2026-10-05
updated: 2026-10-06
archived_at: 2026-10-06T19:05:37Z
---

## Notes

Refresh context/foundation/test-plan.md. Do not edit that file in this step. Open the change folder only. The guide is rewritten later through this change, and only the updates listed below. After the folder exists, follow the downstream continuation rule: the next natural command is /10x-research.

Title guidance: Refresh the test plan for hosted migrations.

Guide today (last updated 2026-10-04). All three rollout phases are complete:

- Phase 1, delta after edit and delete, risks #1 and #4, unit on the comparison rule.
- Phase 2, measurement access boundaries, risks #2 and #3, smoke at the request boundary.
- Phase 3, reject illegal measurements, risk #5, existing rejection unit plus one future-date create on an empty journal. The edit refusal was left out on purpose.
  Anonymous journal access is parked as high impact and low likelihood. Section 4 says there is no Playwright and not to add one. Section 7 excludes kitchen-sink screens, visual restyles, and a new browser suite.

Stale:

- Playwright Test 1.63.0 is now in the manifest, playwright.config.ts, and context/foundation/test-stack.md (updated 2026-10-05). Context7 checked /microsoft/playwright v1.63.0 on 2026-10-05: webServer (command, url, reuseExistingServer outside CI) and a setup project with storageState are current. The CI `e2e` job runs `npx playwright test` for the signed-out seed. This refresh does not add a Playwright job for risks #1–#6.
- Roadmap S-19 (e2e-setup) is in progress: a browser runner against a production-like preview, and a signed-out visit to the journal is sent to sign-in. That slice already owns the seed. Do not open a second phase for it.
- Hot spots, last 30 days, scopes src, scripts, supabase: 51 commits. src/lib 17, scripts/ 20, src/pages/kitchen-sink 12, src/lib/services 11, src/components/trainer 11, src/components/measurements 10, src/components/journal 10, supabase/migrations 7. The previous guide used 44 commits and src/lib 14.

Missing:

- No risk for a migration that applies cleanly on an empty local database and then corrupts measurement rows on the hosted database.

Interview (2026-10-05):

- Q1: An edited weight still drives the arrow from the number saved before the edit. Same scenario as risk #1. The shipped unit feeds rows in. It does not prove the edit write.
- Q2: A migration looked fine locally and corrupted measurement rows on the hosted database.
- Q3: skipped.
- Q4: The scary gap is hosted migrations. A local apply looks fine, and nothing checks the rows after the hosted push.
- Q5: Do not spend budget on kitchen-sink screens or visual restyles.

Accepted updates for the later plan. Keep risk numbers #1–#5. Append #6. Leave phases 1–3 complete.

Risk #6 — A migration applies cleanly locally and then, on a database that already has measurement rows, changes their numbers, drops rows, or leaves them owned by the wrong trainee. Impact High. Likelihood High. Source: interview Q2 and Q4; CLAUDE.md rule that migrations reach hosted Supabase before the new Worker and must stay backward compatible; hot-spot supabase/migrations (7 commits/30d).

Risk #6 response:

- Prove: rows seeded before the new migration keep their numbers, their count, and which trainee owns them after the migration set is applied.
- Challenge: a successful db push means the rows survived. An empty database stands in for a hosted database that already has rows. The migration SQL is the expected value.
- Context for research: when migrations run, the add-first drop-later rule, and a seeded before-state. Do not invent which past migration caused the corruption.
- Cheapest layer: a check on local Supabase that seeds rows, applies the migrations, and reads the rows back.
- Avoid: diffing migration files against themselves, testing only an empty database, a browser tour, or copying an UPDATE from the migration into the assertion.

Risk #1 response adjustment only: the comparison rule stays covered by phase 1. Add one saved-edit proof that the listed difference uses the new weight. Challenge the assumption that hand-built rows prove the edit route wrote the new weight. Cheapest layer is one smoke edit, not a new unit and not Playwright.

New section 3 rows, both not started:

- Phase 4 — Hosted migration preserves measurements. Prove seeded measurement rows survive the apply. Risk #6. Local Supabase check. Open this first.
- Phase 5 — Saved edit reaches the arrow. Prove one persisted weight edit changes the listed difference. Risk #1. One smoke edit.

Section 4: record Playwright 1.63.0 as the browser layer for the signed-out seed S-19 already owns. Record the stack grounding note above, checked 2026-10-05. WebSearch was available and unused. cursor-ide-browser was available and unused as a test layer. No Supabase or Cloudflare docs MCP in that session.

Section 7: keep kitchen-sink screens and visual restyles excluded. Narrow the browser exclusion to "no broad browser suite beyond the signed-out seed."

Challenger findings already accepted:

- No separate signed-out risk. S-19 owns that seed.
- No new risk for an illegal edit. The roadmap notes that gap. The interview did not.
- Q1 does not become a new risk number.

Test base: sparse. Vitest and Playwright are configured. Four product unit files are under src/lib, plus one end-to-end seed.
