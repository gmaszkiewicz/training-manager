# Find Trainee by First and Last Name Implementation Plan

## Overview

Trainers can find a trainee in Find trainee by first name or last name as well as by email. Each match, and each trainee in Choose trainee, reads like the Trainee column of Hub → Collaborations: a bold name line over a muted email line. The one difference is that the first name is shown in full ("Ada Lovelace", not "A. Lovelace"). Tile headings stop naming the chosen trainee. Instead, the Choose trainee tile's note names them, so the name is still visible when the tile is collapsed. The Request for checkboxes sit in two columns. Roadmap item S-50 (MS-41).

## Current State Analysis

- **Search.** The search is an RPC, `public.search_unlinked_trainee_emails(p_query)` (`supabase/migrations/20261014120000_search_unlinked_trainee_emails.sql`). It is security definer, answers only a trainer, and returns `setof text` emails. Its match rule is a single lowercased substring of the email. It excludes trainees already in the caller's `trainer_links`, orders by email and returns at most 10.
- **Service and API.** `searchUnlinkedTrainees` (`src/lib/services/trainer-links.ts:180`) wraps the RPC. `GET /api/trainer-links` (`src/pages/api/trainer-links/index.ts:33`) answers `{ emails: string[] }`.
- **Search field.** `TraineeEmailSearch.tsx` is used only by `FindTraineeDialog.tsx`. It fetches matches, renders one outline button per email, writes the chosen email into the `email` input, and blocks an empty submit with an "Enter an email address" toast. The placeholder (`src/lib/find-trainee.ts:7`) already says "Find trainee by email, first name or last name".
- **Request for.** The checkboxes are a one-column `fieldset` (`FindTraineeDialog.tsx`, `flex flex-col gap-3`).
- **Collaborations Trainee column.** It shows `topbarName` ("A. Lovelace", or the one saved name, or the email) bold and truncated, with the email muted and truncated underneath. A row whose name is the email shows only the email (`src/components/hub/CollaborationsList.astro:98-108`).
- **Choose trainee.** `LinkedTraineeField.tsx` shows only `email` on its button and in its list. `list_linked_trainees` already returns `first_name`/`last_name`, and the service maps them onto `TrainerLink` (`src/lib/services/trainer-links.ts:23-37`). `selectTrainerPreview` sorts links by email (`src/lib/trainer-preview.ts:43`), and that order also drives the previous/next arrows.
- **Headings.** `traineeLabel` and `headingFor` (`src/lib/trainer-preview.ts:15-23`) build "Measurements for A. Lovelace (ada@example.com)" (`TrainerPanel.astro:182`), "Weekly progression for …" (`ChartsTile.astro`, `MeasurementCharts.tsx`) and "Top progression for …" (`TopChangesTile.astro`, `TopChangesCharts.tsx`). The list component's Settings label is "Measurements for" (`src/lib/components.ts:60`).
- **Picker tile.** The Choose trainee tile is `required` (it cannot be switched off), but it starts collapsed (`TrainerPanel.astro:107`). Its note is the fixed "Whose measurements the tiles below show".
- **Profile names.** `profiles.first_name`/`last_name` are nullable, 1–50 chars (`20261026120000_profile_names.sql`). `profiles_select_own` keeps direct reads to the caller's own row, so names reach a trainer only through security-definer functions.
- **Extensions.** `unaccent` is not enabled in any migration.

## Desired End State

- **Name search.** In Find trainee, a trainer types "ada love", "lovelace ada", "LUKASZ zolty" or "ada@ex" and sees up to 10 unlinked trainees who match. Each match reads "Ada Lovelace" over "ada@example.com" (or the email alone when no name is saved). Matches are ordered by last name, then first name, then email. Choosing one fills the field with that email.
- **Typed name submitted.** If the field holds text without "@" and the trainer presses Request access, nothing is sent. The field is marked invalid and a toast says "Choose a trainee from the list".
- **Request for layout.** The four checkboxes sit in two columns.
- **Choose trainee.** The button and its list show the same two-line rows, in the same name order, and the arrows follow that order. The tile's note names the chosen trainee ("Ada Lovelace · ada@example.com"), open or collapsed.
- **Headings.** They read "Measurements", "Weekly progression" and "Top progression" with no trainee name. The Settings component label reads "Measurements".
- **Verification.** Unit tests, `astro check`, lint, build and the E2E suite pass, including a new E2E test that finds a named throwaway trainee by name.

### Key Discoveries:

