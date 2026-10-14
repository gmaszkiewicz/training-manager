# Reactive trainee search Implementation Plan

## Overview

A trainer typing in the email field on `/measurements` sees at most 10 trainee emails that contain that sequence and are not already linked to that trainer. Choosing a row puts the email in the field. `Link trainee` still submits the existing link.

## Current State Analysis

In trainer mode, `TrainerPanel` renders an `h1` of `Find trainee by email` and a POST form to `/api/trainer-links`. The email `Input` has `name="email"`, `type="email"`, `required`, and `aria-label="Email"`, and no placeholder. The form has no client island. `Link trainee` is the submit button. When at least one trainee is linked, an `h2` of `Body measurements` sits above `LinkedTraineeField`.

`POST /api/trainer-links` calls `linkTraineeByEmail`, which calls the security-definer function `link_trainee_by_email`. That function requires `profiles.role = 'trainer'`, compares `lower(btrim(...))` to one `auth.users` email, requires `profiles.role = 'trainee'`, and inserts `trainer_links`. It returns one id or null. It does not list emails.

Unlinked emails are not readable under the current policies. `trainer_links_select_own` is `auth.uid() = trainer_id`. `profiles_select_own` is `auth.uid() = id`. The inspected migrations read `auth.users` only inside `link_trainee_by_email`, and they do not grant `authenticated` a select on `auth.users`. There is no `ilike` in the migrations and no Combobox in `src/components/ui`.

`GET /api/measurements/previous` is the existing pattern for a cookie-session JSON read: `401` when signed out, `Cache-Control: no-store`, and `MeasurementForm` fetches it while the user types. Smoke step `trainer measurements confirms the role` expects the body to contain `Find trainee by email`. That check is a substring, so a placeholder with the same words still satisfies it.

## Desired End State

On `/measurements`, the trainer card heading is `Measurements`. The email field placeholder is `Find trainee by email`, and its accessible name stays `Email`. `Link trainee` still posts the field to `/api/trainer-links`.

Typing `nn` shows unlinked trainee emails that contain those characters, such as `anna@x.com` and `nn@x.com`, ordered alphabetically by the normalized email, at most 10. ` Ann ` matches `ann@x.com`. A space in the middle stays, so `an n` does not match `ann@x.com`. An empty field, a whitespace-only field, and `zzzqqq` show no rows and no new sentence. `ada@x.com` linked only to another trainer still appears. An email this trainer already linked does not. Choosing a row writes that email into the field and does not submit. The linked-trainee list under `Body measurements` is unchanged.

### Key Discoveries:

- `src/components/trainer/TrainerPanel.astro:56-69` — trainer heading, email POST form, and `Link trainee`
- `src/pages/api/measurements/previous.ts:17-25` — signed-out JSON `401` and `no-store` on a GET used while typing
- `supabase/migrations/20260928170000_trainer_links.sql:23-75` — security-definer link function, `lower(btrim(...))`, trainee-role check, execute grant to `authenticated`
- `src/lib/trainer-preview.ts:11` — linked emails sort with `localeCompare`; this plan leaves that sort in place
- `scripts/smoke.mjs:430-443` — trainer session is active before `trainer link opens the trainee`, and the heading check is a body substring

## What We're NOT Doing

- Changing `LinkedTraineeField`, the `Body measurements` heading, or the linked list's `localeCompare` order
- Linking as soon as a row is chosen
- A sentence for no matches, or a search error on the card
- Results for an empty or whitespace-only field
- Hiding a trainee who is linked only to a different trainer
- Adding a Combobox, Command, or Popover component
- A function that returns every match and a server sort with `localeCompare`
- Changing the link POST, its redirects, or `No trainee with that email`

## Implementation Approach

Add a security-definer function next to `link_trainee_by_email`. It is granted to `authenticated` and uses `auth.uid()`, so the cap and the order belong inside the function: a direct call stops at the same 10 the page shows. The function checks the trainer role, normalizes with `lower` and trim, keeps a literal substring, keeps `profiles.role = 'trainee'`, drops rows in this trainer's `trainer_links`, orders by the normalized email, and returns at most 10 emails.

