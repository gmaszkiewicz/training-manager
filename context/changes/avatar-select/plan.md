# Avatar tab in Profile Implementation Plan

## Overview

Add an **Avatar** tab to Profile, next to **Details**, at `/profile/avatar`. A signed-in user uploads their own PNG, JPEG or WebP image (at most 2 MB) or removes it. The image is stored in a public Supabase Storage bucket and replaces the initials in the top-bar avatar; initials stay the fallback.

## Current State Analysis

- `/profile` renders one Details tab through `AccountTabs`, which accepts exactly one `{ value, label }` tab and renders no links (`src/components/account/AccountTabs.tsx:4-21`). `/settings` uses the same component (`src/pages/settings.astro:24`).
- The top-bar avatar shows initials only (`src/components/TopbarActions.tsx:31-38`); `AvatarImage` already exists in `src/components/ui/avatar.tsx:25-29` but is unused.
- `topbarModel` marks an account item current by exact `href === pathname` (`src/lib/topbar.ts:39-41`), so `/profile/avatar` would not mark Profile.
- `readTopbarProfile` reads `role, first_name, last_name` in one query (`src/lib/services/profile-details.ts:56-76`); `Topbar.astro` calls it on every page.
- `profiles` has `first_name`/`last_name` with a column-level update grant and an own-row update policy (`supabase/migrations/20261026120000_profile_names.sql`).
- Supabase Storage is enabled locally (`supabase/config.toml:114-117`) but no bucket exists and no code uses Storage.
- CI starts local Supabase with `storage-api` excluded in all three jobs (`.github/workflows/ci.yml:45,84,129`).
- `SUPABASE_KEY` is server-only (`astro:env/server`), so the browser has no Supabase client; uploads must go through an Astro API route.
- `POST /api/profile` is the pattern: form POST, zod parsing in `src/lib/profile-form.ts`, `authPage()` redirect with `?error=`/`?notice=` or JSON for the island (`src/pages/api/profile/index.ts`, `src/lib/auth-response.ts`).
- The smoke helper only sends URL-encoded forms (`scripts/smoke.mjs:289-305`).

## Desired End State

- Profile shows two centered tabs, **Details** (`/profile`) and **Avatar** (`/profile/avatar`), as links; the current one is selected. Settings keeps its single Change password tab.
- On the Avatar tab the user sees their current avatar (image or initials), picks a file, sees a preview, and saves it. A **Remove** button deletes the image and returns to initials.
- Accepted files are PNG, JPEG or WebP up to 2 MB, checked by declared type and by the file's leading bytes; anything else is refused with a field error and nothing is stored.
- The top-bar avatar shows the image on every page; initials show when there is no image or it fails to load. Profile in the avatar menu is marked current on `/profile` and `/profile/avatar`.
- A user can write only inside their own `<user-id>/` folder in the `avatars` bucket and can set `avatar_path` only to a path inside that folder.

Verify with `npm test`, `npm run lint`, `npx astro check`, `npm run smoke` and `npx playwright test` against local Supabase with Storage running.

### Key Discoveries:

- `AccountTabs` is the only tab component for account screens; making it take a list of link tabs serves both Profile and Settings (`src/components/account/AccountTabs.tsx`).
- The e2e spec asserts `getByRole("tab", { name: "Details", selected: true })` (`tests/e2e/account-menu.spec.ts:30`); link tabs must keep `role="tab"` and `aria-selected`.
- Column-level grants are how this project limits what a user may update on `profiles` (`20261026120000_profile_names.sql:12`).
- Bucket rows in `[storage.buckets]` of `config.toml` only seed local stacks; `supabase db push` (Workers Builds) only applies migrations, so the bucket must be created in a migration.

## What We're NOT Doing

- No cropping, resizing or image editing; the image is shown with `object-cover` in a circle.
- No GIF, SVG or files over 2 MB.
- No avatar for trainees in the trainer panel or anywhere outside the top bar and the Avatar tab.
- No signed URLs or private bucket.
- No cleanup of orphaned files when an account is deleted.
- No kitchen sink for `/profile` (still owned by the `kitchen-sink-missing-pages` change).
- No roadmap item; `context/foundation/roadmap.md` has no `avatar-select` Change ID.

## Implementation Approach

