<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Find Trainee by First and Last Name

- **Plan**: context/changes/find-tranne-by-first-and-lastname/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Automated checks run

- `git grep -nE "headingFor|traineeLabel|Measurements for" -- src tests`: nothing found (PASS)
- `npm test`: 406/406 passed (PASS)
- `npm run lint`: clean (PASS)
- `npx astro check`: 0 errors, 0 warnings (PASS)
- `npm run check:home-tokens`: clean (PASS)
- `npm run migration-check`: the new migration applies after a reset (PASS)
- `npm run build`: fails with EPERM because something holds `dist/client`; `astro build --outDir ./dist-review` completes (PASS, environment issue)
- `npx playwright test` (find-trainee, component-settings): could not start because the build hits the same EPERM lock on `dist/` (NOT RUN)

## Findings

### F1 — Name search lets any trainer list every trainee's name and email

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261102120000_search_unlinked_trainees.sql:50-85
- **Detail**:
  - The old RPC already let a trainer list unlinked trainees' emails with a one-character substring.
  - The new RPC also returns `first_name`/`last_name` and matches on names. Looping over letters ("a", "b", …) now returns every unlinked trainee's full name and email.
  - The trainer role is chosen at signup (`src/pages/api/auth/signup.ts:9-10`), so anyone can make an account and collect this list.
  - All the guards are correct (security definer, `search_path = ''`, qualified names, trainer check, already-linked trainees excluded, grants). The issue is how much the RPC returns, not a bypass.
- **Fix A ⭐ Recommended**: Require at least 3 folded characters before the RPC returns rows. Do it in SQL, in the new function only, and mirror it in the client so the list does not open for shorter queries.
  - Strength: Closes the single-letter sweep without changing the feature.
  - Tradeoff: Short names ("Al", "Bo") are found only by email or a longer query. Changes the function body, so it needs a new additive `create or replace` migration.
  - Confidence: MED — a common mitigation. A determined user can still sweep with 3-letter combinations (about 17k queries), so it slows enumeration rather than stopping it.
  - Blind spot: No rate limiting exists on `GET /api/trainer-links`; not checked whether Cloudflare has any.
- **Fix B**: Accept the exposure and record it in the plan (and as a roadmap item for rate limiting or invite-only trainers).
  - Strength: No code change; matches the product's current trust model, where trainers are expected to find trainees.
  - Tradeoff: Personal names stay listable by any self-registered trainer.
  - Confidence: HIGH — documentation-only.
  - Blind spot: GDPR expectations for trainee names have not been assessed.
- **Decision**: FIXED (Fix A) — 3-character minimum (spaces aside) added in place to the unpushed migration, plus `isSearchableTraineeQuery` in `src/lib/find-trainee.ts`, used by the service (new unit test) and `TraineeEmailSearch.tsx`.

### F2 — Choose trainee uses one-line rows, not the planned two-line rows

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/trainer/LinkedTraineeField.tsx:97, 139; src/components/trainer/TraineeInlineLabel.tsx (new)
- **Detail**:
  - The plan (Phase 3 §2) says the picker button and its list render `TraineeRowLabel` as two-line rows.
  - The code uses a new, unplanned `TraineeInlineLabel` instead. It shows one line, "**Ada Lovelace** (ada@example.com)", and falls back to the email alone when that does not fit.
  - Commit 7a62cdc describes this on purpose, and the kitchen sink matches it. But the plan's Phase 3 contract still says two-line rows, and Progress 3.5 ("two-line rows") is ticked.
- **Fix A ⭐ Recommended**: Amend the plan (Phase 3 §2, Desired End State, row 3.5) to describe the one-line `TraineeInlineLabel` rows and why.
  - Strength: Keeps work that was chosen deliberately and is already in the kitchen sink. The plan becomes accurate again before archive.
  - Tradeoff: The picker no longer matches the Collaborations layout, which change.md item 2 asked for ("presented the same way").
  - Confidence: HIGH — the commit body shows the change was intended.
  - Blind spot: Not confirmed whether the user approved the one-line form or only the implementing agent chose it.
- **Fix B**: Switch the picker to `TraineeRowLabel` as planned, and delete `TraineeInlineLabel`.
  - Strength: Matches change.md item 2 and the plan exactly; removes a component and a measuring hook dependency.
  - Tradeoff: Taller picker button; the E2E and kitchen sink need updating.
  - Confidence: MED — the one-line form may have been chosen for a layout reason not recorded.
  - Blind spot: Why it was changed during implementation.
