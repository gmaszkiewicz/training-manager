# Unlink trainees and label the profile by role — Implementation Plan

## Overview

A trainer unlinks a linked trainee from an email-sorted list inside the same fixed-height profile card used for Profile and Change password. Both roles open Change password from a button. The header reads Trainee profile or Trainer profile.

## Current State Analysis

`/profile` is one protected page. Its data region is a `w-full max-w-sm` card with no height class, and `ChangePasswordForm` is mounted in that card (`src/pages/profile.astro:17-23`). A successful or failed password change redirects to `/profile?notice=password-changed` or `/profile?error=...`. `scripts/smoke.mjs` asserts those two locations exactly.

The header link label is the literal `Profile` for every signed-in user (`src/lib/topbar.ts:53`). `Topbar.astro` already loads the profile role before calling `topbarModel`.

`public.trainer_links` grants `SELECT` to `authenticated` and has no delete grant (`supabase/migrations/20260928170000_trainer_links.sql:19-21`). Inserts go through `link_trainee_by_email`, a `SECURITY DEFINER` function with `search_path = ''`. A trainer can read a trainee's measurements only while a `trainer_links` row exists (`supabase/migrations/20260928170000_trainer_links.sql:77-81`). `listTrainerLinks` returns every link for the signed-in trainer and takes no page argument (`src/lib/services/trainer-links.ts:6-10`). `selectTrainerPreview` sorts those links by email (`src/lib/trainer-preview.ts:21`).

Page sizes `[5, 10, 15]` and default `10` live in `src/lib/measurement-page.ts`. The journal stores its size at `tm.measurements.pageSize.<accountUserId>`. The measurement pager is previous/next plus `Page N of M`, and its page-size group is a set of pressed buttons (`src/components/measurements/MeasurementBrowser.tsx:638-779`).

`scripts/check-home-tokens.mjs` scans `src/pages/profile.astro` and rejects arbitrary `px` or `rem` utilities. There is no height token on the profile card today.

## Desired End State

A trainee or a trainer opening Profile sees the heading Profile and a Change password button. A trainer also sees Unlink trainees. Change password and the linked-trainee list replace the contents of that same card, and each of those screens links back to the Profile buttons. The card's border box is the same width and height on all three screens. The password form and the password-changed notice fit in it. A page of trainees scrolls inside it. Profile and Change password show no pager and no control for how many trainees appear.

The unlink list is the trainer's linked trainees, ordered by email A to Z. Page sizes are 5, 10, and 15, default 10, remembered separately from the journal. Unlink removes that trainer's link immediately. The trainee's measurement rows stay. The header reads Trainee profile or Trainer profile, and a signed-in user with no role still sees Profile.

### Key Discoveries:

- Password smoke checks require the existing redirect URLs to stay `/profile?error=current-password` and `/profile?notice=password-changed` (`scripts/smoke.mjs`).
- `profile.astro` cannot carry an arbitrary rem height. A theme token in `src/styles/global.css`, on the same pattern as `--max-width-kitchen-sink`, is the height the token check allows.
- `resolveMeasurementPage` and `pageSlice` already clamp a page and slice a list (`src/lib/measurement-page.ts:101-104`, `src/lib/measurement-page.ts:191-197`).
- Measurement deletes are form posts to a dedicated route (`src/pages/api/measurements/[id]/delete.ts`). Unlink follows that route shape and skips the confirm step.

## What We're NOT Doing

- Asking the trainer to confirm before unlink.
- Sharing `tm.measurements.pageSize.<accountUserId>` with the unlink list.
- Showing the account email inside the profile card.
- Relabeling a missing role, or hiding the profile link when role is null.
- Separate URLs for Profile, Change password, and Unlink trainees. The three screens are views of `/profile`.
- Updating or deleting `measurements` rows. Unlink deletes one `trainer_links` row for the signed-in trainer.
- A `DELETE` grant or a delete RLS policy on `trainer_links`.
- Using the journal minimum width or the home `max-w-4xl` region as the profile card.
- A kitchen-sink page or a new Playwright spec for these screens.
- Changing the order of the trainee switcher on `/measurements`.
- Remembering the unlink page number in a cookie.