Store the object path in a new nullable `profiles.avatar_path`, so the top bar keeps its single profile read and derives the public URL from `SUPABASE_URL`. Every upload writes a new file name (`<user-id>/<random>.<ext>`), so caches never show an old image. The API uploads the new file, updates the column, then deletes the previous file. A failure after upload removes the new file and keeps the old avatar. Removal clears the column first, then deletes the file. One endpoint, `POST /api/profile/avatar`, handles both through an `intent` field (`upload` | `remove`) and reuses `authPage()` redirects to `/profile/avatar`.

## Critical Implementation Details

- **Storage policies:** Supabase Storage `remove()` needs both `delete` and `select` rights on `storage.objects`. Add an own-folder `select` policy for `authenticated` even though the bucket is public. Scope every policy to `bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text`.
- **Backward compatibility:** the migration only adds a nullable column, a check constraint that holds for `null`, a grant, a bucket and policies. The previous Worker ignores all of them.
- **CI:** `storage-api` must leave the `exclude` list in every job that starts Supabase, or smoke, e2e and migration-check fail on upload. Keep `imgproxy` excluded.

## Phase 1: Avatar data and API

### Overview

Create the bucket, column and policies; add file validation and the Storage service; expose `POST /api/profile/avatar`; run Storage in CI; cover the API with unit and smoke tests.

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_profile_avatar.sql`

**Intent**: Add the avatar reference to `profiles` and an `avatars` bucket that only the owner can write to.

**Contract**:
- `profiles.avatar_path text null`, check constraint `avatar_path like id::text || '/%'` and length ≤ 200; `grant update (avatar_path) on public.profiles to authenticated` (the existing `profiles_update_own` policy already scopes rows).
- `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', true, 2097152, '{image/png,image/jpeg,image/webp}') on conflict (id) do nothing`.
- Policies on `storage.objects` for `authenticated`, one per operation: `avatars_select_own`, `avatars_insert_own`, `avatars_update_own`, `avatars_delete_own`, each limited to the owner's folder in `avatars`.

#### 2. Database types

**File**: `src/db/database.types.ts`

**Intent**: Regenerate with `npm run db:types` so `avatar_path` is typed.

**Contract**: `profiles.Row/Update` gain `avatar_path: string | null`.

#### 3. Avatar validation and URL helpers

**File**: `src/lib/profile-avatar.ts` (new), `src/lib/profile-avatar.test.ts` (new)

**Intent**: One place for the avatar rules, error copy and URL building, shared by the API, the Avatar form and the top bar.