`GET /api/trainer-links?q=` calls that function with the cookie session, the same way the link POST calls its function. A small React island on the email field fetches while the trainer types, renders the returned emails, and writes a chosen email into the input. The input stays inside the existing form, so `Link trainee` still submits `email`.

## Critical Implementation Details

### Timing and lifecycle

A slower response for an earlier sequence must not replace the list for a later sequence. Clearing the field removes the list immediately. Choosing a row writes the returned email and closes the list, and that write must not open the list again for the same value. A later edit by the trainer searches again.

### Result order

The service and the island keep the function's row order. Sorting those rows with `localeCompare` can change which address is tenth. On this machine that call uses Polish rules, and punctuation such as `_`, `-`, and `@` does not follow the same order as a database alphabetical sort.

### Literal characters

The match is a substring of the normalized email. `%` and `_` are characters in the sequence. A `LIKE` pattern would treat them as wildcards, so the predicate has to use a literal position check on the already-lowercased strings.

## Phase 1: Search function

### Overview

Add the database function and the service call that return the matching emails.

### Changes Required:

#### 1. Security-definer search

**File**: `supabase/migrations/20261014120000_search_unlinked_trainee_emails.sql` (any timestamp later than `20261010073600`)

**Intent**: Let a trainer read matching unlinked trainee emails without opening `auth.users` or `profiles` to the client.

**Contract**: New function `public.search_unlinked_trainee_emails(p_query text)` returns `setof text`. `security definer`, `search_path = ''`, same grant shape as `link_trainee_by_email`: revoke from `public` and `anon`, grant execute to `authenticated`. When `auth.uid()` has no `profiles` row with `role = 'trainer'`, return no rows. Set the query to `lower(btrim(p_query))`; when that is null or `''`, return no rows. Read `auth.users` joined to `profiles` with `role = 'trainee'`. Normalize each stored email with `lower(btrim(...))`. Keep rows whose normalized email contains the query as a literal substring. Exclude a trainee who has a `trainer_links` row with `trainer_id = auth.uid()`. Order by the normalized email and `limit 10`. Return those normalized emails. Additive only: no table change and no drop.

#### 2. Generated function type and service call

**File**: `src/db/database.types.ts`

**File**: `src/lib/services/trainer-links.ts`

**Intent**: Call the function with the same user-scoped client the link already uses, and keep the returned order.

**Contract**: Regenerate types with `npm run db:types` while the local stack is up, so `Database["public"]["Functions"]` matches the function. `searchUnlinkedTrainees(supabase, query)` returns `{ ok: true; emails: string[] } | { ok: false }`. A query that is empty after trim returns `{ ok: true, emails: [] }` and does not call the RPC. Otherwise pass the original string as `p_query`. On success, `emails` is the function's list in that order, with length at most 10. On an RPC error or a thrown client, return `{ ok: false }`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes

#### Manual Verification:

- Applied locally, the function returns at most 10 normalized trainee emails in alphabetical order and omits trainees already linked to the calling trainer

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Search endpoint

### Overview

Expose the function as JSON for the signed-in trainer, and prove it with the existing smoke session.

### Changes Required:

#### 1. GET beside the link POST

**File**: `src/pages/api/trainer-links/index.ts`

**Intent**: Give the page a cookie-session read that returns the function's emails and leaves the link POST as it is.

**Contract**: Export `GET` on the same route, `prerender = false`. `GET /api/trainer-links?q=` returns JSON with `Cache-Control: no-store`. Signed out: `401` and `{ error: "Sign in required" }`. No Supabase client: `500` and `{ error: "Supabase is not configured" }`. Signed-in role other than `trainer`: `403` and `{ error: "Could not search trainees" }`. A query that is empty after trim: `200` and `{ emails: [] }`. A trainer query calls `searchUnlinkedTrainees` with the original `q` string. Success: `200` and `{ emails }` in the service's order. Service failure: `500` and `{ error: "Could not search trainees" }`. `POST` is unchanged.

#### 2. Smoke coverage around the existing link

**File**: `scripts/smoke.mjs`