- `src/lib/topbar.ts:84` `topbarName` is the Collaborations name rule. The new full-name rule is a sibling that differs only for both names saved.
- `TrainerPanel.astro:120-122` computes `subjectLabel` once and passes it to the list title and both chart tiles. Removing it is the whole heading change.
- `TraineeEmailSearch.tsx` already intercepts the form's `submit` event for the empty check (lines 128-145). The no-"@" guard goes on the same listener.
- `tests/e2e/find-trainee.spec.ts` signs up a throwaway trainer via `POST /api/auth/signup`. `POST /api/profile` accepts `firstName`/`lastName`, so a throwaway named trainee can be made the same way.
- `tests/e2e/component-settings.spec.ts:67` and `src/lib/components.test.ts:58` look up "Measurements for".

## What We're NOT Doing

- Changing the Collaborations Trainee column. It keeps "A. Lovelace".
- Dropping `search_unlinked_trainee_emails`. It stays for the previous Worker and is dropped in a later release.
- Searching across linked trainees, trainers or pending requests differently from today. The S-29 rules (trainees only, not already linked, at most 10) stay.
- A server-side check for a name typed into the POST. The server keeps answering not found for any non-matching email.
- Sending to the single match of a typed name, or keeping the name in the field after choosing.
- Fuzzy or typo-tolerant search, or search by full email domain ranking.
- Changing the trainee's own journal headings.
- Fixing the stale "Find a trainee by email on Measurements" empty text in Collaborations.

## Implementation Approach

The work runs bottom-up, and each phase ships something that runs:

1. An additive migration enables `unaccent` and adds a new RPC that returns names. The service and GET API switch to it.
2. The dialog renders the richer rows through a shared two-line row component.
3. The picker reuses that row and the shared sort order, and the headings drop their subject.

A single name helper (full first name) and a single trainee comparator keep the search list, the picker and its note consistent.

## Critical Implementation Details

- **Unaccent under `search_path = ''`.** Supabase installs extensions in the `extensions` schema. `unaccent(text)` is only `stable`, and an unqualified call fails under an empty search path. Wrap it in an `immutable` SQL helper that calls the two-argument form with a qualified dictionary: `extensions.unaccent('extensions.unaccent'::regdictionary, …)`. The helper uses `set search_path = ''`, and both the match and the ORDER BY use it. Enable the extension with `create extension if not exists unaccent with schema extensions;`. The default rules fold Polish letters (ł → l, ż → z).
- **Backward compatibility.** The migration reaches hosted Supabase before the new Worker. It must only add things: the extension, the helper and the new function. Leave the old function and its grants untouched.

## Phase 1: Name search backend

### Overview