## Implementation Approach

Keep one `/profile` page and one card. The screen comes from the query: `view=password`, `view=unlink` for a trainer, and the Profile buttons otherwise. An existing password notice or password error also opens Change password, so the current password redirects can stay unchanged.

Unlink is a new security-definer function, then a form post that redirects back to the unlink view. The page loads the trainer's links with `listTrainerLinks`, sorts them in memory, and slices them with the existing page helpers. The list is small enough to page in memory; the measurement list pages in SQL because a journal is larger.

The card uses one theme height utility. Only the trainee rows scroll. The page-size control and the pager stay outside that scroller.

## Critical Implementation Details

- **Password redirects stay exact.** `src/pages/api/auth/password.ts` keeps posting to `/profile?error=current-password` and `/profile?notice=password-changed`. The profile page treats `notice=password-changed`, or any `error` that `profilePageError` recognizes, as the Change password screen. A direct visit uses `?view=password`. An unlink failure uses a different code, `unlink-failed`, so it stays on the unlink screen.

- **The height cannot be an arbitrary utility on the card.** `scripts/check-home-tokens.mjs` scans `src/pages/profile.astro` and rejects classes such as `h-[28rem]`. Define the length on a theme token in `src/styles/global.css`, following `--max-width-kitchen-sink`, and apply the generated utility on the card. Choose the smallest length that contains the Change password view, including the password-changed notice, without clipping.

- **Paging after a delete uses the list that remains.** In Phase 3 the unlink post reads the submitted page and the unlink page-size cookie, loads the trainer's remaining links, and redirects to the page `resolveMeasurementPage` returns. Removing the last row on a page lands on the previous page. Phase 1 only needs a redirect to the unlink view.

## Phase 1: Unlink function

### Overview

Add a security-definer unlink for the signed-in trainer's own link, a service wrapper, and a form-post route. Measurement rows stay as they are. This phase has no profile UI.

### Changes Required:

#### 1. Unlink migration

**File**: `supabase/migrations/<timestamp>_unlink_trainee.sql`

**Intent**: Let a trainer remove one of their own links without giving signed-in clients a delete grant.

**Contract**: `public.unlink_trainee(p_trainee_id uuid) returns boolean`, `language plpgsql`, `security definer`, `set search_path = ''`. The caller must be `auth.uid()` with `profiles.role = 'trainer'`. Otherwise the function returns null. A trainer delete runs `delete from public.trainer_links where trainer_id = auth.uid() and trainee_id = p_trainee_id`, then returns true, including when zero rows match. The function does not write `measurements`. `revoke all` from `public` and `anon`. `grant execute` to `authenticated`. No delete policy and no delete table grant. Follow the qualify-every-name style of `link_trainee_by_email` in `supabase/migrations/20260928170000_trainer_links.sql`.

#### 2. Generated function type

**File**: `src/db/database.types.ts`

**Intent**: Keep the type-checked lint passing once the service calls the new function.

**Contract**: The `Functions` block gains `unlink_trainee: { Args: { p_trainee_id: string }; Returns: boolean }`. Prefer `npm run db:types` after the migration is applied locally. A hand edit must match that shape and leave the other functions in place.

#### 3. Service wrapper

**File**: `src/lib/services/trainer-links.ts`

**Intent**: Give the route the same ok/failure result the other link helpers return.

**Contract**: `unlinkTrainee(supabase, traineeId)` calls `rpc("unlink_trainee", { p_trainee_id: traineeId })` and returns `{ ok: true }` only when `data === true`. Any error, throw, or other data returns `{ ok: false }`.

#### 4. Form-post route

**File**: `src/pages/api/trainer-links/[traineeId]/unlink.ts`

**Intent**: Accept the per-row form from the later list and return the trainer to the unlink view.

**Contract**: `prerender = false` and `POST`. A missing user redirects to `/auth/signin`. A non-UUID `traineeId`, a missing Supabase client, a role other than `trainer`, or `ok: false` redirects to `/profile?view=unlink&error=unlink-failed`. A trainer success redirects to `/profile?view=unlink`. Follow the post-and-redirect shape of `src/pages/api/measurements/[id]/delete.ts`, without a confirm form. Phase 3 adds the page query once the list exists.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `npm run migration-check` passes, and the preserved measurement row is unchanged

