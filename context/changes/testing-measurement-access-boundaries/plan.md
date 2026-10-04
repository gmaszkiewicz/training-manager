# Measurement Access Boundaries Implementation Plan

## Overview

Extend the live smoke script so a second trainee cannot read or change another trainee's measurement, a trainer cannot edit or delete one, and a trainer query for someone never linked shows a linked trainee's note instead of that person's note. Record that pattern in the test-plan cookbook.

## Current State Analysis

`scripts/smoke.mjs` already signs in two trainees and a trainer against a running app and local Supabase. It posts anonymously to `/api/measurements` and expects `/auth/signin`. It rejects a trainer create, an unknown email, and a trainer email. A trainer with no links sees the finder. After both trainees are linked, the default preview shows the later note and hides the earlier one, and `?trainee=<first id>` shows the earlier note.

The script does not capture a measurement id. It does not ask the second trainee for the first trainee's journal or post an update or delete of that row. It does not post a trainer edit or delete. It does not request a trainee who was never linked. The last owner check only looks for "Add measurement".

Vitest covers pure helpers. It does not call these routes. The journal page lists a trainee's own rows and ignores `?trainee=`. Trainer preview falls back to a linked trainee when the query id is not linked. Update and delete bind the row to the session user, and a miss redirects with `error=` after `edit=` or `delete=`.

## Desired End State

One smoke run proves the three gaps. A second trainee who requests the first trainee's id still sees only their own note, and a legal update or delete of the first trainee's measurement does not replace that note. A trainer's legal edit and delete of the same measurement are refused the same way. A trainer who already has links, and who requests a third trainee they never linked, sees one of the linked notes and does not see the third trainee's note. The test-plan cookbook names this smoke pattern. The existing anonymous POST still targets `/api/measurements`.

### Key Discoveries:

- Anonymous add already posts to `/api/measurements` and expects `/auth/signin` (`scripts/smoke.mjs:157-162`).
- The second trainee's own journal starts empty of the first trainee's data (`scripts/smoke.mjs:299-301`). Linked preview isolation is already asserted (`scripts/smoke.mjs:329-342`). The owner check does not yet require the original note (`scripts/smoke.mjs:355-357`).
- A trainee list uses the session user id and ignores `?trainee=` (`src/pages/measurements.astro:49-54`). The edit link embeds the measurement id (`src/components/journal/TraineeJournal.astro:25-26`).
- Update and delete require both the measurement id and the session user id. A miss returns not ok (`src/lib/services/measurements.ts:92-97`, `src/lib/services/measurements.ts:114-120`). The error redirect is `/measurements?edit=<id>&error=` or `/measurements?delete=<id>&error=` (`src/pages/api/measurements/[id].ts:11-14`, `src/pages/api/measurements/[id]/delete.ts:18-21`).
- An unmatched trainer query selects another linked trainee (`src/lib/trainer-preview.ts:17-35`). The page loads measurements only for that selected link (`src/pages/measurements.astro:73-77`).

## What We're NOT Doing

- A Vitest suite that fakes the session or Supabase, or that fetches a live server.
- A new mock library, Playwright, or a kitchen-sink check.
- A product change that returns 403 or an empty journal for an unlinked query.
- Duplicate smoke steps for the anonymous POST, trainer create, unknown email, trainer email, the zero-link finder, or the already-linked A/B preview.
- Delta cases (rollout phase 1) or illegal-measurement rejection (rollout phase 3).

## Implementation Approach

Add steps to the existing sequential cookie jar in `scripts/smoke.mjs`. Capture the measurement id from the edit link on the first trainee's `smoke-earlier-trainee-note` row. Reuse the script's legal measurement form so a refusal is the ownership check, not a validation error. Prove each refused write twice: the response location contains `error=`, and the owner's later journal still shows `smoke-earlier-trainee-note` and hides the attacker note. For the never-linked query, accept either linked note. Leave the helper's one-cookie session and the steps that already pass as they are.

## Critical Implementation Details

- **State sequencing** — The script has one cookie jar. Capture the id while the first trainee is signed in. That id is the `edit=` link on the row whose note is `smoke-earlier-trainee-note`, not the first `edit=` in the document. Run the second trainee's query and writes after that trainee has saved `smoke-later-trainee-note` and before their sign-out. Create the third trainee, save their unique note, and remember their user id, then sign them out with `POST /api/auth/signout` before the trainer's preview sign-in. Never post that email to `/api/trainer-links`. Run the trainer writes and the unlinked query during that preview session, before the final owner sign-in. The owner survival check belongs on that final journal GET, so it sees every refused write.
- **Redirect shape** — A successful save redirects to exactly `/measurements`. A refused edit or delete redirects to `/measurements?edit=<id>&error=` or `/measurements?delete=<id>&error=`. A location check that only requires a `/measurements` prefix treats a successful overwrite as a refusal. The new write steps must require `error=` in the location. A starts-with check for `/measurements?error=` fails these redirects because `edit=` or `delete=` comes first.

