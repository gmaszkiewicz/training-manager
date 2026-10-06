# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-10-06

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ — drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting, window 2026-10-05: `src`, `scripts`, `supabase` (51 commits/30d).

The product is the up/down delta versus the previous remaining entry. Protect that chain first. Privacy of body measurements is next. The next checks are a migration applied onto existing measurement rows, then one saved weight edit. Kitchen-sink churn is not a test target (§7).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                                                                                                                                                                            | Impact | Likelihood | Source (evidence — not anchor)                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | After an edit or a delete, an entry's arrow and difference use the wrong previous remaining entry, a value from before the edit, or a comparison on the oldest remaining entry. Among entries that share a date, a note-only save can change which row is previous | High   | High       | Interview Q1, Q3, Q4; PRD Business Logic, US-01, FR-004, FR-005; roadmap S-05, S-06; hot-spot `src/lib` (17 commits/30d), `src/components/measurements` (10 commits/30d)             |
| 2   | A signed-in user reads or changes body measurements they do not own: another trainee's journal, an unlinked trainee's preview, or a trainer create, edit, or delete                                                                                                | High   | Medium     | PRD Access Control, NFR, guardrail; roadmap S-04; hot-spot `src/components/trainer` (11 commits/30d), `src/lib/services` (11 commits/30d)                                            |
| 3   | Linking by email attaches no trainee, the wrong person, or a non-trainee, and a preview opens anyway                                                                                                                                                               | High   | Medium     | PRD FR-007, Access Control pairing; roadmap S-04; hot-spot `src/components/trainer` (11 commits/30d)                                                                                 |
| 4   | A linked trainer's preview shows a different arrow or difference than the trainee's list for the same stored entries                                                                                                                                               | High   | Medium     | PRD FR-008, Business Logic; roadmap S-04; hot-spot `src/components/trainer` (11 commits/30d)                                                                                         |
| 5   | An illegal measurement (impossible value, clearly future date, or missing required field) is stored and then appears in the delta list                                                                                                                             | Medium | Medium     | PRD FR-003 (fields only, no ranges); archive `context/archive/2026-09-27-trainee-measurement-delta/plan.md` (signed limits); hot-spot `src/components/measurements` (10 commits/30d) |
| 6   | A migration applies on a database that already has measurement rows and then changes their numbers, drops rows, or leaves them owned by the wrong trainee                                                                                                          | High   | High       | Interview Q2, Q4; the documented rule that migrations reach hosted Supabase before the new Worker and stay backward compatible; hot-spot `supabase/migrations` (7 commits/30d)       |

