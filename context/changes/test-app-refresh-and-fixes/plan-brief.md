# Refresh the test plan, expand app tests, and fix iOS Safari menus — Plan Brief

> Full plan: `context/changes/test-app-refresh-and-fixes/plan.md`
> Research: `context/changes/test-app-refresh-and-fixes/research.md`

## What & Why

S-34 / MS-26 is already shipped: phone-width menus open on the first click, and the test plan records that plus the off-page delta coverage. This plan exists so implement can verify those artifacts and archive can read Progress. It does not rebuild the fix or the guide.

## Starting Point

`DropdownMenuTrigger` defers open from `pointerdown` to `click`. `tests/e2e/measurements-menus.spec.ts` checks Menu → Sign out and row Actions → Edit / Delete at 360×800 on Desktop Chromium. The Safari iOS and Firefox checklist passed on 2026-10-20. Off-page deltas stay in `measurement-page.test.ts` and the June smoke `weightDelta` up 8. `test-plan.md` already lists risks #7–#8 and rollout phases 6–7. `change.md` is `implemented`. Roadmap S-34 is `done`.

## Desired End State

The same behavior stays in place and is checked: one click on a phone-width measurements screen reaches Sign out, Edit, and Delete in Chromium; the manual checklist still covers Safari iOS and Firefox; a month page whose previous entry sits outside the page still relies on the existing unit and June smoke; the refreshed guide is the one a maintainer follows. Progress rows in this change match those checks.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Plan job | Close-out of shipped work | The code, spec, checklist, and guide are already in the repo | Plan |
| Risk #7 proof | Chromium e2e at 360×800, plus the manual Safari iOS and Firefox checklist | Desktop Chromium does not prove those engines, and CI stays Chromium-only | Research |
| Menu fix | Shared DropdownMenu click-open | Hamburger and row actions share one trigger | Research |
| Risk #8 | No new unit, e2e, or smoke | `deltasForVisiblePage` and June `weightDelta` up 8 already cover it | Research |
| Cookbook | Confirmed inside the guide check | §6.6 already records the menu pattern | Plan |
| Lifecycle | Leave `implemented` and roadmap `done` | Planning after the fact must not move status backward | Plan |

## Scope

**In scope:**

- Confirm `src/components/ui/dropdown-menu.tsx`, `tests/e2e/measurements-menus.spec.ts`, and `manual-menus-checklist.md`
- Confirm `measurement-page.test.ts` still passes and June smoke still expects weight up 8
- Confirm `context/foundation/test-plan.md` still records risks #7–#8, phases 6–7, §4 counts, §6.6, and §7

**Out of scope:**

- Rewriting shipped code or the guide
- WebKit or Firefox Playwright projects
- New Risk #8 tests, including same-month `page=2` smoke
- Kitchen-sink, screenshots, or a full multi-browser matrix
- A second change folder

## Architecture / Approach

Verification only, in shipped order. Phase 1 re-runs the menu spec and checks the shared trigger. Phase 2 re-runs the page unit and checks the June expectation string. Phase 3 checks the guide strings. A failing check is a mismatch to report.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Phone-width first-tap menus | Green menu spec and an intact click-open trigger; checklist still passed | Playwright needs the local E2E stack |
| 2. Off-page previous-entry delta | Green page unit; June smoke still expects weight up 8 | A new delta test would duplicate coverage |
| 3. Test-plan refresh | Guide strings for #7, #8, §6.6, and §7 still match | A rewrite would drift from the accepted record |

**Prerequisites:** Local Supabase and E2E env for the Playwright spec. Issue [#118](https://github.com/gmaszkiewicz/training-manager/issues/118).
**Estimated effort:** One verification session across 3 phases.

## Open Risks & Assumptions

- The 2026-10-20 device pass stays the Safari iOS and Firefox proof unless the checklist file changes.
- Playwright's webServer build can fail for reasons outside this change (env, port 4321, Supabase).
- Assumption: `change.md` staying `implemented` is correct because the product work landed before this plan.

## Success Criteria (Summary)

- `npx playwright test tests/e2e/measurements-menus.spec.ts` passes, and the manual checklist still says Passed 2026-10-20.
- `npm test -- src/lib/measurement-page.test.ts` passes, and June smoke still expects weight up 8.
- `test-plan.md` still records the S-34 risks, phases, counts, §6.6, and §7 exclusions.
