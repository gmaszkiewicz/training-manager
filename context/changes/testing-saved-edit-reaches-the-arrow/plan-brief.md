# Saved Edit Reaches the Arrow — Plan Brief

> Full plan: `context/changes/testing-saved-edit-reaches-the-arrow/plan.md`
> Research: `context/changes/testing-saved-edit-reaches-the-arrow/research.md`

## What & Why

One persisted weight edit must change the difference the journal lists. The comparison rule is already locked in memory. This phase proves the saved number is the one that reaches the arrow.

## Starting Point

Smoke creates `2026-01-01` / `80.0` and `2026-01-02` / `78.5`, then expects `↓ 1.5`, and signs out. A successful edit writes `weight_kg` and the next list computes `formatDelta`. Nothing in that script reads a difference after a save. The cookbook still marks this pattern TBD.

## Desired End State

Smoke edits that `2026-01-02` row to `81.0`, keeps the date and the note, and the next journal read lists `↑ 1.0` and drops `↓ 1.5`. The test-plan cookbook tells the next check to extend that step. The in-memory unit file is unchanged.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Saved weight | `81.0`, list `↑ 1.0`, forbid `↓ 1.5` | Direction and amount both change against the untouched `80.0` row, and 81 is the saved weight the in-memory unit already uses | Plan |
| Where the steps go | After the `↓ 1.5` GET, before sign-out | That GET sets `measurementId`, and the first trainee's cookie is still in the jar | Research |
| Date and note | Keep `2026-01-02` and `smoke-earlier-trainee-note` | Later checks stay on the same row, and the two dates stay apart so the `created_at` rewrite does not change the previous row | Research |
| Success redirect | Exact `/measurements` | A failed update redirects to a URL that only starts with `/measurements` | Research |
| Layer | One smoke edit | Risk #1 forbids a new in-memory unit, a `withDeltas` call from smoke, and Playwright for this write | Research |
| Cookbook | Fill §6.4, §6.5, §4, and the §5 gate; leave §1–§3 and §8 | Phase 3 recorded its smoke pattern the same way, and the orchestrator owns §3 status | Plan |

## Scope

**In scope:**

- Two steps in `scripts/smoke.mjs`: the `81.0` POST and the following journal GET
- Cookbook, stack note, and saved-edit gate in `context/foundation/test-plan.md`

**Out of scope:**

- `src/lib/measurement-deltas.test.ts` and any new unit
- Calling `withDeltas` from smoke, or adding Playwright
- A same-date note-only save, a delete, or a date change
- Weight `80.0` or a listed `0.0`
- Product code for the edit route, the delta rule, or the list
- §1, §2, §3, and §8 of the test plan

## Architecture / Approach

The edit route already persists the weight. The list already formats the arrow. This change only extends the live smoke script at the moment the first trainee still owns the `78.5` row, then writes that pattern into the cookbook.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Saved weight lists ↑ 1.0 | Smoke posts `81.0` and the next list shows `↑ 1.0` | The step runs after sign-out, or a prefix location check accepts an error redirect |
| 2. Cookbook | §6.4, §6.5, §4, and §5 describe that step | The guide still says the pattern is TBD after the script has shipped |

**Prerequisites:** Phase 1's comparison-rule unit is already in place. `npm run smoke` needs the same running app and local Supabase the CI smoke job uses.
**Estimated effort:** One session across two small phases.

## Open Risks & Assumptions

- The update rewrites `created_at`. This pair stays on two dates, so the previous row remains `80.0`. An edit that put both rows on one date would make `↑ 1.0` the wrong proof.
- Body checks are global substrings. On this pair the circumference deltas are `0.0`, so `↑ 1.0` and `↓ 1.5` belong to the weight.
- `npm run smoke` fails when the preview or local Supabase is down. That failure is environmental.

## Success Criteria (Summary)

- After the `81.0` save, the journal lists `↑ 1.0`.
- That same read no longer lists `↓ 1.5`.
- The cookbook names this smoke step, and the saved-edit gate is required.
