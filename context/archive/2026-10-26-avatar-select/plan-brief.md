# Avatar tab in Profile — Plan Brief

> Full plan: `context/changes/avatar-select/plan.md`

## What & Why

A signed-in user can add their own avatar on a new **Avatar** tab in Profile, next to **Details**. Today the avatar in the top bar shows only initials; this change lets the user upload an image, see it there, and remove it again.

## Starting Point

`/profile` shows a single Details tab through `AccountTabs`, which accepts one tab and renders no links. The top-bar avatar shows initials only. Supabase Storage is enabled but unused, and CI starts Supabase without `storage-api`.

## Desired End State

Profile has two centered link tabs: Details (`/profile`) and Avatar (`/profile/avatar`). On Avatar the user picks a PNG, JPEG or WebP image up to 2 MB, previews it, saves it, or removes it. The image replaces the initials in the top-bar avatar on every page; initials remain the fallback.

## Key Decisions Made

| Decision        | Choice                                                 | Why (1 sentence)                                                                 |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Storage         | Public `avatars` bucket, owner writes only own folder  | A plain URL works in every `<img>` without signing a link on each render.         |
| File limits     | PNG/JPEG/WebP, at most 2 MB, type checked by bytes too | Fits compressed phone photos and refuses a renamed non-image.                     |
| Editing         | None; `object-cover` in a circle                        | No new library and the form stays a plain multipart POST.                        |
| Display         | Top bar + Avatar tab, initials as fallback             | The avatar shows where it already lives today.                                   |
| Removal         | Remove button returns to initials                      | Mirrors clearing a name in Details.                                              |
| Route and tabs  | `/profile/avatar`, tabs as links, Profile marked on both | Each tab has its own URL, error and notice, and works without JS.              |
| Reference       | `profiles.avatar_path`, new file name per upload       | Keeps one top-bar query and makes caching safe.                                  |
| Tests           | Unit + smoke + e2e                                     | Covers rules, Storage policies, and the image reaching the top bar.              |

## Scope

**In scope:**
- Migration: `avatar_path` with own-folder check and grant, `avatars` bucket, per-operation Storage policies
- `POST /api/profile/avatar` (upload and remove), shared validation in `src/lib/profile-avatar.ts`
- Link tabs in `AccountTabs`, `/profile/avatar` page and form
- Image in the top-bar avatar, Profile marked on `/profile/avatar`, home kitchen-sink preview
- Storage in CI, unit, smoke and e2e tests

**Out of scope:**
- Cropping or resizing, GIF/SVG, files over 2 MB
- Avatars outside the top bar and the Avatar tab (e.g. trainer panel)
- Private bucket or signed URLs; cleanup of files for deleted accounts
- `/profile` kitchen sink; a roadmap item

## Architecture / Approach

The Avatar form posts multipart data to `POST /api/profile/avatar`. The route validates the file (`profile-avatar.ts`), then `services/profile-avatar.ts` uploads it to `avatars/<user-id>/<uuid>.<ext>`, sets `profiles.avatar_path`, and deletes the previous file. Remove clears the column, then deletes the file. `readTopbarProfile` also reads `avatar_path`; `Topbar.astro` turns it into a public URL that `TopbarActions` renders with `AvatarImage` over the initials fallback.

## Phases at a Glance

| Phase                     | What it delivers                                                  | Key risk                                                         |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Avatar data and API    | Bucket, column, policies, API, Storage in CI, unit + smoke        | A policy letting a user write or delete another user's file      |
| 2. Avatar tab in Profile  | Link tabs, `/profile/avatar`, upload/preview/remove form          | Link tabs losing `role="tab"`, breaking the account-menu e2e     |
| 3. Avatar in the top bar  | Image in the menu button, Profile marked, kitchen sink, e2e       | A broken image hiding the initials instead of falling back       |

**Prerequisites:** Local Supabase (Docker) with Storage for migration, smoke and e2e; user-profile-rework merged (it is).
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes hosted Supabase lets `supabase db push` insert into `storage.buckets` and create policies on `storage.objects` (the standard approach).
- Turning on `storage-api` makes every CI job that starts Supabase a little slower.
- A 2 MB image in a 32 px button is heavy; resizing is deliberately left for a later change.

## Success Criteria (Summary)

- A user uploads an avatar on Profile → Avatar and sees it in the top bar on every page
- A user removes the avatar and sees their initials again
- Wrong type, oversized or renamed files are refused, and no user can touch another user's avatar
