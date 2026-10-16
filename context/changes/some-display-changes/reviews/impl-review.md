<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Inline measurement errors and clearer button states

- **Plan**: context/changes/some-display-changes/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-16
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Duplicate date uses a bubble and is checked before Add

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: src/components/measurements/MeasurementForm.tsx:722
- **Detail**: The phase 1 contract still says Date and Note render through `FieldError` and are not candidates for a bubble, and that those messages appear on Add. `3058b93` renders `A measurement at that date and time already exists.` in `FieldBubble` above the date (`MeasurementForm.tsx:722`), forces it visible while the picker is open, and sets it as soon as the day or clock changes. Submit always `preventDefault`s and `fetch`es with `Accept: application/json` (`MeasurementForm.tsx:674`) instead of posting the form. A 409 keeps the entered values. The occupied-minute list is loaded by `readOccupiedMinutes` (`src/lib/services/measurements.ts:122`), passed through `src/pages/measurements.astro` and `TraineeJournal.astro`. Create and update return JSON 409 for that sentence. The heading `mb-6` is unchanged. Measurement bubbles, `measurementFieldMessage`, FormField, and the shared button still match the amended plan. The unique index still rejects a taken minute.
- **Fix A ⭐ Recommended**: Record the duplicate-date bubble, the pre-Add check, and the JSON save in the plan.
  - Strength: Keeps the path already committed in `3058b93`. The unique index and the 409 still stop a second row at that minute.
  - Tradeoff: The plan's Date/Note exclusion becomes a narrower rule, and the save path is no longer a native form post.
  - Confidence: HIGH — the commit message states this behavior, and the bubble is limited to the duplicate sentence.
  - Blind spot: Whether this belongs in S-30 or a follow-up change is undecided.
- **Fix B**: Remove the date bubble, the occupied-minute read, and the JSON submit, and restore the native form post.
  - Strength: Restores the contract that Date errors stay under the control and appear on Add.
  - Tradeoff: Drops the immediate duplicate hint and the keep-values-on-409 behavior.
  - Confidence: MEDIUM — the server duplicate sentence already existed before this commit, so the hint is new and the rejection is not.
  - Blind spot: Haven't checked whether anything besides `MeasurementForm` calls the new JSON shape.
- **Decision**: Fixed via Fix A

### F2 — JSON save treats a redirect as success

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/measurements/MeasurementForm.tsx:687
- **Detail**: `handleSubmit` follows `fetch` redirects. `response.ok` then runs `window.location.assign("/measurements")` and drops the form. Create still redirects when the user is signed out (`src/pages/api/measurements/index.ts:112`) and when Supabase is missing (`index.ts:117` via `measurementsError`, which never checks `Accept`). Update uses `saveResponse` for the missing-Supabase case, so create and update disagree. A signed-out response becomes the sign-in page, which is 200, so the form reports success and navigates to `/measurements`. A non-OK body with no `error` string, and the `fetch` `.catch` (`MeasurementForm.tsx:697`), clear `saving` and show no message.
- **Fix**: When `Accept` includes `application/json`, return JSON for the signed-out and missing-Supabase branches, and treat only a 200 body of `{ ok: true }` as saved. On a redirect or a body without `error`, keep the form and set `submitError`.
  - Strength: Matches `saveResponse` on the validation and duplicate branches, and stops a followed 200 from looking like a save.
  - Tradeoff: Sign-in for an expired session becomes a form message instead of an immediate redirect, unless the client navigates to `/auth/signin` on 401.
  - Confidence: HIGH — `measurementsError` always redirects, and `response.ok` does not check `response.redirected`.
  - Blind spot: None significant.
- **Decision**: Fixed via Fix now

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/measurements/MeasurementForm.tsx:906
- **Detail**: `a2c7446` always renders `{note.length}/{NOTE_MAX_LENGTH}` beside the note and points `aria-describedby` at it. The note still uses `FieldError`, is not a bubble, and is not validated on blur. The 1000-character sentence and `NOTE_MAX_LENGTH` are unchanged. The plan does not mention a counter.
- **Fix**: Add the `{length}/1000` counter to the plan as an accepted note readout.
- **Decision**: Fixed via Fix now

### F4 — Occupied minutes load the whole history

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/measurements.ts:127
- **Detail**: `readOccupiedMinutes` selects every `measured_on` for the trainee with no limit. Local PostgREST `max_rows` is 1000, and the cap is silent, so the client hint can miss a taken minute past that. The unique index still rejects the write and the form keeps the values on 409.
- **Fix**: Read whether the selected minute exists, instead of the trainee's full history.
- **Decision**: Fixed via Fix now

## Verification

| Command | Result |
|---------|--------|
| `npm test` | Pass — 9 files, 114 tests |
| `npm run lint` | Pass |
| `npm run check:home-tokens` | Pass — clean |
| `npx astro check` | Pass — 0 errors, 0 warnings, 0 hints |

Phase 1 and phase 2 manual rows are checked. The measurement-bubble and button rows match the code in the diff. The duplicate-date and note-counter work has no Progress rows.