#### Manual Verification:

- A trainer unlinking a linked trainee removes that trainer's `trainer_links` row, and the trainee's measurement rows stay
- Unlinking the same trainee again returns success and deletes nothing
- A trainee, and a trainer who has no link to that trainee, cannot remove another trainer's link

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Shared profile card and role label

### Overview

Turn Profile into a heading and a Change password button for both roles. Open the existing password form in that same card. Label the header by role. This phase does not add Unlink trainees.

### Changes Required:

#### 1. Header label

**File**: `src/lib/topbar.ts`

**Intent**: Name the profile link by role, and leave the missing-role label as it is.

**Contract**: `TopbarLink["label"]` includes `"Trainee profile"` and `"Trainer profile"`. For a signed-in user, the profile link label is `Trainee profile` when `role` is `"trainee"`, `Trainer profile` when `role` is `"trainer"`, and `Profile` when `role` is null. Href stays `/profile`. Greeting and the other links stay as they are. Update `src/lib/topbar.test.ts` expectations for the trainee and trainer cases, including the `/profile` current-link case. The `role: null` case still expects `Profile`.

#### 2. Screen choice

**File**: `src/lib/profile-view.ts`

**Intent**: Decide which of the card's screens to render from the query the password flow already uses.

**Contract**: `profileScreen({ view, notice, error })` returns `"password"` when `notice === "password-changed"` or `profilePageError(error)` is non-null, and when `view === "password"`. Every other input returns `"actions"`. Phase 3 adds the unlink return. Cover these cases in `src/lib/profile-view.test.ts`.

#### 3. Shared card height

**File**: `src/styles/global.css`

**Intent**: Give the three screens one height that the token check accepts.

**Contract**: Add one height token under `@theme inline`, on the pattern of `--max-width-kitchen-sink`, and use the generated utility on the profile card only. The length contains the Change password view, including the password-changed notice. `src/pages/profile.astro` does not use an arbitrary `px` or `rem` utility.

#### 4. Profile page

**File**: `src/pages/profile.astro`

**Intent**: Show the button screen and the password screen in the current card, at one size.

