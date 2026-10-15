<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Reactive trainee search

- **Plan**: context/changes/reactive-trainee-search/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-15
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Verification

- `npm test` — pass (8 files, 103 tests)
- `npm run lint` — pass
- `npm run check:home-tokens` — pass (`check:home-tokens: clean`)
- `npm run smoke` — not re-run. Nothing answered on `http://localhost:4321`. The script still contains the planned steps: signed-out 401, uppercase-and-spaces search before the link, omission after the link, `Find trainee by email` in the body, trainee 403, and an empty RPC array.

## Findings

### F1 — Trainer card no longer says Measurements

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/trainer/TrainerPanel.astro:56
- **Detail**: The desired end state and phase 3 contract say the trainer card `h1` is `Measurements`. Manual step 3.4 is checked against `348461f`. `a17fa31` removed that heading from trainer mode and left it only on the unavailable branch (`Could not open your journal`, line 105). The form, placeholder, and `Body measurements` heading are otherwise in place.
- **Fix A ⭐ Recommended**: Put the `Measurements` heading back above the trainer form.
  - Strength: Matches the phase 3 contract and checked step 3.4. The list overlap is already handled by `z-30` on the search field.
  - Tradeoff: Undoes the follow-up that removed the heading on purpose.
  - Confidence: HIGH — the heading is a one-element restore, and the z-index change is separate.
  - Blind spot: Have not looked at the card in the browser, so the spacing reason for removing it is not confirmed.
- **Fix B**: Amend the plan so trainer mode has no card heading.
  - Strength: Keeps the follow-up that shipped.
  - Tradeoff: The written end state and a checked manual step stay false until the plan is rewritten.
  - Confidence: MEDIUM — the commit message states the removal, but the plan was not updated with it.
  - Blind spot: None significant beyond the unseen layout.
- **Decision**: FIXED via Fix B

### F2 — Finder input is type text

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/trainer/TraineeEmailSearch.tsx:139
- **Detail**: Phase 3 requires `type="email"` on the existing input. The field is `type="text"` with `inputMode="email"` and `autoComplete="off"`. `a17fa31` made that change to stop the browser warning while a partial sequence such as `nn` is typed. `id`, `name`, `required`, `aria-label="Email"`, and `placeholder="Find trainee by email"` match the contract.
- **Fix A ⭐ Recommended**: Keep `type="text"` and record that choice in the plan.
  - Strength: A search sequence is not a full email. `type="email"` shows the browser `@` warning the follow-up removed, which fights typing `nn`.
  - Tradeoff: The phase 3 contract stays wrong until the plan names `type="text"`.
  - Confidence: HIGH — the input still submits `name="email"`, and the link POST is unchanged.
  - Blind spot: Have not confirmed every browser's partial-email warning, only the commit's stated reason.
- **Fix B**: Restore `type="email"`.
  - Strength: Matches the written contract with a one-attribute change.
  - Tradeoff: Brings back the browser warning while the trainer types a fragment.
  - Confidence: HIGH — the attribute is the only contract miss on the input.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A

### F3 — Choosing an email can open the list again without an edit

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/trainer/TraineeEmailSearch.tsx:112
- **Detail**: The timing section and manual step 3.8 say a chosen email closes the list and must not search that same value again until the trainer edits the field. `choose` still sets `chosenEmail` and the effect bails out when the value equals that ref. `onFocus` and `onPointerDown` call `reopenList` (lines 146–147), which fetches the current value and opens the list again. `3ae8fd8` added that path. Step 3.8 remains checked against `348461f`, which is before this commit.
- **Fix A ⭐ Recommended**: Drop `reopenList` from focus and pointer down so the list stays closed until the value changes.
  - Strength: Matches the critical timing rule and checked step 3.8. `chosenEmail` already exists for this.
  - Tradeoff: A click back into the field no longer shows the same results. That is the behavior `3ae8fd8` added on purpose.
  - Confidence: MEDIUM — the plan is explicit, and the follow-up is also explicit.
  - Blind spot: Have not exercised the click-again path in the browser.
- **Fix B**: Keep reopen-on-click and amend the plan and step 3.8.
  - Strength: Preserves the follow-up usability change.
  - Tradeoff: The written “closed until edited” rule is no longer true.
  - Confidence: MEDIUM — depends on whether the next click is meant to be a new search.
  - Blind spot: Have not checked whether reopen fights the outside-click and Escape dismissals in practice.
- **Decision**: FIXED via Fix B

### F4 — Remembered trainee and journal page are outside the search slice

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: src/pages/measurements.astro:127
- **Detail**: `3ae8fd8` remembers the selected trainee in an httpOnly cookie `tm.measurements.trainee.<account>` for one year, and remembers the journal page in `tm.measurements.page.<account>.<subject>`. `preferredTraineeId` prefers the query id, then the cookie. The cookie is written only when the query id is the selected link. The same page memory is applied to the trainee's own journal: `readMeasurementPage` no longer starts at page 1 for a trainee or for a trainer preview. Touched files include `src/lib/trainer-preview.ts`, `src/lib/measurement-page.ts`, `src/components/measurements/MeasurementBrowser.tsx`, and their tests. The plan does not mention navigation memory. The linked-list `localeCompare` order is unchanged.
- **Fix A ⭐ Recommended**: Record this as an addendum on the plan and keep the code.
  - Strength: The preference helpers are tested, and the cookie is written only for a trainee id already in this trainer's links. The storage shape matches the existing day and page-size keys.
  - Tradeoff: This change then includes trainee journal paging, which the search slice did not scope.
  - Confidence: MEDIUM — the diff and unit tests show the behavior; the browser path was not re-run in this review.
  - Blind spot: Have not confirmed a stale cookie for a trainee who was later unlinked.
- **Fix B**: Revert the trainee-memory and journal-page work from this change.
  - Strength: Leaves the slice as search, endpoint, and finder field.
  - Tradeoff: Drops a tested navigation fix and the unit tests that landed with it.
  - Confidence: MEDIUM — the revert is mechanical, but callers of the new keys would need a pass.
  - Blind spot: Have not listed every caller beyond the diff.
- **Decision**: FIXED via Fix A

### F5 — Link trainee uses a new smoke color

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/button.tsx:13
- **Detail**: `3ae8fd8` adds a `smoke` button variant, `--smoke` and `--smoke-foreground` in `src/styles/global.css`, and sets `Link trainee` to `variant="smoke"` in `TrainerPanel.astro:64`. The kitchen-sink note was updated to `hover:bg-smoke/90`. The plan said to keep the existing submit control and did not ask for a new color.
- **Fix**: Record the smoke variant as a visual addendum, or revert `Link trainee` to the previous variant and remove the unused tokens.
- **Decision**: FIXED

### F6 — Two manual cap checks have no fixture

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/reactive-trainee-search/plan.md:254
- **Detail**: Steps 2.2 and 2.3 are checked. The migration does `limit 10`, orders by the normalized email, and excludes only `trainer_links` rows for `auth.uid()`. Smoke covers one trainee before and after a link. Nothing in the diff creates eleven matching emails or a second trainer. Steps 3.4 and 3.8 are also checked, and the current tree contradicts them (see F1 and F3) because later commits landed after `348461f`.
- **Fix**: Re-check the eleven-email cap and the other-trainer case before archive. Treat 3.4 and 3.8 as settled only after F1 and F3 are decided.
- **Decision**: FIXED