## Phase 1: Cross-trainee refusal

### Overview

Remember the owner's measurement id, then prove the second trainee cannot read that journal or change that row.

### Changes Required:

#### 1. Smoke script

**File**: `scripts/smoke.mjs`

**Intent**: Store one measurement id from the first trainee's journal HTML, and add the second trainee's read and write steps plus the owner survival check. A signed-in session must not be enough to open or change the other row.

**Contract**: On the existing owner journal step, read the `edit=` UUID from the entry whose note is `smoke-earlier-trainee-note` into a `measurementId`. If that note's edit link is absent, that step fails. After the second trainee's own saves, `GET /measurements?trainee=<first trainee id>` expects body `smoke-later-trainee-note` and forbids `smoke-earlier-trainee-note`. Then POST a legal `measurementForm` whose note is `smoke-foreign-write-note` to `/api/measurements/<measurementId>` and to `/api/measurements/<measurementId>/delete`. Each expects status 302 and a location that contains `error=`. The final owner journal step expects `smoke-earlier-trainee-note` and forbids `smoke-foreign-write-note`. The expectation helper must be able to require a location substring; a `/measurements` prefix alone is not the refusal signal.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` exits 0
- The second-trainee query expects `smoke-later-trainee-note` and forbids `smoke-earlier-trainee-note`
- The second trainee's legal update and delete expect 302 and a location containing `error=`

#### Manual Verification:

- The captured id is the edit= UUID on the entry that shows `smoke-earlier-trainee-note`, and the posted form is a legal measurement whose note is `smoke-foreign-write-note`
- The final owner journal expects `smoke-earlier-trainee-note` and forbids `smoke-foreign-write-note`, and those strings come from the script constants

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Trainer write refusal

### Overview

Prove a linked trainer cannot edit or delete the captured measurement, and the owner's note still survives.

### Changes Required:

#### 1. Smoke script

**File**: `scripts/smoke.mjs`

**Intent**: While the trainer is signed in for preview, post the same legal form to the captured measurement's update and delete routes. A preview grant is not a write grant. The phase 1 owner check is the proof the row stayed put.

**Contract**: Insert both POSTs after the trainer has linked both existing trainees and before the sign-out that returns to the owner. Use `measurementForm` with note `smoke-foreign-write-note`. Each expects status 302 and a location containing `error=`. Do not drop the phase 1 forbid of that note on the final owner GET. Do not add another trainer-create step.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` exits 0
- The trainer update and delete of the captured id expect 302 and a location containing `error=`

#### Manual Verification:

- Those posts use the legal measurement form and `smoke-foreign-write-note`, and the final owner step still forbids that note

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Never-linked preview

### Overview

Prove a trainer query for a trainee who was never linked shows a linked note and hides that trainee's note.

### Changes Required:

#### 1. Smoke script

**File**: `scripts/smoke.mjs`

**Intent**: Add a third trainee with a unique note, never link them, and request their id during the trainer preview. The check catches the wrong journal opening. It does not lock which linked trainee the fallback selects, and it does not demand a 403 or an empty journal.

**Contract**: Add `unlinkedEmail` and `unlinkedNote` (`smoke-unlinked-trainee-note`). After the second trainee's writes and before the trainer preview sign-in, sign up that trainee, open `/measurements` so the profile exists, save one legal entry with `unlinkedNote`, and remember the user id the same way `rememberTrainee` does. Then sign out with `POST /api/auth/signout`, the same switch the other accounts use, before the trainer signs in. Do not post `unlinkedEmail` to `/api/trainer-links`. During the trainer preview session, `GET /measurements?trainee=<unlinked user id>` passes when the body contains at least one of `smoke-earlier-trainee-note` or `smoke-later-trainee-note`, and forbids `smoke-unlinked-trainee-note`.

```js
{ status: 200, bodyAny: [earlierNote, laterNote], forbid: unlinkedNote }
```

### Success Criteria:

#### Automated Verification:

- `npm run smoke` exits 0
- The never-linked query accepts either linked note and forbids `smoke-unlinked-trainee-note`

#### Manual Verification:

- The third trainee is signed out after their id is remembered and before the trainer preview sign-in, is never linked, and the step does not require a 403, an empty journal, or one specific linked trainee

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Cookbook

### Overview