**Contract**:
- Constants: `AVATAR_MAX_BYTES = 2 * 1024 * 1024`, `AVATAR_MIME_TYPES` (png, jpeg, webp → extension), `AVATAR_BUCKET = "avatars"`.
- Error copy and codes: `avatar-missing` ("Choose an image to upload."), `avatar-type` ("Use a PNG, JPEG or WebP image."), `avatar-large` ("The image must be at most 2 MB."), `avatar-unavailable` ("We could not save your avatar. Try again later."); notices `avatar-saved` ("Your avatar was saved."), `avatar-removed` ("Your avatar was removed.").
- `parseAvatarFile(file: unknown)` → `{ ok: true; file: File; extension } | { ok: false; code; error }`, checking presence, non-zero size, size limit and declared type (client-safe, used by the form).
- `sniffAvatarType(bytes: Uint8Array)` → the MIME type from magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF....WEBP`) or `null`; the API refuses a file whose sniffed type differs from the declared one.
- `avatarPageError(code)`, `avatarPageNotice(code)` mapping query codes to copy, like `profilePageError`.
- `avatarPublicUrl(supabaseUrl, path)` → `${supabaseUrl}/storage/v1/object/public/avatars/${path}`, or `null` when path is null.
- Unit tests cover each rule's boundary: exactly 2 MB passes, 2 MB + 1 byte fails, empty file fails, GIF and SVG fail, a PNG declared as JPEG fails the sniff.

#### 4. Avatar service

**File**: `src/lib/services/profile-avatar.ts` (new)

**Intent**: Read and change the user's avatar in Storage and `profiles`, never throwing, in the style of `profile-details.ts`.

**Contract**:
- `readAvatarPath(supabase, userId): Promise<{ path: string | null } | null>` (`null` = read failed).
- `replaceAvatar(supabase, userId, file, extension): Promise<{ ok: true } | { ok: false }>`: upload to `<userId>/<crypto.randomUUID()>.<ext>` with the file's content type and `upsert: false`, update `avatar_path` (expect exactly one row), then remove the previous path if any. On a failed update, remove the just-uploaded file. A failed delete of the old file still returns `ok: true`.
- `removeAvatar(supabase, userId): Promise<{ ok: true } | { ok: false }>`: read the path, set `avatar_path = null`, then remove the file. Removing when there is no avatar is `ok: true`.
- `readTopbarProfile` also selects `avatar_path` and returns it as `avatarPath` on `TopbarProfile`.

#### 5. API route

**File**: `src/pages/api/profile/avatar.ts` (new)

**Intent**: Accept the Avatar tab's multipart POST and redirect back to `/profile/avatar`.

**Contract**: `export const prerender = false`; `POST` only. Anonymous → `authPage(context, "/auth/signin")`. Field `intent`: `"remove"` calls `removeAvatar` → `?notice=avatar-removed`; anything else is an upload: `parseAvatarFile(form.get("avatar"))`, then sniff the first bytes, then `replaceAvatar` → `?notice=avatar-saved`. Errors redirect to `/profile/avatar?error=<code>` with the message via `authPage`. Validate `intent` with zod (`z.enum(["upload", "remove"]).default("upload")`).

#### 6. CI Storage

**File**: `.github/workflows/ci.yml`

**Intent**: Start `storage-api` in every job that starts local Supabase.

**Contract**: remove `storage-api` from the three `exclude=` lists; leave the other excluded services.

#### 7. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Cover the avatar API against a real server and Supabase Storage.

**Contract**: extend `requestWith` with a `multipart` option that sends a `FormData` body. New checks: anonymous POST to `/api/profile/avatar` → 302 to `/auth/signin`; a signed-in trainee uploads a small inline PNG → 302 to `/profile/avatar?notice=avatar-saved`, the `profiles` row has `avatar_path` starting with the user id, and the public URL returns 200 `image/png`; a text file declared `image/png` → `?error=avatar-type`; `intent=remove` → `?notice=avatar-removed`, `avatar_path` is null and the old public URL returns 400/404; the trainee cannot set `avatar_path` to another user's folder through Supabase REST (check constraint).

### Success Criteria:

#### Automated Verification:

- Migration applies on local Supabase: `npx supabase db reset`
- Migration check passes: `npm run migration-check`
- Types regenerated without diff after reset: `npm run db:types`
- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Smoke passes with the avatar checks: `npm run smoke`

#### Manual Verification:

- In local Supabase Studio, the `avatars` bucket is public with the 2 MB limit and the three MIME types
- After an upload and a second upload, only one file remains in the user's folder

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Avatar tab in Profile

### Overview

Turn `AccountTabs` into link tabs, add the Avatar tab and page, and build the upload/remove form.

### Changes Required:

#### 1. Link tabs

**File**: `src/components/account/AccountTabs.tsx`

**Intent**: Render several tabs as links, with the server choosing the selected one.

**Contract**: props become `tabs: { value: string; label: string; href: string }[]` and `current: string`. Each `TabsTrigger` renders `asChild` around an `<a href>` so it keeps `role="tab"` and `aria-selected`; only the current tab's `TabsContent` renders children. `/settings` passes one tab (`/settings`), `/profile` passes Details and Avatar.

#### 2. Profile tab list

**File**: `src/lib/profile-tabs.ts` (new)

**Intent**: One definition of Profile's tabs shared by both Profile pages.

**Contract**: `PROFILE_TABS = [{ value: "details", label: "Details", href: "/profile" }, { value: "avatar", label: "Avatar", href: "/profile/avatar" }]`.

#### 3. Profile pages

**File**: `src/pages/profile.astro`, `src/pages/profile/avatar.astro` (new)

**Intent**: Keep Details on `/profile` and add the Avatar page with the same chrome.

**Contract**: `profile.astro` passes `PROFILE_TABS` and `current="details"`. `avatar.astro` reads `avatar_path` with `readAvatarPath` and names for initials with `readProfileNames`, builds the public URL with `SUPABASE_URL`, maps `error`/`notice` query codes with `avatarPageError`/`avatarPageNotice`, and passes `current="avatar"`. A failed read sets `unavailable` and shows `avatar-unavailable` with the form disabled, like Details. `/profile/avatar` is already protected by the `/profile` prefix in `src/middleware.ts:4`.

#### 4. Avatar form

**File**: `src/components/profile/ProfileAvatarForm.tsx` (new)

**Intent**: Let the user pick, preview, save and remove their avatar, following `ProfileDetailsForm`.

**Contract**: props `avatarUrl: string | null`, `initials: string`, `serverError`, `notice`, `unavailable`. Shows a large shadcn `Avatar` (`size="lg"` or a `className` size from tokens) with `AvatarImage` + `AvatarFallback`. A file input (`name="avatar"`, `accept="image/png,image/jpeg,image/webp"`) shows a preview through `URL.createObjectURL` (revoked on change and unmount) and validates with `parseAvatarFile` before submit. The form posts `multipart/form-data` to `/api/profile/avatar`. **Save** submits `intent=upload`; **Remove** (shown only when an avatar exists) submits `intent=remove`. Use `useFormErrors`/`FormErrorToasts`, and `submitAuthForm` if it sends `FormData` unchanged; otherwise a plain `fetch` with `Accept: application/json` and the same result handling. Only role tokens and shared components.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`
- Existing e2e still passes (Details and Change password tabs selected): `npx playwright test tests/e2e/account-menu.spec.ts`