A new RPC searches unlinked trainees by every word of the query against first name, last name and email, ignoring case and diacritics. It returns names with emails in name order. The GET API returns trainees instead of bare emails.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_search_unlinked_trainees.sql`

**Intent**: Enable `unaccent`, add an immutable fold helper, and add `search_unlinked_trainees` with the same trainer check, trainee-only join and not-already-linked exclusion as `search_unlinked_trainee_emails`.

**Contract**:
- `public.search_unlinked_trainees(p_query text) returns table (email text, first_name text, last_name text)`, `security definer`, `set search_path = ''`. It returns nothing for a non-trainer or an empty or blank query.
- **Words.** The query is folded (lower, unaccent, btrim) and split on whitespace. Empty words are dropped.
- **Match.** A trainee matches when **every** word is a substring (`strpos > 0`) of the folded first name, folded last name or folded email.
- **Email column.** `lower(btrim(u.email))`, as today.
- **Order.** Folded `last_name` nulls last, then folded `first_name` nulls last, then email. Then `limit 10`.
- **Grants.** `revoke all … from public, anon; grant execute … to authenticated`. Same grants on the helper (or revoke from anon/public and grant to authenticated). The old function is unchanged.

#### 2. Database types

**File**: `src/db/database.types.ts`

**Intent**: Add the new function's `Args`/`Returns` next to `search_unlinked_trainee_emails`, regenerated from the local stack or hand-written in the same shape.

**Contract**: `search_unlinked_trainees: { Args: { p_query: string }; Returns: { email: string; first_name: string | null; last_name: string | null }[] }`.

#### 3. Shared types

**File**: `src/types.ts`

**Intent**: A DTO for one search match, shared by the service, API and client.

**Contract**: `export interface TraineeMatch { email: string; firstName: string | null; lastName: string | null }`.

#### 4. Service

**File**: `src/lib/services/trainer-links.ts`

**Intent**: `searchUnlinkedTrainees` calls the new RPC and maps rows to `TraineeMatch`. A malformed payload still yields `{ ok: false }`.

**Contract**: `searchUnlinkedTrainees(supabase, query): Promise<{ ok: true; trainees: TraineeMatch[] } | { ok: false }>`. A blank query still returns `{ ok: true, trainees: [] }` without calling the RPC.

#### 5. API

**File**: `src/pages/api/trainer-links/index.ts`

**Intent**: GET answers with the matches. Auth, role and error answers are unchanged.

**Contract**: `200 { trainees: TraineeMatch[] }`. The `emails` key is gone (client and API ship in the same Worker).

#### 6. Unit tests

**File**: the existing service/API tests for `searchUnlinkedTrainees`, if any (e.g. `src/lib/services/trainer-links.test.ts`). Otherwise add the cases there.

**Intent**: Cover the mapping from RPC rows (names null or set), the blank-query short-circuit, and the malformed-payload failure.

### Success Criteria:

#### Automated Verification:

- Migration applies on a fresh local stack: `npx supabase db reset`
- Migration check passes: `npm run migration-check`
- Unit tests pass: `npm test`
- Lint and types pass: `npm run lint` and `npx astro check`

#### Manual Verification:

- With local Supabase, calling the RPC as a trainer returns Ada Lovelace for "ada love", "lovelace ada" and "ADA@EX", and returns Łukasz Żółty for "lukasz zolty"
- The RPC returns nothing for a trainee caller and nothing for an already-linked trainee

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Find trainee dialog

### Overview

The dialog's matches read like the Collaborations Trainee column, with the full first name. Choosing a match fills in the email. A typed name without "@" is not sent. Request for sits in two columns.

### Changes Required:

#### 1. Full-name helper

**File**: `src/lib/trainer-preview.ts`

**Intent**: Replace `traineeLabel` with a full-name rule used by Find trainee, Choose trainee and the picker note. Also add a shared comparator (used in Phase 3).

**Contract**:
- `traineeName({ firstName, lastName, email }): string`:
  - "Ada Lovelace" when both names are saved (trimmed, joined by one space, first name as saved).
  - The one saved name alone.
  - Otherwise the email.
- `compareTrainees(a, b): number` orders by last name (blank last), then first name (blank last), then email. Comparisons ignore case and accents (`localeCompare` with `sensitivity: "base"`), matching the SQL order.

#### 2. Two-line trainee row

**File**: `src/components/trainer/TraineeRowLabel.tsx` (new)

**Intent**: One presentational component for the name-over-email rows, mirroring `CollaborationsList.astro:100-107`. It is reused in the search list here and in the picker in Phase 3.

**Contract**:
- Props: `{ email: string; firstName?: string | null; lastName?: string | null; className?: string }`.
- Renders a bold, truncated `traineeName(...)` with `title`, then a muted, truncated email with `title`, only when the name differs from the email.
- Uses role tokens only, and `cn()` for classes.

#### 3. Search field

**File**: `src/components/trainer/TraineeEmailSearch.tsx`

**Intent**:
- Read `{ trainees }` and render each match as an outline button holding `TraineeRowLabel`. The button grows to two lines and stays full width and truncating.
- Choosing a match still writes its email into the `email` input and closes the list.
- The submit listener keeps the empty check. It also blocks non-empty text without "@": the field gets `aria-invalid` and a portaled toast says "Choose a trainee from the list". Typing clears both, as with the empty error.
- The input's accessible name changes from "Email" to "Trainee", and `inputMode="email"` goes, because the field now takes names.

**Contract**: The form still posts `email`. The toast copy is "Choose a trainee from the list". The empty-field copy "Enter an email address" is unchanged. Key rows by email.

#### 4. Two-column Request for

**File**: `src/components/trainer/FindTraineeDialog.tsx`

**Intent**: Lay the checkbox rows out in a two-column grid, in dashboard order and row by row (Measurements | Nutrition, then Training | Planning). The legend stays above.

**Contract**: The `fieldset` children use a `grid grid-cols-2` layout. The legend is unaffected.

#### 5. Tests

**Files**: `src/lib/trainer-preview.test.ts`, `tests/e2e/find-trainee.spec.ts`

**Intent**:
- Unit: `traineeName` (both names → "Ada Lovelace", one name, blank names → email, trimming) and `compareTrainees` (last, then first, then email; nameless last; case and accent insensitive).
- E2E: textbox lookups follow the new accessible name "Trainee". A new test signs up a throwaway trainee in its own context, saves a unique first and last name via `POST /api/profile`, then has the throwaway trainer type "<first> <last>". The test expects one match reading the full name over the email, chooses it, and expects the field to hold the email.
- E2E: a new test types a name without "@", presses Request access, and expects the "Choose a trainee from the list" toast outside the open dialog, with the field `aria-invalid`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint, types and build pass: `npm run lint`, `npx astro check`, `npm run build`
- E2E passes: `npx playwright test tests/e2e/find-trainee.spec.ts`

#### Manual Verification:

- In the dialog, "ada love" lists Ada Lovelace over ada@example.com, and a trainee without names shows the email alone
- On a phone width the match rows truncate without horizontal scroll, and Request for shows two columns
- Typing "Ada" and pressing Request access shows "Choose a trainee from the list" and keeps the dialog open

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Choose trainee and headings

### Overview

Choose trainee uses the same two-line rows and name order, and its note names the chosen trainee. Tile headings and the list component's label drop the trainee.

### Changes Required:

#### 1. Picker order

**File**: `src/lib/trainer-preview.ts`

**Intent**: `selectTrainerPreview` sorts with `compareTrainees` instead of by email, so the list and the previous/next arrows follow name order. The default selection (latest `linkedAt`, tiebreak by id) is unchanged.

**Contract**: The returned `links` are in `compareTrainees` order.

#### 2. Picker rows

**File**: `src/components/trainer/LinkedTraineeField.tsx`

**Intent**: The closed button and every list row render `TraineeRowLabel` instead of the email. The button grows to fit two lines.

**Contract**: The button's `aria-label` reads `traineeName` plus the email when they differ ("Ada Lovelace, ada@example.com"). Current-row marking (`aria-current`) and scroll-to-selected stay.

#### 3. Picker note and headings

**File**: `src/components/trainer/TrainerPanel.astro`

**Intent**:
- The Choose trainee tile's `note` names the chosen trainee: "Ada Lovelace · ada@example.com", or the email alone when no name is saved.
- `subjectLabel` is removed. The list tile's title is "Measurements". `subjectLabel` is no longer passed to `ChartsTile`/`TopChangesTile`.

**Contract**: The note is built from `traineeName` and the email. The fixed note "Whose measurements the tiles below show" is gone.

#### 4. Chart tiles

**Files**: `src/components/measurements/ChartsTile.astro`, `MeasurementCharts.tsx`, `TopChangesTile.astro`, `TopChangesCharts.tsx`

**Intent**: Drop the `subjectLabel` prop and `headingFor`, so the titles are the plain heading titles.

**Contract**: The `subjectLabel` prop is removed. Titles come from `heading.title` / `topChangesHeading.title` directly.

#### 5. Helper cleanup and component label

**Files**: `src/lib/trainer-preview.ts`, `src/lib/components.ts`

**Intent**: Delete `traineeLabel` and `headingFor`, and the `topbarName` import if it is now unused. Rename the `trainee-measurements` component label from "Measurements for" to "Measurements".

**Contract**: `trainee-measurements.label === "Measurements"`. The id and versions are unchanged, so saved settings still apply.

#### 6. Kitchen sink and tests

**Files**: `src/pages/kitchen-sink/trainer.astro`, `src/lib/trainer-preview.test.ts`, `src/lib/components.test.ts`, `tests/e2e/component-settings.spec.ts`, and any E2E asserting picker rows by email or headings with "for"

**Intent**:
- Kitchen sink fixtures show the two-line picker and the name note. Its comments stop describing "… for A. Lovelace".
- Unit tests drop `traineeLabel`/`headingFor` cases, add a `selectTrainerPreview` name-order case, and expect "Measurements".
- E2E lookups of "Measurements for" become "Measurements".

### Success Criteria:

#### Automated Verification:

- No `headingFor`, `traineeLabel` or `"Measurements for"` remains in `src/` or `tests/`: `git grep -nE "headingFor|traineeLabel|Measurements for" -- src tests` returns nothing
- Unit tests pass: `npm test`
- Lint, types and build pass: `npm run lint`, `npx astro check`, `npm run build`
- Full E2E passes: `npx playwright test`

#### Manual Verification:

- On `/measurements` as a trainer with two named trainees, Choose trainee lists them by last name in two-line rows, and the arrows follow that order
- With the picker collapsed, its note shows "Ada Lovelace · ada@example.com"
- Headings read "Measurements", "Weekly progression" and "Top progression" with no name, on desktop and on a phone
- Settings → Components lists "Measurements" for the trainer list tile
- `/kitchen-sink/trainer` shows the new picker rows and note

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `traineeName`: both names (first name in full), one name, blank or whitespace names fall back to the email.
- `compareTrainees` / `selectTrainerPreview`: last, then first, then email; nameless trainees last; case and accent insensitive; default selection unchanged.
- `searchUnlinkedTrainees`: row mapping, blank query short-circuit, malformed payload → `{ ok: false }`.
- `components.ts`: the list tile label is "Measurements".

### Integration Tests:

- E2E: a named throwaway trainee is found by "first last" and shows two lines, and choosing it fills in the email.
- E2E: a name without "@" gives the "Choose a trainee from the list" toast and the dialog stays open.
- Existing find-trainee and component-settings E2E follow the new accessible name and label.

### Manual Testing Steps:

1. As a trainer, open Find trainee and search "ada love", "lovelace", "lukasz zolty" and an email fragment.
2. Choose a match, then request access. A sent toast appears.
3. Type "Ada" and press Request access. Expect the choose-from-list toast.
4. On `/measurements`, collapse Choose trainee and read the note. Check the headings and the arrow order.
5. Repeat 1 and 4 at phone width.

## Performance Considerations

The search scans trainee profiles joined to `auth.users` with function-wrapped predicates, so no index is used. That matches today's email `strpos` scan and is fine at the current user count. It is capped at 10 rows.

## Migration Notes

The migration is additive: the extension, the helper and the new function. The previous Worker keeps calling `search_unlinked_trainee_emails`. A later change drops that function once no deployed Worker uses it.

## References

- Roadmap: `context/foundation/roadmap.md` S-50
- Previous change: `context/archive/*find-trainne-on-top-bar*`
- Search RPC: `supabase/migrations/20261014120000_search_unlinked_trainee_emails.sql`
- Names RPC pattern: `supabase/migrations/20261101130000_list_linked_trainees.sql`
- Collaborations row: `src/components/hub/CollaborationsList.astro:98-108`
- Lesson: `context/foundation/lessons.md` — errors are toasts, also inside dialogs

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Name search backend

#### Automated

- [x] 1.1 Migration applies on a fresh local stack: `npx supabase db reset`
- [x] 1.2 Migration check passes: `npm run migration-check`
- [x] 1.3 Unit tests pass: `npm test`
- [x] 1.4 Lint and types pass: `npm run lint` and `npx astro check`

#### Manual

- [x] 1.5 With local Supabase, calling the RPC as a trainer returns Ada Lovelace for "ada love", "lovelace ada" and "ADA@EX", and returns Łukasz Żółty for "lukasz zolty"
- [x] 1.6 The RPC returns nothing for a trainee caller and nothing for an already-linked trainee

### Phase 2: Find trainee dialog

#### Automated

- [ ] 2.1 Unit tests pass: `npm test`
- [ ] 2.2 Lint, types and build pass: `npm run lint`, `npx astro check`, `npm run build`
- [ ] 2.3 E2E passes: `npx playwright test tests/e2e/find-trainee.spec.ts`

#### Manual

- [ ] 2.4 In the dialog, "ada love" lists Ada Lovelace over ada@example.com, and a trainee without names shows the email alone
- [ ] 2.5 On a phone width the match rows truncate without horizontal scroll, and Request for shows two columns
- [ ] 2.6 Typing "Ada" and pressing Request access shows "Choose a trainee from the list" and keeps the dialog open

### Phase 3: Choose trainee and headings

#### Automated

- [ ] 3.1 No `headingFor`, `traineeLabel` or `"Measurements for"` remains in `src/` or `tests/`: `git grep -nE "headingFor|traineeLabel|Measurements for" -- src tests` returns nothing
- [ ] 3.2 Unit tests pass: `npm test`
- [ ] 3.3 Lint, types and build pass: `npm run lint`, `npx astro check`, `npm run build`
- [ ] 3.4 Full E2E passes: `npx playwright test`

#### Manual

- [ ] 3.5 On `/measurements` as a trainer with two named trainees, Choose trainee lists them by last name in two-line rows, and the arrows follow that order
- [ ] 3.6 With the picker collapsed, its note shows "Ada Lovelace · ada@example.com"
- [ ] 3.7 Headings read "Measurements", "Weekly progression" and "Top progression" with no name, on desktop and on a phone
- [ ] 3.8 Settings → Components lists "Measurements" for the trainer list tile
- [ ] 3.9 `/kitchen-sink/trainer` shows the new picker rows and note