Anonymous access to the journal is high impact and low likelihood. The measurement-delta archive already records a smoke check that refuses an anonymous add, and auth paths were quiet next to the journal. It stays off this map. Phase 2 only confirms that check still targets the current journal route. The signed-out journal visit is the S-19 seed and stays off this map.

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Must challenge                                                                                                                                                                                                                     | Context `/10x-research` must ground                                                                                                                                                                                                                                                                                                                                                                                                                                       | Likely cheapest layer                                                                                                                                                                                                                                         | Anti-pattern to avoid                                                                                                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1   | After an edit or a delete, each remaining entry compares with the immediately previous remaining entry by date, then saved timestamp, then id, using the saved numbers. The oldest remaining entry has no comparison. A difference that rounds to zero tenths shows as unchanged. A note-only save leaves the stored numbers as they are; among entries that share a date, it can change which row is previous. One smoke edit lists a difference that comes from the saved weight | A two-entry add proves edit, delete-the-middle, delete-the-latest, and a date change. A note-only save leaves same-date order unchanged. Hand-built rows prove the edit route wrote that weight                                    | Previous is the prior row after ordering by date, then timestamp, then id. Edit and delete change the rows passed into that rule; they do not store a separate chain. Zero tenths means unchanged. The save rewrites the timestamp even when the numbers stay put                                                                                                                                                                                                         | Unit on the comparison rule with the post-edit and post-delete rows. A thin integration is not required, because the next list applies that same rule to the saved rows. Beside that unit, one smoke edit whose listed difference comes from the saved weight | Asserting the current function's output as the oracle; an add-only happy path; a browser tour of two new rows; a request test that only repeats the same pure rule; a new unit that builds the edited row in memory; Playwright for this write                  |
| #2   | Another trainee's entries stay hidden. An unlinked trainer sees nothing. A trainer cannot create, edit, or delete a measurement                                                                                                                                                                                                                                                                                                                                                    | A signed-in session is enough to authorize the row                                                                                                                                                                                 | Ownership versus authentication, and that a preview grant is not a write grant                                                                                                                                                                                                                                                                                                                                                                                            | Integration at the request boundary with two users                                                                                                                                                                                                            | Mocking the auth check so it always passes; only asserting an anonymous 401                                                                                                                                                                                     |
| #3   | Link succeeds only for an existing trainee email, and the preview is that trainee's entries alone                                                                                                                                                                                                                                                                                                                                                                                  | A successful link response means the preview is the person who was typed                                                                                                                                                           | Email lookup, a trainer email, an unknown email, and a second trainee who was not linked                                                                                                                                                                                                                                                                                                                                                                                  | Integration on link, then preview                                                                                                                                                                                                                             | Seeding one trainee and linking only that happy path                                                                                                                                                                                                            |
| #4   | For the same stored entries, including after an edit or a delete, the linked trainer sees the same arrows and differences as the trainee                                                                                                                                                                                                                                                                                                                                           | A correct trainee list implies a correct trainer list because the two screens share one computed result                                                                                                                            | Each screen runs the same comparison on the rows loaded for that request. They do not share one computed result. When the rows match, the arrows match                                                                                                                                                                                                                                                                                                                    | One unit assertion on that comparison, beside #1, using the post-edit and post-delete rows. That assertion does not catch a later preview that formats arrows on its own                                                                                      | A screenshot of the trainer panel; subtracting again inside the test; asserting a shared result object                                                                                                                                                          |
| #5   | A date later than UTC today plus one day, with otherwise legal numbers, is refused on create and does not appear on the list. The existing rejection-rule unit already locks the signed limits, including that date rule. An out-of-range weight does not prove the route stopped before insert, because the table check would also reject it. One create request does not prove the edit path refused the same body                                                               | Client rejection means the server also refused to store it. A redirect after an out-of-range weight means the route refused the row. Create and edit sharing one schema means one create request covers the edit handler's refusal | Signed limits are the S-02 contract; FR-003 names the fields and states no ranges. Create and edit both parse that contract before write. The table repeats the numeric and note limits and does not cap the date, so a future date is the body that distinguishes a route refusal from a table refusal. The list proof is an empty journal after that create. The rejection-rule unit already exists. One request leaves the edit handler's schema-failure return unread | Keep the existing rejection-rule unit. One smoke request on create: a date later than UTC today plus one day, while the journal is empty, then the list stays empty. Not a new Vitest request — that runner does not boot the preview                         | Copying the implementation's limits into the expected value; asserting error text only; treating an out-of-range weight as proof the route stopped before insert; a new unit that repeats the existing field messages; asserting a mocked insert was not called |
| #6   | Insert one known measurement row (its numbers and its owning trainee), apply the migration under test, then select the numeric columns, the row count, and the owning trainee. Expected values come from the insert                                                                                                                                                                                                                                                                | A successful `db push` means the rows survived. An empty database stands in for a hosted database that already has rows. The migration SQL is the expected value                                                                   | The check starts from a seeded before-state. Migrations add first and drop later. Do not invent which past migration caused the corruption                                                                                                                                                                                                                                                                                                                                | A local Supabase check with that sequence: insert one known row, apply the migration under test, then select its numbers, count, and owning trainee                                                                                                           | Diffing migration files against themselves; testing only an empty database; a browser tour; copying an `UPDATE` from the migration into the assertion                                                                                                           |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                              | Goal (one line)                                                                                                                                       | Risks covered | Test types                                            | Status      | Change folder                                          |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------ |
| 1   | Delta after edit and delete             | Prove the remaining chain, the oldest entry, and the trainer's copy of that chain                                                                     | #1, #4        | unit; thin integration if save or preview can diverge | complete    | context/changes/testing-delta-after-edit-delete/       |
| 2   | Measurement access boundaries           | Prove ownership on read and write, and that an email link cannot open the wrong journal; confirm anonymous smoke still hits the current journal route | #2, #3        | integration at the request boundary                   | complete    | context/changes/testing-measurement-access-boundaries/ |
| 3   | Reject illegal measurements             | Prove an illegal entry is refused and not stored, on both entry paths                                                                                 | #5            | unit + one request                                    | complete    | context/changes/testing-reject-illegal-measurements/   |
| 4   | Hosted migration preserves measurements | Prove a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied                       | #6            | local Supabase check                                  | complete    | context/changes/testing-hosted-migration-preserves-measurements/ |
| 5   | Saved edit reaches the arrow            | Prove one persisted weight edit changes the listed difference                                                                                         | #1            | one smoke edit                                        | complete    | context/changes/testing-saved-edit-reaches-the-arrow/ |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.