**Contract**: Keep the card's `w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-card-foreground` and add the height utility. The card is a fixed-height column. `profileScreen` chooses the body. The actions screen shows heading `Profile` and a Change password link to `/profile?view=password`, using the shared button styles. The password screen shows a `Profile` link to `/profile`, heading `Change password`, the existing notice, and `ChangePasswordForm`. Neither screen shows a pager or a page-size control. `src/pages/api/auth/password.ts` redirect URLs stay unchanged.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including Trainee profile, Trainer profile, Profile when role is null, and `profileScreen`
- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npm run smoke` passes, including the exact redirects `/profile?error=current-password` and `/profile?notice=password-changed`

#### Manual Verification:

- A trainee and a trainer each see heading Profile and a Change password button, with no pager and no page-size control
- Change password opens in that same card, the card border box matches the Profile view, and the form plus the password-changed notice fit without clipping
- The header reads Trainee profile or Trainer profile, and a signed-in user with no role still sees Profile
- The Profile link on Change password returns to the button view

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Unlink list

### Overview

Add the trainer-only Unlink trainees button and the paged list inside the card from Phase 2. Unlink posts to the Phase 1 route and removes the row immediately.

### Changes Required:

#### 1. Sort and page-size key

**File**: `src/lib/trainer-preview.ts`

**Intent**: Give the unlink list the same email order the trainer already sees, with a stable tiebreak.

**Contract**: `sortedTrainerLinks(links)` returns a copy sorted by `email.localeCompare`, then by `traineeId` ascending when the emails compare equal. Do not use `selectTrainerPreview`'s selected-trainee rule for this list. Cover Ada-before-Bea and an equal-email tie in `src/lib/trainer-preview.test.ts`.

**File**: `src/lib/measurement-page.ts`

**Intent**: Remember the unlink page size apart from the journal.

**Contract**: `unlinkPageSizeStorageKey(accountUserId)` returns `tm.profile.unlinkPageSize.<accountUserId>`. Parsing still goes through `parsePageSize`, so a missing or invalid value is `10`. Extend `src/lib/measurement-page.test.ts` for the key and the default.

#### 2. Unlink screen

**File**: `src/lib/profile-view.ts`

**Intent**: Open the list only for a trainer.

**Contract**: `profileScreen` gains `role`. It returns `"unlink"` only when `role === "trainer"` and `view === "unlink"`, and the password rules from Phase 2 do not match. A trainee, or a missing role, with `view=unlink` gets `"actions"`. `error=unlink-failed` does not open Change password.

#### 3. Return to the remaining page

**File**: `src/pages/api/trainer-links/[traineeId]/unlink.ts`

**Intent**: After a row disappears, open the page that still contains the remaining trainees.

**Contract**: Read the submitted `page` field and `unlinkPageSizeStorageKey`. On success, load the remaining links, sort them, and redirect to `/profile?view=unlink`, appending `&page=<n>` when `resolveMeasurementPage` returns a page greater than 1. A failed list load still redirects to `/profile?view=unlink&error=unlink-failed`.

#### 4. List inside the card

**File**: `src/pages/profile.astro`

**Intent**: Render the trainer's links in the existing card and post each unlink without a confirm step.

**Contract**: Load the role with `readProfileRole` and, on the unlink screen, load links with `listTrainerLinks`. A valid `size` query of 5, 10, or 15 updates `unlinkPageSizeStorageKey` with the same cookie options the measurements page uses for the selected trainee (`path: "/"`, `maxAge: 31536000`, `sameSite: "lax"`, `httpOnly: true`) and shows page 1. Otherwise use the stored size. Read `page` from the query, sort with `sortedTrainerLinks`, slice with `pageSlice`, and clamp with `resolveMeasurementPage`. The actions screen gains an Unlink trainees link to `/profile?view=unlink` after Change password, for a trainer only. The unlink screen shows a Profile link to `/profile`, heading `Unlink trainees`, a `Trainees per page` group for 5, 10, and 15, then the rows. Each size is a link to `/profile?view=unlink&size=<n>` with no `page` query, and the selected size is pressed. Each row shows the email and an Unlink submit to `/api/trainer-links/<traineeId>/unlink` with the current page in a hidden field. There is no confirm step. The row region scrolls (`min-h-0 flex-1 overflow-y-auto`). The heading, page-size group, and pager stay outside that scroller. The pager shows Previous page, `Page N of M`, and Next page only when the page count is greater than 1. Previous page and Next page are links to `/profile?view=unlink&page=<n>` with no `size` query. Zero links show `No linked trainees` and no pager. When `listTrainerLinks` returns `ok: false`, show `Could not load trainees`, with no rows and no pager. A failed unlink shows `Could not unlink that trainee`. The card keeps the Phase 2 width and height. A long email wraps inside the card.

### Success Criteria:

#### Automated Verification:

- `npm test` passes, including email order with a trainee-id tiebreak, the separate unlink page-size key, default 10, and `profileScreen` sending a trainee's `view=unlink` to the button screen
- `npm run lint` passes
- `npm run check:home-tokens` passes
- `npm run smoke` passes

#### Manual Verification:

- A trainer sees Unlink trainees, and a trainee does not
- The list is email A to Z, with page sizes 5, 10, and 15, default 10
- Choosing 5 on Unlink leaves the journal page size unchanged
- A page of 15 trainees scrolls inside the card, the card matches Profile and Change password in width and height, and the page-size control and pager stay visible
- Unlink removes that row immediately, and the trainer no longer sees that trainee's measurements
- An empty list shows No linked trainees and no pager
- Profile and Change password still show no pager and no trainee-count control

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `profileScreen` opens Change password for `notice=password-changed`, for each code `profilePageError` recognizes, and for `view=password`. It opens the unlink list only for a trainer with `view=unlink`. `unlink-failed` stays off the password screen.
- `sortedTrainerLinks` orders Ada before Bea and breaks an equal email by `traineeId` ascending.
- `unlinkPageSizeStorageKey` is `tm.profile.unlinkPageSize.<accountUserId>`, and `parsePageSize` of a missing value is 10.
- `topbarModel` returns Trainee profile, Trainer profile, and Profile for role null.

### Integration Tests:

- `npm run migration-check` still finds the preserved measurement row after the unlink migration.
- `npm run smoke` still accepts the exact password redirect locations.

### Manual Testing Steps:

1. As a trainee, open Profile, open Change password, change the password, and confirm the notice appears in the same card. Return with the Profile link.
2. As a trainer with Ada linked yesterday and Bea linked today, open Unlink trainees and confirm Ada is first. Step through page sizes 5, 10, and 15. Confirm the journal page size is unchanged.
3. Unlink Bea and confirm the row disappears without a confirm step, Bea's measurements disappear for that trainer, and Bea's own journal still has those rows. Unlink the last remaining trainee and confirm the empty sentence.
4. Sign in as a user with no role and confirm the header still says Profile.

## Performance Considerations

The unlink list pages the trainer's own links in memory after the existing full select. That set is the same one the trainer panel already loads. No new SQL page query.

## Migration Notes

The migration only adds `unlink_trainee` and its execute grant. It is safe for the previous Worker, which never calls it. No backfill. No measurement rewrite. Apply it with the normal local Supabase migration path, then refresh `src/db/database.types.ts`.

## References

- Related research: `context/changes/unlink-function-for-trainer/research.md`
- Slice outcome: `context/foundation/roadmap.md` S-32, MS-24
- Link function to follow: `supabase/migrations/20260928170000_trainer_links.sql`
- Form-post route to follow: `src/pages/api/measurements/[id]/delete.ts`
- Page helpers: `src/lib/measurement-page.ts`
- Token check: `scripts/check-home-tokens.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Unlink function