#### Manual Verification:

- `/profile` shows centered Details and Avatar tabs; clicking each opens its URL with that tab selected
- Picking an image shows a preview; Save stores it and shows "Your avatar was saved."
- Picking a GIF or a 3 MB file shows the matching error and saves nothing
- Remove returns the tab to initials and shows "Your avatar was removed."
- `/settings` still shows only the Change password tab and the password change still works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Avatar in the top bar

### Overview

Show the image in the avatar menu button, mark Profile current on its sub-pages, preview it in the home kitchen sink, and cover the flow with e2e.

### Changes Required:

#### 1. Top bar model

**File**: `src/lib/topbar.ts`, `src/lib/topbar.test.ts`

**Intent**: Carry the avatar URL and mark Profile current on every Profile tab.

**Contract**: `TopbarModelInput` gains `avatarUrl: string | null`; `TopbarAccount` gains `imageUrl: string | null`. An account item is current when `pathname === href` or `pathname.startsWith(href + "/")`; links keep exact matching. Tests: `/profile/avatar` marks Profile and not Settings; `imageUrl` passes through; `null` stays `null`.

#### 2. Top bar rendering

**File**: `src/components/Topbar.astro`, `src/components/TopbarActions.tsx`

**Intent**: Build the URL from `readTopbarProfile().avatarPath` and render it in the menu button.

**Contract**: `Topbar.astro` passes `avatarUrl: avatarPublicUrl(SUPABASE_URL, profile?.avatarPath ?? null)`. `AccountMenu` renders `<AvatarImage src={account.imageUrl} alt="" className="object-cover" />` before the existing `AvatarFallback` when `imageUrl` is set; the button keeps `aria-label="Account menu"`.

#### 3. Kitchen sink

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Add `avatarUrl: null` to existing previews and one signed-in preview with an image, so the sink shows both states.

**Contract**: the image preview uses a small static image under `public/` (e.g. `public/kitchen-sink/avatar.png`) so the sink stays session-free.

#### 4. E2E

**File**: `tests/e2e/profile-avatar.spec.ts` (new), `tests/e2e/fixtures/avatar.png` (new, small)

**Intent**: Prove that the uploaded avatar reaches the top bar and that removal restores initials.

**Contract**: as the CI trainee: open the account menu → Profile → Avatar tab (selected, URL `/profile/avatar`); Profile in the menu has `aria-current="page"`; upload the fixture with `setInputFiles`, save, see the notice; the top-bar button contains an `img` whose `src` contains `/storage/v1/object/public/avatars/`; Remove → the button shows initials and no `img`. The spec removes the avatar at the end so other specs see initials.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Home token check passes: `npm run check:home-tokens`
- Build passes: `npm run build`
- E2E passes including the new spec: `npx playwright test`

#### Manual Verification:

- After an upload, the image shows in the top bar on Home, Measurements, Profile and Settings, on desktop and at 360×800
- A user without an avatar still sees initials
- `/kitchen-sink/home` shows the image preview next to the initials previews

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `profile-avatar.test.ts`: size boundary (2 MB passes, +1 byte fails), empty and missing file, allowed and refused types, magic-byte sniffing for PNG/JPEG/WebP and a mismatch, error/notice code mapping, public URL building.
- `topbar.test.ts`: Profile current on `/profile/avatar`, `imageUrl` pass-through.