**Intent**: Prove the endpoint with the trainee the smoke run already creates, before and after that trainee is linked.

**Contract**: While signed out, `GET /api/trainer-links?q=a` expects status `401`. After trainer signup and before `trainer link opens the trainee`, `GET /api/trainer-links?q=` with the smoke trainee email in uppercase and surrounded by spaces expects status `200` and a body that contains that email in normalized form. After that link step, the same `GET` expects status `200` and a body that does not contain that normalized email. Leave the existing `Find trainee by email` body check in place. After `trainee signs in to attempt a link`, `GET /api/trainer-links?q=a` expects status `403`. In that same session, POST the access token to `/rest/v1/rpc/search_unlinked_trainee_emails` with `p_query` of `a`, the same way `measurementMonthsRpc` calls `/rest/v1/rpc/measurement_months`, and expect a JSON array with no rows.

### Success Criteria:

#### Automated Verification:

- `npm run smoke` against a running server: a signed-out `GET /api/trainer-links?q=a` returns 401; while the trainer is signed in and has not linked the smoke trainee, `GET /api/trainer-links?q=` with that email's uppercase form and surrounding spaces returns the normalized email; after the link, the same unique query omits that email
- After `trainee signs in to attempt a link`, `GET /api/trainer-links?q=a` returns 403, and a POST of that session token to `/rest/v1/rpc/search_unlinked_trainee_emails` with `p_query` `a` returns an empty array

#### Manual Verification:

- Eleven unlinked trainee emails contain the same sequence and the response lists only the alphabetically first 10
- A trainee linked only to another trainer is still returned for this trainer

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Finder field

### Overview

Move the finder copy into the field and show the search results on the trainer card.

### Changes Required:

#### 1. Email field island

**File**: `src/components/trainer/TraineeEmailSearch.tsx`

**Intent**: Search while the trainer types, and put a chosen email into the form field.

**Contract**: Props are `idPrefix: string`. The island renders the existing `Input` with `id={`${idPrefix}email`}`, `name="email"`, `type="email"`, `required`, `aria-label="Email"`, and `placeholder="Find trainee by email"`. Fetch `GET /api/trainer-links?q=` with `cache: "no-store"`, the same style as `MeasurementForm`'s previous-measurement fetch. A query that is empty after trim shows no rows and does not leave a previous list on screen. A non-OK response or a thrown fetch shows no rows and no sentence. Render each returned email as a `type="button"` control using the shared `Button`, so the click does not submit the form. Choosing one sets the input to that email and closes the list. That write does not fetch for the value just written, so the list stays closed. A later edit by the trainer searches again. Escape and a pointer down outside the field close the list and leave the input value in place, following `LinkedTraineeField`. Use role tokens and shared components only.

#### 2. Trainer card heading and form

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**: Show the search on the existing link form and use the card heading that remains after the finder words move into the placeholder.

**Contract**: The card `h1` is `Measurements` in trainer mode. The unavailable branch stays `Measurements` with `Could not open your journal`. Inside the trainer form, keep the hidden `trainee` input when `selectedLink` is set, render `TraineeEmailSearch` with `client:load` and the current `idPrefix`, and keep the full-width `Link trainee` submit. The `h2` `Body measurements` and `LinkedTraineeField` stay where they are. The kitchen sink already renders this panel, so the heading and placeholder show there without a new sink state.

#### 3. Token check

**File**: `scripts/check-home-tokens.mjs`

**Intent**: Keep the new island inside the same token gate as the other trainer views.

**Contract**: Add `src/components/trainer/TraineeEmailSearch.tsx` to `FILES`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `npm run smoke` trainer measurements step still finds `Find trainee by email` in the response body
- `npm run check:home-tokens` passes with `src/components/trainer/TraineeEmailSearch.tsx` listed in `scripts/check-home-tokens.mjs`

#### Manual Verification:

- The trainer card heading is `Measurements`, the email placeholder is `Find trainee by email`, and the field's accessible name stays `Email`
- An empty field and a sequence that matches nobody show no rows and no new sentence
- Choosing a shown email writes it into the field and leaves `Link trainee` to submit the existing link
- `Body measurements` and the linked-trainee control stay as they are once a trainee is linked
- After a choice the list stays closed until the trainer edits the field

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new pure helper. The match, the cap, and the order live in the function, and `npm test` guards the existing linked-list sort so this change does not rewrite it.