- **Decision**: FIXED (Fix A) — plan amended: Desired End State, the Phase 3 overview, §2 (with an amendment note), §6 and the Manual criterion now describe one-line `TraineeInlineLabel` rows. Progress row 3.5 is not renamed, per the Progress convention, and refers to the amendment.

### F3 — Unplanned Measurements list tweaks and seed helper

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/measurements/MeasurementBrowser.tsx:1111, 1135; tests/e2e/measurement-seed-helpers.ts (new)
- **Detail**:
  - Phase 3 removed `mt-6` from the browser row and disabled the month button when there are no measurements.
  - The "Progression off" E2E now seeds its own entry with a new helper.
  - None of these are in the plan. The commit body mentions them, but they have no plan entry, and the disabled month button has no test.
- **Fix**: Add a short addendum to the plan's Phase 3 listing these three changes.
- **Decision**: FIXED — plan Phase 3 §7 addendum lists the three changes.

### F4 — Search query `q` is not validated with zod or length-capped

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/trainer-links/index.ts:49
- **Detail**:
  - `q` is passed straight to the RPC. CLAUDE.md says API input is validated with zod.
  - The new RPC splits `q` into words and runs three fold-and-`strpos` checks per word per row over an unindexed scan, so a query with hundreds of words multiplies the cost.
  - The missing validation predates this change, but the word split makes it matter more.
- **Fix**: Parse `q` with `z.string().trim().max(100)` and answer `{ trainees: [] }` when it is longer.
- **Decision**: FIXED — `searchQuerySchema` in `src/pages/api/trainer-links/index.ts`; a longer query answers `200 { trainees: [] }`.

### F5 — `fold_search_text` is exposed as a public RPC

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261102120000_search_unlinked_trainees.sql:20-22
- **Detail**:
  - The helper is granted to `authenticated`, so it is callable at `/rest/v1/rpc/fold_search_text`.
  - It leaks nothing. But the security definer RPC runs as its owner and does not need the grant.
- **Fix**: In the next migration, revoke execute on `public.fold_search_text(text)` from `authenticated`.
- **Decision**: FIXED — the unpushed migration now revokes from `public, anon, authenticated` and has no grant, because Supabase's default privileges would otherwise keep `authenticated`. Removed from `database.types.ts`. Verified locally: `authenticated` cannot execute the helper, and the search still finds "zolty" / "lu z" while returning nothing for "zo".

### F6 — TraineeInlineLabel stops measuring when a name first appears

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/trainer/TraineeInlineLabel.tsx:18-27
- **Detail**:
  - When there is no saved name, the component returns early and the measured refs are never attached.
  - `useElementWidth` runs its effect only once (`[]` deps). If the same instance later receives a name, the widths stay `null`, `fits` stays true, and the full line truncates instead of falling back to the email.
  - This does not happen today: the picker is server-rendered per selection.
- **Fix**: Key `TraineeInlineLabel` by email at its call sites (or always render the measured wrapper). Moot if F2 goes with Fix B.
- **Decision**: FIXED — `key={selected.email}` on the selected button's label in `LinkedTraineeField.tsx`. The list rows already remount per trainee through their parent's `key={link.traineeId}`.

### F7 — E2E not re-verified in this review

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A (rows 2.3, 3.4)
- **Detail**:
  - Something holds a lock on `dist/client` (EPERM), so `npm run build` and the Playwright web server fail on this machine.
  - The plan records E2E as green at 7a62cdc. All other automated checks pass here.
  - Manual row 3.5 is ticked with wording ("two-line rows") that does not match the code (see F2).
- **Fix**: Stop whatever process holds `dist/` (likely a leftover preview/workerd), then rerun `npx playwright test`, or rely on the CI `e2e` job for the PR.
- **Decision**: FIXED — stopped the orphaned `astro preview` and `workerd` that held `dist/`, and recreated the local E2E trainee (wiped by the `migration-check` reset). After the F1–F6 fixes, `npx playwright test` passed 37/37. The first run had one flaky failure (`measurements-menus` hamburger click, top bar, unrelated), and the rerun was green. `npm test` 407/407, lint clean.

## Triage summary

- Fixed: F1 (Fix A), F2 (Fix A), F3, F4, F5, F6, F7 (7)
