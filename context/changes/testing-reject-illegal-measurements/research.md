---
date: 2026-10-04T16:07:03+02:00
researcher: Grok 4.7
git_commit: 08396ab772f6d0a3a47680f0749684603478e6c7
branch: cursor/phased-test-plan
repository: training-manager
topic: "Where is an illegal measurement refused, and which request proves it was not stored?"
tags: [research, codebase, measurement-input, measurements-api, smoke]
status: complete
last_updated: 2026-10-04
last_updated_by: Grok 4.7
---

# Research: Where is an illegal measurement refused, and which request proves it was not stored?

**Date**: 2026-10-04T16:07:03+02:00
**Researcher**: Grok 4.7
**Git Commit**: 08396ab772f6d0a3a47680f0749684603478e6c7
**Branch**: cursor/phased-test-plan
**Repository**: training-manager

## Research Question

Phase 3 of `context/foundation/test-plan.md` ("Reject illegal measurements") asks where an illegal entry is refused, on which write paths, and where that body would have been stored. The phase must prove the form and the server refuse it and that it does not appear on the list. Client rejection is not evidence that the server refused to store it. The expected layer is a unit on the rejection rule plus one request that proves nothing was stored. Copying the implementation's limits into the expected value, or asserting error text alone, does not count.

## Summary

On commit `08396ab772f6d0a3a47680f0749684603478e6c7`, the numeric and date limits are the signed S-02 contract, not FR-003. FR-003 names the fields and states no ranges (`context/foundation/prd.md:69`). The S-02 plan sets weight at 20–400 kg, each circumference at 10–300 cm, at most one decimal, eight required numbers, a note of at most 1000 characters, and `measured_on` not later than UTC `now` plus one day (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:149`). `createMeasurementInputSchema` encodes that contract (`src/lib/measurement-input.ts:141-153`).

A grep of `createMeasurementInputSchema` under `src` returns the definition, the unit test, `MeasurementForm`, `POST /api/measurements`, and `POST /api/measurements/[id]`. A grep of `addMeasurement` and `updateMeasurement` under `src` returns those two handlers and the service definitions. Each handler calls the schema and, when `safeParse` fails, redirects before the service call (`src/pages/api/measurements/index.ts:38-43`, `src/pages/api/measurements/[id].ts:48-53`). The form uses the same schema and calls `preventDefault` on failure, so that browser submit does not reach either route (`src/components/measurements/MeasurementForm.tsx:135-137`). A grep of `MeasurementForm` under `src` does not return `TrainerPanel`.

The rejection rule already has unit cases in `src/lib/measurement-input.test.ts`. Those cases assert `success === false` and the field message. They do not call a route or read the list. The smoke step for weight `800` asserts a `302` whose `location` starts with `/measurements?error=` and does not then read the journal (`scripts/smoke.mjs:218-221`). Weight `800` is also outside `measurements_weight_kg_check` (`supabase/migrations/20260928043200_trainee_measurements.sql:15`), so an empty list after that POST would not show that the route stopped before insert.

A date later than UTC today plus one day is the inspected case the table would still accept. A grep of `measured_on` under `supabase/migrations` returns the `date not null` column and its index in that create migration, and no CHECK that caps the date. The one request that matches the risk is a create POST of such a date, then `GET /measurements` while the journal is still empty. That GET is the list: zero entries render `No measurements yet` (`src/components/journal/TraineeJournal.astro:51-52`). Vitest includes `src/**/*.test.ts` and does not boot the preview (`vitest.config.ts:11`), so this request belongs in `scripts/smoke.mjs`, beside the access checks, not in a new Vitest harness.

## Detailed Findings

### Documented limits

FR-003 requires a date, weight, chest, waist, arms, thigh, calf, hips, navel, and an optional note (`context/foundation/prd.md:69`). The business-logic section compares those numbers and does not state a legal range (`context/foundation/prd.md:92-96`).

The S-02 plan is the signed limit contract this research found. Its schema unit says `createMeasurementInputSchema(now)` accepts 20 and 400, accepts 10 and 300, rejects 19.9, 400.1, `80.25`, an empty field, and a note of 1001 characters, accepts `80,5` as 80.5, and with a fixed `now` accepts UTC today plus one day and rejects plus two days (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:173`). The table contract in that plan uses the same numeric CHECKs and `char_length(note) <= 1000` (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:80`). The edit plan reuses `createMeasurementInputSchema` and does not change those numbers (`context/archive/2026-10-02-edit-measurement-entry/plan.md:25`, `context/archive/2026-10-02-edit-measurement-entry/plan.md:47`).

The current schema matches that contract on the inspected function: weight 20–400, each of the seven centimetre fields 10–300, empty as required, more than one decimal as invalid, note length after trim above 1000 as invalid, and `measured_on` greater than UTC calendar today plus one day as invalid (`src/lib/measurement-input.ts:69-70`, `src/lib/measurement-input.ts:82-85`, `src/lib/measurement-input.ts:112-113`, `src/lib/measurement-input.ts:134-135`, `src/lib/measurement-input.ts:144-151`).

### The two write paths

The phrase "both entry paths" appears in `context/foundation/test-plan.md` at the risk-#5 research cell and the phase-3 goal (`context/foundation/test-plan.md:60`, `context/foundation/test-plan.md:72`). A workspace grep of `*.md` for that phrase returns those two lines. It does not define the paths.

On this commit the paths that parse a measurement body are:

1. Create. `MeasurementForm` posts to `/api/measurements` when `entry` is null (`src/components/measurements/MeasurementForm.tsx:144`). `POST` in `src/pages/api/measurements/index.ts` parses with `createMeasurementInputSchema(new Date())` and calls `addMeasurement` only after `parsed.success` (`src/pages/api/measurements/index.ts:25-43`).
2. Edit. The same form posts to `/api/measurements/${entry.id}` when `entry` is set (`src/components/measurements/MeasurementForm.tsx:144`). `POST` in `src/pages/api/measurements/[id].ts` parses with the same function and calls `updateMeasurement` only after `parsed.success` (`src/pages/api/measurements/[id].ts:35-53`).

`addMeasurement` inserts `trainee_id`, `measured_on`, the eight numbers, and `note` into `public.measurements` (`src/lib/services/measurements.ts:46-58`). `updateMeasurement` writes those same measurement columns plus a new `created_at` on the row whose `id` and `trainee_id` match (`src/lib/services/measurements.ts:77-94`). On these two handlers, a failed parse returns before those calls.

A grep of `MeasurementForm` under `src` returns `TraineeJournal`, the component file, and a kitchen-sink comment. `TraineeJournal` mounts the form (`src/components/journal/TraineeJournal.astro:50`). That grep does not return `TrainerPanel`. A trainer POST of a legal measurement body is an access check in smoke (`scripts/smoke.mjs:423-429`), not a second validation path.

The form sets `noValidate`, so the date input's `max` is not what blocks submit (`src/components/measurements/MeasurementForm.tsx:147`, `src/components/measurements/MeasurementForm.tsx:160`). `handleSubmit` is. On create, `max` is the browser-local today; on edit it is the later of that day and the stored `measured_on` (`src/components/measurements/MeasurementForm.tsx:113`). The server cap stays UTC today plus one day. That split is the S-02 date rule (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:62`). A clearly future date fails the schema on both the form and the route.