### Integration Tests:

- `npm run smoke` covers signed-out `401`, case and surrounding spaces before the link, exclusion after the link, and, once the trainee session is active, route `403` plus an empty RPC result. The existing trainer body check still finds `Find trainee by email` in the placeholder.

### Manual Testing Steps:

1. Apply the migration locally and call the function as a trainer. Confirm an empty query returns no rows, ` Ann ` can match `ann@x.com`, and `%` matches a literal percent.
2. With eleven unlinked trainee emails that contain one sequence, confirm the response is only the alphabetically first 10.
3. Link one of those trainees on this trainer and confirm that email disappears. Confirm a trainee linked only to another trainer still appears.
4. On `/measurements`, confirm the heading is `Measurements`, the placeholder is `Find trainee by email`, and choosing a row fills the field without navigating. The list stays closed until the field is edited. Submit `Link trainee` and confirm the existing preview opens.
5. Clear the field and type `zzzqqq`. Confirm no rows and no new sentence. Confirm the linked-trainee control under `Body measurements` still changes the preview.

## Performance Considerations

A one-character query can match many trainee emails. The function still returns at most 10 rows. This slice adds no index. That is acceptable for the current account counts; a later index would be a separate change if the scan becomes slow.

## Migration Notes

The migration only adds a function. The previous Worker never calls it, so it can reach hosted Supabase before the new Worker. No backfill and no drop. `npm run deploy` does not apply migrations; the production build on `main` does.

## References

- Related research: `context/changes/reactive-trainee-search/research.md`
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/95
- Link function: `supabase/migrations/20260928170000_trainer_links.sql:23-75`
- JSON GET while typing: `src/pages/api/measurements/previous.ts:17-25`
- Trainer card: `src/components/trainer/TrainerPanel.astro:56-76`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Search function

#### Automated

- [x] 1.1 `npm test` passes — 69c9f83
- [x] 1.2 `npm run lint` passes — 69c9f83

#### Manual

- [x] 1.3 Applied locally, the function returns at most 10 normalized trainee emails in alphabetical order and omits trainees already linked to the calling trainer — 69c9f83

### Phase 2: Search endpoint

#### Automated

- [x] 2.1 `npm run smoke` against a running server: a signed-out `GET /api/trainer-links?q=a` returns 401; while the trainer is signed in and has not linked the smoke trainee, `GET /api/trainer-links?q=` with that email's uppercase form and surrounding spaces returns the normalized email; after the link, the same unique query omits that email
- [x] 2.4 After `trainee signs in to attempt a link`, `GET /api/trainer-links?q=a` returns 403, and a POST of that session token to `/rest/v1/rpc/search_unlinked_trainee_emails` with `p_query` `a` returns an empty array

#### Manual

- [x] 2.2 Eleven unlinked trainee emails contain the same sequence and the response lists only the alphabetically first 10
- [x] 2.3 A trainee linked only to another trainer is still returned for this trainer

### Phase 3: Finder field

#### Automated

- [ ] 3.1 `npm test` passes
- [ ] 3.2 `npm run lint` passes
- [ ] 3.3 `npm run smoke` trainer measurements step still finds `Find trainee by email` in the response body
- [ ] 3.9 `npm run check:home-tokens` passes with `src/components/trainer/TraineeEmailSearch.tsx` listed in `scripts/check-home-tokens.mjs`

#### Manual

- [ ] 3.4 The trainer card heading is `Measurements`, the email placeholder is `Find trainee by email`, and the field's accessible name stays `Email`
- [ ] 3.5 An empty field and a sequence that matches nobody show no rows and no new sentence
- [ ] 3.6 Choosing a shown email writes it into the field and leaves `Link trainee` to submit the existing link
- [ ] 3.7 `Body measurements` and the linked-trainee control stay as they are once a trainee is linked
- [ ] 3.8 After a choice the list stays closed until the trainer edits the field
