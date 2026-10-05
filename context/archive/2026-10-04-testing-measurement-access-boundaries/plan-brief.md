# Measurement Access Boundaries — Plan Brief

> Full plan: `context/changes/testing-measurement-access-boundaries/plan.md`

## What & Why

A signed-in user must not read or change body measurements they do not own, and an email link must not open the wrong journal. The live smoke script already covers anonymous add, trainer create, bad emails, and a preview of two linked trainees. This plan fills the gaps that script does not hit.

## Starting Point

`scripts/smoke.mjs` runs two trainees and a trainer against the real routes. Vitest does not call those routes. Update and delete already bind the row to the session user. A trainer query for an id that is not linked falls back to a linked trainee.

## Desired End State

Smoke proves three things. The second trainee still sees only their own note when they pass the first trainee's id, and a legal edit or delete does not replace the owner's note. The trainer's edit and delete of that same row are refused, and the owner's note remains. A query for a third trainee who was never linked shows a linked note and hides the third note. The cookbook tells the next access check to extend this script.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Where the checks run | Extend `scripts/smoke.mjs` | It already has two users, real cookies, and the CI smoke job | Plan |
| Unlinked `?trainee=` | Show a linked note and hide the never-linked note | That catches the wrong journal and matches the current fallback | Plan |
| Refused write | `error=` on the redirect, and the owner's original note still present | A redirect alone can hide a write that saved | Plan |
| Anonymous add | Keep the existing `POST /api/measurements` step | It already expects `/auth/signin` | Test plan |
| Stand-in | No Vitest auth or database mock | A fake session can pass while the real boundary is open | Plan |

## Scope

**In scope:**

- Capture the measurement id from the edit link on the `smoke-earlier-trainee-note` row
- Second trainee query, update, and delete of that row
- Trainer update and delete of that row
- A third trainee who is never linked, and the trainer query for their id
- Cookbook §6.2 and §6.5, plus the §4 note that phase 2 lives in smoke

**Out of scope:**

- Vitest request tests, a mock library, Playwright, kitchen-sink screens
- A 403 or an empty journal for the unlinked query
- Duplicate steps smoke already has
- Delta cases and illegal-measurement rejection

## Architecture / Approach

The script keeps one cookie jar. It remembers the measurement id from the edit link on the `smoke-earlier-trainee-note` row, posts a legal form with `smoke-foreign-write-note` for the foreign writes, and checks the owner's note only after those writes. The third trainee is signed out before the trainer preview sign-in. The unlinked step passes if either linked note is present. A `/measurements` prefix is not treated as a refusal, because a successful save uses that same prefix.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Cross-trainee refusal | Second trainee cannot read or change the captured row | A validation error is mistaken for an ownership refusal |
| 2. Trainer write refusal | Trainer edit and delete are refused and the note remains | The preview session is treated as a write grant |
| 3. Never-linked preview | Unlinked query shows a linked note and hides the third note | The step locks one fallback trainee, or demands a 403 |
| 4. Cookbook | §6.2, §6.5, and the anonymous route confirmation | A second anonymous POST duplicates the existing step |

**Prerequisites:** Rollout phase 1 is complete. `npm run smoke` needs the app and local Supabase, with `BASE_URL` defaulting to `http://localhost:4321`.
**Estimated effort:** One session. Four short phases. Almost all of the code change is `scripts/smoke.mjs`.

## Open Risks & Assumptions

- `npm test` does not start the server. The access proof is `npm run smoke`.
- The smoke key is the user-scoped key the current CI smoke job uses, so row security applies.
- The expectation helper must grow a location substring and a body that may match either linked note.

## Success Criteria (Summary)

- Another trainee's note stays hidden, and a legal foreign edit or delete leaves `smoke-earlier-trainee-note` in place.
- A trainer cannot edit or delete that measurement, and a never-linked query does not show `smoke-unlinked-trainee-note`.
- The cookbook points the next access check at this smoke pattern.