### Integration Tests:

- Smoke: anonymous refusal, upload, refused fake PNG, remove, public URL availability, the check constraint blocking another user's folder.
- E2E: upload reaches the top bar; remove restores initials; tab and menu marking.

### Manual Testing Steps:

1. Sign in, open the avatar menu → Profile → Avatar.
2. Upload a phone photo under 2 MB; confirm the preview and then the top bar on several pages.
3. Try a GIF and a file over 2 MB; confirm errors and no change.
4. Upload a second photo; confirm only one file remains in Storage.
5. Remove; confirm initials return everywhere.

## Performance Considerations

The top bar keeps one profile query (one extra column). The image is served straight from Supabase Storage's public CDN path; a new file name per upload makes long caching safe. A 2 MB image in a 32 px button is heavy but accepted, since no resizing is in scope.

## Migration Notes

Additive only: nullable column, a check that holds for `null`, a grant, a bucket inserted with `on conflict do nothing`, and new policies. Existing rows keep `avatar_path = null` and show initials. Hosted Supabase gets the bucket through `supabase db push` on `main`.

## References

- Prior change: `context/archive/2026-10-26-user-profile-rework/plan.md`
- Name columns and grant pattern: `supabase/migrations/20261026120000_profile_names.sql`
- API pattern: `src/pages/api/profile/index.ts`
- Form pattern: `src/components/profile/ProfileDetailsForm.tsx`
- Tabs: `src/components/account/AccountTabs.tsx`
- Top bar: `src/lib/topbar.ts:39-41`, `src/components/TopbarActions.tsx:31-38`
- CI Supabase exclude list: `.github/workflows/ci.yml:45`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Avatar data and API

#### Automated

- [x] 1.1 Migration applies on local Supabase: `npx supabase db reset` — 10a0739
- [x] 1.2 Migration check passes: `npm run migration-check` — 10a0739
- [x] 1.3 Types regenerated without diff after reset: `npm run db:types` — 10a0739
- [x] 1.4 Unit tests pass: `npm test` — 10a0739
- [x] 1.5 Lint passes: `npm run lint` — 10a0739
- [x] 1.6 Type check passes: `npx astro check` — 10a0739
- [x] 1.7 Smoke passes with the avatar checks: `npm run smoke` — 10a0739

#### Manual

- [x] 1.8 In local Supabase Studio, the `avatars` bucket is public with the 2 MB limit and the three MIME types — 10a0739
- [x] 1.9 After an upload and a second upload, only one file remains in the user's folder — 10a0739

### Phase 2: Avatar tab in Profile

#### Automated

- [x] 2.1 Unit tests pass: `npm test`
- [x] 2.2 Lint passes: `npm run lint`
- [x] 2.3 Type check passes: `npx astro check`
- [x] 2.4 Build passes: `npm run build`
- [x] 2.5 Existing e2e still passes (Details and Change password tabs selected): `npx playwright test tests/e2e/account-menu.spec.ts`

#### Manual

- [x] 2.6 `/profile` shows centered Details and Avatar tabs; clicking each opens its URL with that tab selected
- [x] 2.7 Picking an image shows a preview; Save stores it and shows "Your avatar was saved."
- [x] 2.8 Picking a GIF or a 3 MB file shows the matching error and saves nothing
- [x] 2.9 Remove returns the tab to initials and shows "Your avatar was removed."
- [x] 2.10 `/settings` still shows only the Change password tab and the password change still works

### Phase 3: Avatar in the top bar

#### Automated

- [ ] 3.1 Unit tests pass: `npm test`
- [ ] 3.2 Lint passes: `npm run lint`
- [ ] 3.3 Type check passes: `npx astro check`
- [ ] 3.4 Home token check passes: `npm run check:home-tokens`
- [ ] 3.5 Build passes: `npm run build`
- [ ] 3.6 E2E passes including the new spec: `npx playwright test`

#### Manual

- [ ] 3.7 After an upload, the image shows in the top bar on Home, Measurements, Profile and Settings, on desktop and at 360×800
- [ ] 3.8 A user without an avatar still sees initials
- [ ] 3.9 `/kitchen-sink/home` shows the image preview next to the initials previews