Test base: **sparse**. Vitest is configured (`src/**/*.test.ts`). Four product test files, all under `src/lib`, plus one end-to-end seed. Most of the app has no direct test.

| Layer              | Tool                          | Version | Notes                                                                                                                                                                                                                      |
| ------------------ | ----------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration | Vitest                        | ^5.0.2  | `npm test` runs `vitest run`. Phase 1 adds the delta cases here. Phase 2's request boundary is `scripts/smoke.mjs`. Phase 3 keeps the existing rejection-rule unit here and adds the storage proof to `scripts/smoke.mjs`. |
| API mocking        | none                          | —       | Phase 2 shipped without a mock library.                                                                                                                                                                                    |
| e2e                | Playwright Test               | ^1.63.0 | Playwright Test 1.63.0 is the local browser layer for the signed-out seed S-19 owns. The CI `e2e` job runs `npx playwright test`. Do not add a Playwright job for risks #1–#6.                                             |
| accessibility      | none                          | —       | Out of this rollout.                                                                                                                                                                                                       |
| smoke              | `scripts/smoke.mjs`           | n/a     | Already in CI. Phase 2 confirms it still refuses an anonymous add on the current journal route. Phase 5 adds the saved-weight edit on `scripts/smoke.mjs`.                                                                 |
| migration check    | `scripts/migration-check.mjs` | 2.117.0 | Supabase CLI 2.117.0. `npm run migration-check` against a started local Supabase.                                                                                                                                          |
| AI-native          | none — checked: 2026-10-03    | n/a     | Browser review would not beat a deterministic delta assertion. Excluded by §7.                                                                                                                                             |

**Stack grounding tools (current session):**

- Docs: Context7 on `/microsoft/playwright` v1.63.0 for `webServer` (command, url, reuseExistingServer outside CI) and a setup project with `storageState`; checked: 2026-10-05
- Search: WebSearch is available and unused; checked: 2026-10-05
- Runtime/browser: cursor-ide-browser is available and unused as a test layer; checked: 2026-10-05
- Provider/platform: no Supabase or Cloudflare docs MCP; checked: 2026-10-05

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase <N>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                 | Where               | Required?                                                                                | Catches                                                                                                                         |
| -------------------- | ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| lint + `astro check` | local + CI          | required                                                                                 | syntax and type drift                                                                                                           |
| home token check     | CI                  | required                                                                                 | home color-token drift                                                                                                          |
| Vitest (`npm test`)  | local + CI          | command already required; delta, access, and rejection cases required as Phases 1–3 land | wrong comparison chain, ownership gaps                                                                                          |
| smoke                | CI                  | required; Phase 2 confirms the current journal route                                     | anonymous measurement write on the live route; a future-date create in `scripts/smoke.mjs` that must stay off the empty journal |
| migration check      | local Supabase + CI | required                                                                                 | measurement numbers, row count, or owning trainee changed by the newest migration                                               |
| saved-edit step      | local + CI          | required                                                                                 | a listed difference that does not use the saved weight                                                                          |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase <N>."

### 6.1 Delta after edit or delete

- **Test type**: unit case on `withDeltas` with post-edit and post-delete rows.
- **Behavior**: the wrong previous remaining row, a pre-edit value, a comparison on the oldest remaining row, a same-date note-only save that changes which row is previous, and a trainer preview that would disagree with that result.
- **Run locally**: `npm test`
- **Pattern**: Build the rows from the signed edit or delete plan, pass them in an order that is not newest first, and expect that plan's `formatDelta` strings and null deltas on the oldest remaining row. A note-only shared date is a later `created_at` with the same numbers, and a later `measured_on` stays above that pair. The trainer preview is those assertions. A second subtraction, a screenshot, a request test that only repeats this rule, and a thin integration are not part of this pattern.

### 6.2 Measurement access

- **Test type**: integration at the request boundary with two users.
- **Behavior**: another trainee's journal stays hidden; a trainer query for someone never linked shows a linked note and hides that trainee's note; a trainer cannot create, edit, or delete; an email link cannot open the wrong person.
- **Run locally**: `npm run smoke`
- **Pattern**: Extend `scripts/smoke.mjs`. The second-trainee query expects `smoke-later-trainee-note` and forbids `smoke-earlier-trainee-note`, and the second trainee's legal writes on the first measurement are refused. The trainer edit and delete of that measurement are refused the same way. The never-linked query accepts either linked note and forbids `smoke-unlinked-trainee-note`. The anonymous step stays `POST /api/measurements` expecting `/auth/signin`. A second anonymous POST and a Vitest auth or database mock are not part of this pattern.

