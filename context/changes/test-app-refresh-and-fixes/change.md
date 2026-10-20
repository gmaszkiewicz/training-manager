---
change_id: test-app-refresh-and-fixes
title: Refresh the test plan, expand app tests, and fix iOS Safari menus
status: implemented
created: 2026-10-20
updated: 2026-10-20
archived_at: null
---

## Notes

S-34 / MS-26. Reused this folder instead of opening a second `test-plan-refresh-2026-10-20`.

Implemented 2026-10-20: shared DropdownMenu click-open fix; `tests/e2e/measurements-menus.spec.ts`; manual Safari iOS/Firefox checklist; `test-plan.md` refresh (risks #7–#8, phases 6–7, §4/§6.6/§7/§8). Risk #8 documented as already covered — no new delta tests. Complete the manual checklist on a real phone before treating Safari as verified.

Refresh `context/foundation/test-plan.md`. Do not edit that file until the plan's final sub-phase (and only with the accepted updates below). After research, follow the downstream continuation rule: next natural command is `/10x-plan`, then `/10x-implement`.

https://github.com/gmaszkiewicz/training-manager/issues/118

### Guide today (last updated 2026-10-06)

All five rollout phases are complete:

- Phase 1 — Delta after edit and delete (#1, #4), unit on the comparison rule.
- Phase 2 — Measurement access boundaries (#2, #3), smoke at the request boundary.
- Phase 3 — Reject illegal measurements (#5), rejection unit plus future-date create on an empty journal.
- Phase 4 — Hosted migration preserves measurements (#6), local Supabase check.
- Phase 5 — Saved edit reaches the arrow (#1), one smoke edit.

Section 7 excludes kitchen-sink screens, visual restyles, and a broad browser/screenshot suite beyond the signed-out seed. Stack grounding dates are 2026-10-05.

### Stale

- Product surface shipped after the guide: measured-on with time, month paging, query optimization (delta when the previous entry sits outside the page), password reminder and Profile password change, entry-delta preview, calendar UI, linked-trainee picker, reactive trainee search, mobile measurements layout, default accordion and page size (roadmap S-22…S-33).
- Test base: Vitest + Playwright still configured; **12** test files now (mostly `src/lib`, plus 2 e2e). Guide §4 still says four product test files. Profile remains **sparse**.
- Hot-spots (30d, scopes `src`, `scripts`, `supabase`): 125 commits. Top dirs: `src/components/measurements` (64), `src/pages/api` (44), `src/pages/kitchen-sink` (41), `src/components/auth` / `trainer` (34). Previous guide window: 51 commits.
- Stack grounding tools need a fresh `checked:` date (2026-10-20): Context7 not available in session; WebSearch available; cursor-ide-browser available and unused as a test layer; no Supabase or Cloudflare docs MCP.

### Missing

- No risk for phone-width / non-daily browsers (Safari iOS, Firefox) where the hamburger or row actions need a second tap (or never open), so Sign out or edit/delete is unreachable.
- No risk for a month page that shows the wrong arrow or difference when the previous entry sits outside that page (S-24 / MS-16). Research must verify whether existing units already cover this before planning a new phase.

### Interview (2026-10-20)

- Q1: Most worried about breakage on devices and browsers not used daily — especially iPhone Safari and Firefox.
- Q2: So far so good — no past burn in this codebase.
- Q3: Changes the measurements mobile layout without feeling confident.
- Q4: Scary gap is no real-device or cross-browser check for hamburger / row actions on the phone layout.
- Q5: Do not spend budget on kitchen-sink screens or visual restyles.

### Accepted updates for the later plan

Keep risks #1–#6 and phases 1–5 as complete history. Append new risks and new §3 phases. Do not rewrite §1/§2 in place until the implement plan's final sub-phase explicitly updates the guide.

**New risk A (mobile / cross-browser menus)** — On a phone-width layout, the hamburger or row actions need a second tap (or never open) on Safari iOS or Firefox, so the user cannot reach Sign out or entry edit/delete. Impact High. Likelihood High. Source: interview Q1, Q3, Q4; roadmap S-34 / MS-26; hot-spot `src/components/measurements` (64 commits/30d).

Response A:

- Prove: on a phone-width viewport in the browsers under test, one tap opens the hamburger and exposes Sign out; one tap opens row actions for edit/delete.
- Challenge: a desktop Chromium pass proves Safari iOS / Firefox; a visual restyle without interaction proves the menu; kitchen-sink coverage stands in for the live measurements screen.
- Context for research: how the top bar and row-action menus open (pointer vs click), which Playwright projects/browsers exist, and what already covers mobile.
- Likely cheapest layer: targeted Playwright (or equivalent) on phone-width against the live measurements screen — not a full multi-browser matrix of every page.
- Avoid: screenshot-only suites; kitchen-sink as the oracle; asserting CSS class names instead of reachable Sign out / edit / delete.

**New risk B (off-page previous entry delta)** — A calendar-month page shows the wrong arrow or difference because the previous entry sits outside that page. Impact High. Likelihood Medium. Source: roadmap S-24 / MS-16; PRD Business Logic; hot-spot `src/components/measurements` and `src/lib/services`.

Response B:

- Prove: for the same stored entries, a month page whose previous remaining entry is outside the page still shows the same arrow and difference as the full-journal rule.
- Challenge: paging tests that only check row count prove the delta; sharing one in-memory list with the page proves the production query path.
- Context for research: whether `measurement-previous` / page units already lock this; where the previous-entry lookup runs relative to the page query.
- Likely cheapest layer: unit (or thin integration) if missing; do not promote to e2e if a deterministic unit already catches it.
- Avoid: browser tour of scrolling; implementation-mirror oracle; duplicating an existing green unit.

**Section 3 — proposed new phases (not started), order:**

1. Refresh guide strategy — write the accepted §2/§4/§7/§8 updates and add the new phase rows (documentation phase inside this change).
2. Off-page previous-entry delta — prove risk B if research finds a gap; skip with a note if already covered.
3. Phone-width first-tap menus — prove risk A and ship the Safari iOS first-tap fix (product + test).
4. Expand application tests / cookbook — land §6 patterns for the new risks; refresh test-base counts in §4.

**Section 7:** keep kitchen-sink and visual restyles excluded. Do not open a broad screenshot matrix; only the targeted menu interaction for risk A.

**Challenger findings accepted:**

- No full multi-browser matrix for every page.
- Password reminder/change not elevated (interview silent); ownership risks stay covered by shipped phases.
- Reuse `test-app-refresh-and-fixes` — do not open a duplicate `test-plan-refresh-2026-10-20` folder.