#### Automated

- [x] 1.1 `npm test` passes
- [x] 1.2 `npm run lint` passes
- [x] 1.3 `npm run migration-check` passes, and the preserved measurement row is unchanged

#### Manual

- [x] 1.4 A trainer unlinking a linked trainee removes that trainer's `trainer_links` row, and the trainee's measurement rows stay
- [x] 1.5 Unlinking the same trainee again returns success and deletes nothing
- [x] 1.6 A trainee, and a trainer who has no link to that trainee, cannot remove another trainer's link

### Phase 2: Shared profile card and role label

#### Automated

- [ ] 2.1 `npm test` passes, including Trainee profile, Trainer profile, Profile when role is null, and `profileScreen`
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run check:home-tokens` passes
- [ ] 2.4 `npm run smoke` passes, including the exact redirects `/profile?error=current-password` and `/profile?notice=password-changed`

#### Manual

- [ ] 2.5 A trainee and a trainer each see heading Profile and a Change password button, with no pager and no page-size control
- [ ] 2.6 Change password opens in that same card, the card border box matches the Profile view, and the form plus the password-changed notice fit without clipping
- [ ] 2.7 The header reads Trainee profile or Trainer profile, and a signed-in user with no role still sees Profile
- [ ] 2.8 The Profile link on Change password returns to the button view

### Phase 3: Unlink list

#### Automated

- [ ] 3.1 `npm test` passes, including email order with a trainee-id tiebreak, the separate unlink page-size key, default 10, and `profileScreen` sending a trainee's `view=unlink` to the button screen
- [ ] 3.2 `npm run lint` passes
- [ ] 3.3 `npm run check:home-tokens` passes
- [ ] 3.4 `npm run smoke` passes

#### Manual

- [ ] 3.5 A trainer sees Unlink trainees, and a trainee does not
- [ ] 3.6 The list is email A to Z, with page sizes 5, 10, and 15, default 10
- [ ] 3.7 Choosing 5 on Unlink leaves the journal page size unchanged
- [ ] 3.8 A page of 15 trainees scrolls inside the card, the card matches Profile and Change password in width and height, and the page-size control and pager stay visible
- [ ] 3.9 Unlink removes that row immediately, and the trainer no longer sees that trainee's measurements
- [ ] 3.10 An empty list shows No linked trainees and no pager
- [ ] 3.11 Profile and Change password still show no pager and no trainee-count control