### 6.3 Illegal measurement entry

- **Test type**: unit on the rejection rule, plus one request that proves nothing was stored.
- **Behavior**: an impossible value, a clearly future date, or a missing required field is refused on the form and the server.
- **Run locally**: `npm run smoke`
- **Pattern**: Extend `scripts/smoke.mjs`. After the empty-journal render and before the out-of-range weight post, create with UTC today plus two calendar days and weight `80.0`. That post expects a 302 whose location starts with `/measurements?error=`. The following `GET /measurements` expects `No measurements yet` and forbids that date. The existing rejection-rule unit stays. A new unit, weight `800` as this proof, the field message as the expectation, a mocked insert, and an edit-path request are not part of this pattern.

### 6.4 Choosing a layer for a new measurement behavior

- Delta chain, including the trainer's copy: §6.1.
- Ownership or email link: §6.2.
- Rejection of an illegal entry: §6.3.
- A migration that runs after rows exist: `scripts/migration-check.mjs`, run with `npm run migration-check` against a started local Supabase. The script resets to the version immediately before the newest file with `--no-seed`, signs up `migration-check@example.com` with a password of at least 6 characters and `data.role` `trainee`, inserts one profile and one measurement (`weight_kg` `80.0`, seven circumferences `50.0`), applies that newest file with `migration up`, and expects `migration-check-preserved` only when those numbers, `count(*)` `1`, and the signup `trainee_id` are still there. A journal read, a hosted `db push` exit code, an empty database with no pre-insert, and copying an `UPDATE` from a migration into the expected row are outside this pattern.
- A saved weight edit on the list: `scripts/smoke.mjs`, run with `npm run smoke`. After `measurements shows the weight delta` and before sign-out, POST `/api/measurements/${measurementId}` with `measurementForm("2026-01-02", "81.0", earlierNote)`, expect 302 and exact location `/measurements`, then GET `/measurements` expecting `↑ 1.0` and forbidding `↓ 1.5`. The comparison-rule unit stays. A new in-memory unit, a `withDeltas` call from smoke, Playwright, a same-date note-only save, and weight `80.0` are not part of this pattern.
- Kitchen-sink and visual restyles: do not add a test (§7).

### 6.5 Per-rollout-phase notes

Rollout phase 1 shipped these cases in `src/lib/measurement-deltas.test.ts`. The existing `0.0`, backfilled-date, and id-tie cases were left in place. No AI-native check was added. Checked 2026-10-04.

Rollout phase 2 shipped those steps in `scripts/smoke.mjs`: the second-trainee query and legal writes, the trainer edit and delete, and the never-linked query that accepts either linked note and forbids `smoke-unlinked-trainee-note`. No Vitest auth or database mock was added. No AI-native check was added. Checked 2026-10-04.

Rollout phase 3 shipped those two steps in `scripts/smoke.mjs`: a create of UTC today plus two calendar days with weight `80.0`, and the following `GET /measurements` that expects `No measurements yet` and forbids that date. The existing rejection-rule unit was left in place. No new Vitest request was added. No AI-native check was added. Checked 2026-10-04.

Rollout phase 4 shipped `npm run migration-check` in `scripts/migration-check.mjs`. No Playwright job was added. No hosted row select was added. Checked 2026-10-06.

Rollout phase 5 shipped those two steps in `scripts/smoke.mjs`: a POST `/api/measurements/${measurementId}` with `measurementForm("2026-01-02", "81.0", earlierNote)` that expects 302 and exact location `/measurements`, and the following `GET /measurements` that expects `↑ 1.0` and forbids `↓ 1.5`. The existing comparison-rule unit was left in place. No new Vitest case was added. No new in-memory unit was added. Smoke does not call `withDeltas`. No Playwright check was added. Checked 2026-10-06.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Kitchen-sink screens and visual restyles** — they churn and do not protect measurement numbers, ownership, or the delta chain. Re-evaluate if a restyle changes stored values, who can read a journal, or which numbers the delta uses. (Source: Phase 2 interview Q5. Hot-spot `src/pages/kitchen-sink`, 12 commits/30d, stays in negative space.)
- **No broad browser or screenshot suite beyond the signed-out seed.** Re-evaluate if a failure can only be seen in a rendered page and no unit or request result exposes it. (Source: accepted seed brief.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-10-06
- Stack versions last verified: 2026-10-05
- AI-native tool references last verified: 2026-10-05

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