### What the table would still store

The create migration checks weight 20–400, each circumference 10–300, and note length at most 1000 (`supabase/migrations/20260928043200_trainee_measurements.sql:15-23`). Each numeric column is `not null`. `measured_on` is `date not null` with no upper bound in that file (`supabase/migrations/20260928043200_trainee_measurements.sql:4`). The migrations grep above found no later cap.

So, on these constraints:

- Weight `800`, a circumference outside 10–300, a null number, or a note longer than 1000 characters fails a CHECK or `not null` even if a route skipped the schema.
- A calendar `measured_on` later than UTC today plus one day fails the schema (`src/lib/measurement-input.ts:112-113`) and is not named by those CHECKs.

This research did not execute an insert of an extra decimal place, so it does not say whether `numeric(5,1)` would store a rounded value. The future-date case does not depend on that.

The list the risk names is `GET /measurements` for the signed-in trainee. The page loads `listMeasurements` and passes the rows to `TraineeJournal` (`src/pages/measurements.astro:49-53`). With `entries.length === 0` the journal renders `No measurements yet` and does not render `MeasurementList` (`src/components/journal/TraineeJournal.astro:51-52`). A stored row renders `entry.measured_on` as text (`src/components/measurements/MeasurementList.astro:39-40`).

### Tests that already exist

`src/lib/measurement-input.test.ts` fixes `now` at `2026-09-28T12:00:00.000Z` and rejects weight 19.9 and 400.1, chest 9.9 and 300.1, weight `80.25`, empty `weight_kg`, a 1001-character note, and `measured_on` `2026-09-30` (`src/lib/measurement-input.test.ts:92-176`). Each failing case expects the field message. That is the rejection rule from the S-02 unit contract. It is also the anti-pattern if a new test only repeats those sentences. The file does not import either POST route.

`scripts/smoke.mjs` posts `measurementForm("2026-01-01", "800")` to `/api/measurements` and expects status 302 and a location prefix `/measurements?error=` (`scripts/smoke.mjs:218-221`). The next step is a legal save (`scripts/smoke.mjs:223-226`). No step between them GETs `/measurements`. The S-02 smoke line expected that invalid weight to redirect to `/dashboard?error=` (`context/archive/2026-09-27-trainee-measurement-delta/plan.md:237`). The current smoke prefix is `/measurements?error=`. The weight `800` case remains; the `/dashboard` prefix does not.