Record the smoke pattern in the test plan, and confirm the anonymous add still targets the current journal route.

### Changes Required:

#### 1. Test plan cookbook and stack note

**File**: `context/foundation/test-plan.md`

**Intent**: Replace the §6.2 placeholder so the next access check extends this smoke script. Note in §6.5 that this phase shipped. Correct the §4 sentence that says phase 2 adds its request checks to Vitest.

**Contract**: §6.2 names `scripts/smoke.mjs`, the second-trainee query and legal writes, the trainer edit and delete, and the never-linked query that accepts either linked note and forbids the unlinked note. §6.5 records that rollout phase 2 shipped those steps, that no Vitest auth or database mock was added, and that no AI-native check was added, checked 2026-10-04. In §4, phase 2's request boundary is `scripts/smoke.mjs`. Rollout phase 3 still adds its rejection request to Vitest. Do not add a second anonymous POST. The existing step remains `POST /api/measurements` expecting `/auth/signin`.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0
- The anonymous measurement step still posts to `/api/measurements` and expects `/auth/signin`

#### Manual Verification:

- §6.2 names the smoke pattern, including either linked note and the forbid on `smoke-unlinked-trainee-note`
- §6.5 records the shipped smoke steps, no Vitest auth mock, and no AI-native check, checked 2026-10-04

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new Vitest file. `npm test` stays green because this change does not edit the pure helpers.

### Integration Tests:

- `npm run smoke` is the request-boundary check. It needs the same running app and local Supabase the CI smoke job uses. `BASE_URL` defaults to `http://localhost:4321`.

### Manual Testing Steps:

1. Read the new smoke expectations against the constants in this plan, not against a page that already showed the wrong journal.
2. Confirm §6.2 and §6.5 match phase 4.
3. Confirm the original anonymous POST step is unchanged.

## Performance Considerations

The script gains a third signup and a handful of journal and write requests. That stays inside the existing sequential smoke run. No application change and no new latency budget.

## Migration Notes

No schema, migration, or data backfill. Production access rules stay as they are.

## References

- Rollout guide: `context/foundation/test-plan.md` §2 risks #2 and #3, §3 phase 2, §4, §6.2
- Smoke script: `scripts/smoke.mjs:157-162`, `scripts/smoke.mjs:299-357`
- Trainee list ignores `?trainee=`: `src/pages/measurements.astro:49-54`
- Edit link carries the measurement id: `src/components/journal/TraineeJournal.astro:25-26`
- Refused update and delete redirects: `src/pages/api/measurements/[id].ts:11-14`, `src/pages/api/measurements/[id]/delete.ts:18-21`
- Unmatched preview falls back to a linked trainee: `src/lib/trainer-preview.ts:17-35`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Cross-trainee refusal

#### Automated

- [ ] 1.1 `npm run smoke` exits 0
- [ ] 1.2 The second-trainee query expects `smoke-later-trainee-note` and forbids `smoke-earlier-trainee-note`
- [ ] 1.3 The second trainee's legal update and delete expect 302 and a location containing `error=`

#### Manual

- [ ] 1.4 The captured id is the edit= UUID on the entry that shows `smoke-earlier-trainee-note`, and the posted form is a legal measurement whose note is `smoke-foreign-write-note`
- [ ] 1.5 The final owner journal expects `smoke-earlier-trainee-note` and forbids `smoke-foreign-write-note`, and those strings come from the script constants

### Phase 2: Trainer write refusal

#### Automated

- [ ] 2.1 `npm run smoke` exits 0
- [ ] 2.2 The trainer update and delete of the captured id expect 302 and a location containing `error=`

#### Manual

- [ ] 2.3 Those posts use the legal measurement form and `smoke-foreign-write-note`, and the final owner step still forbids that note

### Phase 3: Never-linked preview

#### Automated

- [ ] 3.1 `npm run smoke` exits 0
- [ ] 3.2 The never-linked query accepts either linked note and forbids `smoke-unlinked-trainee-note`

#### Manual

- [ ] 3.3 The third trainee is signed out after their id is remembered and before the trainer preview sign-in, is never linked, and the step does not require a 403, an empty journal, or one specific linked trainee

### Phase 4: Cookbook

#### Automated

- [ ] 4.1 `npm test` exits 0
- [ ] 4.2 The anonymous measurement step still posts to `/api/measurements` and expects `/auth/signin`

#### Manual

- [ ] 4.3 §6.2 names the smoke pattern, including either linked note and the forbid on `smoke-unlinked-trainee-note`
- [ ] 4.4 §6.5 records the shipped smoke steps, no Vitest auth mock, and no AI-native check, checked 2026-10-04