`npm test` runs `vitest run` (`package.json:17`). Vitest includes `src/**/*.test.ts` (`vitest.config.ts:11`). `npm run smoke` runs `scripts/smoke.mjs` (`package.json:16`). Phase 2's request boundary is that smoke file (`context/foundation/test-plan.md:87`, `context/foundation/test-plan.md:127-131`).

### What this phase should prove

The unit file already locks the rule, including a date two days after the fixed `now`. A new unit that copies the same messages does not answer the challenge.

The request that does: while the signed-in trainee still has an empty journal, `POST /api/measurements` with a `measured_on` later than UTC today plus one day and otherwise legal numbers, then `GET /measurements`. The response body contains `No measurements yet`. A stored row would show that date in `MeasurementList`. Weight `800` is the wrong body for this proof, because the weight CHECK would also reject the insert.

That POST exercises the create route's schema failure. Smoke does POST legal bodies to `/api/measurements/${measurementId}` and expects an access error (`scripts/smoke.mjs:354-360`, `scripts/smoke.mjs:423-429`). Those steps use in-range numbers and a past date, so they do not take the `!parsed.success` return in `src/pages/api/measurements/[id].ts`. No `it(` in `src/lib/measurement-input.test.ts` imports that route. The phase text asks for one request and for both write paths. One create request plus the existing schema unit covers the shared rule and the create store. It leaves the edit handler's schema-failure return unread. Covering that return at HTTP means a second request: a legal row first, then an illegal update, then the original date still on the list. This research treats that second request as out of the stated "one request" budget.

The test-plan stack line says phase 3 adds its rejection request to the Vitest runner (`context/foundation/test-plan.md:87`). A Vitest file under `src/**/*.test.ts` does not perform this GET against the preview. Asserting that a mocked `addMeasurement` was not called would not read the list, and phase 2 left the live request in smoke. The request for this phase extends `scripts/smoke.mjs`.

## Code References

- `src/lib/measurement-input.ts:141-153` — `createMeasurementInputSchema` limits
- `src/components/measurements/MeasurementForm.tsx:121-144` — form parse, `preventDefault`, create and edit actions
- `src/pages/api/measurements/index.ts:25-43` — create parse, then `addMeasurement`
- `src/pages/api/measurements/[id].ts:35-53` — edit parse, then `updateMeasurement`
- `src/lib/services/measurements.ts:40-58` — insert into `public.measurements`
- `src/lib/services/measurements.ts:70-94` — update of that row
- `supabase/migrations/20260928043200_trainee_measurements.sql:4-23` — `measured_on` uncapped; numeric and note CHECKs
- `src/components/journal/TraineeJournal.astro:51-52` — empty list copy
- `src/lib/measurement-input.test.ts:166-176` — schema rejects a date two days ahead
- `scripts/smoke.mjs:218-221` — weight `800` redirect, no list read

## Architecture Insights

The form and both POST handlers call one schema. The form can hide the server by cancelling submit. The table repeats the numeric and note limits and does not repeat the date cap, so a future date is the body that distinguishes a route refusal from a CHECK refusal. When the journal has loaded and `entries.length === 0`, it shows `No measurements yet`. When it renders a row, that row includes `measured_on`.

## Historical Context (from prior changes)

- `context/archive/2026-09-27-trainee-measurement-delta/plan.md:149` — supported. This is still the limit contract; the current schema function uses those bounds.
- `context/archive/2026-09-27-trainee-measurement-delta/plan.md:173` — supported. The unit file asserts those accepts and rejects, including the field messages.
- `context/archive/2026-09-27-trainee-measurement-delta/plan.md:237` — partial. Weight `800` is still a smoke POST that expects an error redirect. The documented prefix `/dashboard?error=` is contradicted by `scripts/smoke.mjs:221`, which expects `/measurements?error=`.
- `context/archive/2026-10-02-edit-measurement-entry/plan.md:47` — supported. The edit POST on this commit calls `createMeasurementInputSchema`.
- `context/foundation/test-plan.md:87` — contradicted as the place to put the new request. The sentence says the Vitest runner. The list read that proves nothing was stored is the smoke preview, which phase 2 already uses.

## Related Research

- `context/changes/testing-delta-after-edit-delete/research.md` — phase 1 delta chain. It does not cover illegal input.

## Open Questions

- A second smoke request on `POST /api/measurements/[id]` with a future date would be the edit-path schema-failure proof. Existing edit POSTs in smoke send a legal body and assert access refusal. The phase budget is one request, so this research does not ask for that second request.
- Whether `numeric(5,1)` rounds an extra decimal was not executed. The future-date request does not need that result.
