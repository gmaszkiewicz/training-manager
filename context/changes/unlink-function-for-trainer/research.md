---
date: 2026-10-17T07:14:00+02:00
researcher: gmaszkiewicz
git_commit: 019babaa882a837dd2ff308bf051fd39393f5398
branch: cursor/unlink-function-for-trainer
repository: training-manager
topic: "Shared profile region, unlink list paging, and role profile labels"
tags: [research, codebase, profile, trainer-links, topbar, pagination]
status: complete
last_updated: 2026-10-17
last_updated_by: gmaszkiewicz
last_updated_note: "MS-24 now requires one shared main div of the same size, with pagination on the linked-trainee list and not on Profile or Change password. That replaces using the wide measurement journal card as the profile layout."
---

# Research: Shared profile region, unlink list paging, and role profile labels

**Date**: 2026-10-17T07:14:00+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: 019babaa882a837dd2ff308bf051fd39393f5398
**Branch**: cursor/unlink-function-for-trainer
**Repository**: training-manager

## Research Question

For change `unlink-function-for-trainer` (S-32, MS-24), what exists today for Profile, change password, the header profile label, and trainer–trainee links, and what does the updated note require of the shared main region and of pagination?

## Summary

MS-24, the S-32 outcome, and this change's notes agree: Change password is a button for a trainee and a trainer, Unlink trainees is a trainer-only button, the linked-trainee list is paged 5, 10, or 15 in the home page style, Profile and Change password do not show that pager or a trainee-count control, and those three screens show their data in one main div of the same size. The header profile reads `Trainee profile` or `Trainer profile` (`context/foundation/roadmap.md:52`, `context/foundation/roadmap.md:507`, `context/changes/unlink-function-for-trainer/change.md:12-21`).

`/profile` is one protected page. Its data region is one card, `w-full max-w-sm`, with no height class. The change-password form is mounted in that card. The page does not read role, does not offer Unlink trainees, and does not render a pager. The signed-in header link label is `Profile`.

No unlink function or delete handler is in the inspected link migration, `trainer-links.ts`, `src/pages/api/trainer-links/index.ts`, or the generated `Functions` block. A trainer measurement read depends on a `trainer_links` row. Stream F says S-32 does not change measurement data.

The public home has no list. Its content region is `max-w-4xl`. The measurement journal, when entries are loaded, sets `min-w-[calc(75rem+4px)]`. That width is a different region from the profile card. Page sizes `[5, 10, 15]` are rendered on `MeasurementBrowser`, which is the measurements list, not Profile.

## Detailed Findings

### What the updated note settles

The list sentence and the shared-region sentence are both in MS-24 (`context/foundation/roadmap.md:52`) and in the change notes (`context/changes/unlink-function-for-trainer/change.md:17-21`). The S-32 outcome uses the same split: a home-style list paged 5, 10, or 15; Profile and Change password show no pagination and no control for how many trainees appear on a page; the three screens show their data in one main div of the same size (`context/foundation/roadmap.md:507`).

S-32 unknowns are an em dash (`context/foundation/roadmap.md:513`). The notes do not name a height, an overflow rule, a confirmation step, or separate URLs for the three screens.

`prd.md` still has no MS-24 section. FR-007 and FR-008 are link-by-email and preview (`context/foundation/prd.md:81-84`). Visibility is the trainee plus trainers who linked them (`context/foundation/prd.md:88`).

### Profile is one content-sized card

`src/pages/profile.astro` renders `Layout`, a top-bar wrapper, then a centering wrapper, then one card (`src/pages/profile.astro:12-17`). The card classes are `w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-card-foreground`. A read of that file found no `min-h`, `h-`, or pager class. The heading is `Profile`, the section heading is `Change password`, and `ChangePasswordForm` is mounted (`src/pages/profile.astro:18-23`). The file does not branch on role.

The form's submit control reads `Save password` (`src/components/auth/ChangePasswordForm.tsx:140-142`). `/profile` is one of the two entries in `PROTECTED_ROUTES` (`src/middleware.ts:4`).

A search of `src` `*.{astro,tsx}` for a `<main` tag matched no files. The profile data region in this page is the card at `src/pages/profile.astro:17`, not a `<main>` element. `Layout.astro` puts the page slot in `div.flex.flex-1.flex-col` (`src/layouts/Layout.astro:37-39`). That wrapper has no width or height utility of its own.

Sign-in uses the same card classes inside a `min-h-full` column (`src/pages/auth/signin.astro:12-15`). Profile's outer column does not use `min-h-full` (`src/pages/profile.astro:13-16`). The auth kitchen sink wraps two different cards in `min-h-[28rem]` frames (`src/pages/kitchen-sink/auth.astro:26`, `src/pages/kitchen-sink/auth.astro:46`). That class is not on `profile.astro`. MS-24 does not name `28rem`.

Because the profile card has no height class, its border box follows the children. The password form is in the card today. A button row and a paged trainee list are different amounts of content. Sharing the element keeps the width rule (`w-full max-w-sm`). It does not, by itself, keep the height equal. The notes require the region to be the same size on all three screens (`context/changes/unlink-function-for-trainer/change.md:17`).

### Home page style is not the journal's width

`/` renders `Welcome` (`src/pages/index.astro:5-7`). A full read of `Welcome.astro` shows a top bar and one content div, `mx-auto flex max-w-4xl ... px-4 py-24 ... sm:py-32 lg:py-40`, with the heading `Training Manager` and `HomeActions` (`src/components/Welcome.astro:8-20`). That file has no list, no pager, and no `rounded-2xl` card.

`HomeActions` renders `Sign in` as `variant="default"` and `Sign up` as `variant="outline"` when `signedIn` is false, and renders nothing when `signedIn` is true (`src/components/home/HomeActions.tsx:8-19`).

`pageSizes` is `[5, 10, 15]` and `defaultPageSize` is `10` (`src/lib/measurement-page.ts:4-8`). `MeasurementBrowser` renders that set in a group labeled `Entries per page` (`src/components/measurements/MeasurementBrowser.tsx:638`). When `showPager` is true it renders Previous page and `Page {currentPage} of {pageCount}` (`src/components/measurements/MeasurementBrowser.tsx:764-779`).

When measurements are loaded, the journal card adds `w-max min-w-[calc(75rem+4px)]` (`src/components/journal/TraineeJournal.astro:47-48`). That minimum width is the measurements layout. Putting that card on Profile would change the region relative to `max-w-sm`. The updated note keeps Profile, Change password, and the trainee list in one div (`context/foundation/roadmap.md:507`). The pager behavior can be reused inside that div. The journal's minimum width cannot, if the three screens stay the same size.

An earlier reading treated the measurement journal card as the profile list layout. The shared-div sentence supersedes that layout. The page-size set and the prev/next pager remain the inspected paging UI.

### Header label

`TopbarLink.label` includes the literal `"Profile"` (`src/lib/topbar.ts:9-12`). The signed-in return of `topbarModel` uses that label and href `/profile` (`src/lib/topbar.ts:49-56`). The greeting is `"Hello,"` when `role` is `"trainee"` or `"trainer"`, and `null` when `role` is `null` (`src/lib/topbar.ts:43`). `topbar.test.ts` expects `label: "Profile"` for a trainee (`src/lib/topbar.test.ts:64`), a trainer (`src/lib/topbar.test.ts:83`), and `role: null` (`src/lib/topbar.test.ts:143`). MS-24's header strings are `Trainee profile` and `Trainer profile`. It does not name the `role: null` label.

### Unlink is still a missing definer path

`public.trainer_links` grants `SELECT` to `authenticated` (`supabase/migrations/20260928170000_trainer_links.sql:21`). The same file's insert is `link_trainee_by_email` with `ON CONFLICT DO NOTHING` (`supabase/migrations/20260928170000_trainer_links.sql:67`). `measurements_select_linked_trainer` is an `EXISTS` on `trainer_links` (`supabase/migrations/20260928170000_trainer_links.sql:77`). A search of `supabase/migrations` for `trainer_links` hits that file and `20261014120000_search_unlinked_trainee_emails.sql`. The second file reads the table inside the search function. It does not add a delete grant.

`trainer-links.ts` exports `listTrainerLinks`, `linkTraineeByEmail`, and `searchUnlinkedTrainees` (`src/lib/services/trainer-links.ts:6`, `src/lib/services/trainer-links.ts:29`, `src/lib/services/trainer-links.ts:46`). `listTrainerLinks` selects `trainee_id, email, linked_at` and takes no page argument (`src/lib/services/trainer-links.ts:10`). `src/pages/api/trainer-links/index.ts` exports `GET` and `POST` (`src/pages/api/trainer-links/index.ts:32`, `src/pages/api/trainer-links/index.ts:57`). A search of that file for `export const DELETE` matched nothing.

The generated `Functions` block lists `link_trainee_by_email`, `measurement_months`, and `search_unlinked_trainee_emails` (`src/db/database.types.ts:145-156`). A search of `src` `*.{ts,tsx,astro}` for `unlink` matched `search_unlinked_trainee_emails` and no unlink handler.

Stream F says S-32 does not change measurement data (`context/foundation/roadmap.md:110`). Deleting the link row removes the `EXISTS` match for that trainer. It does not update `measurements`. S-04 left "Removing a link" out of that slice (`context/archive/2026-09-28-trainer-link-preview/plan.md:33`). S-32 is the slice that includes it.

`selectTrainerPreview` sorts links with `localeCompare` on email (`src/lib/trainer-preview.ts:21`). MS-24 does not say the unlink list uses that order.

## Code References

- `context/foundation/roadmap.md:52` — MS-24, including the shared main div and pagination limited to the list
- `context/foundation/roadmap.md:507` — S-32 outcome
- `context/changes/unlink-function-for-trainer/change.md:17` — same-size main div; no pager on Profile or Change password
- `src/pages/profile.astro:17-23` — `max-w-sm` card and the mounted password form
- `src/components/Welcome.astro:12` — home content region `max-w-4xl`, no list
- `src/components/journal/TraineeJournal.astro:48` — loaded journal `min-w-[calc(75rem+4px)]`
- `src/pages/kitchen-sink/auth.astro:26` — `min-h-[28rem]` frame, not used on Profile
- `src/lib/measurement-page.ts:4-8` — page sizes 5, 10, 15, default 10
- `src/components/measurements/MeasurementBrowser.tsx:638` — `Entries per page`
- `src/components/measurements/MeasurementBrowser.tsx:764-779` — prev/next pager
- `src/lib/topbar.ts:43-56` — greeting and `Profile` link
- `supabase/migrations/20260928170000_trainer_links.sql:21` — select-only grant
- `supabase/migrations/20260928170000_trainer_links.sql:77` — trainer measurement visibility follows the link row
- `src/pages/api/trainer-links/index.ts:32` — search `GET`; no `DELETE` export in this file
- `src/lib/services/trainer-links.ts:6-10` — full link list, no page argument

## Architecture Insights

The three screens are not three layouts. The note puts their data in one div so the region stays the same size. On the current profile page that div is the `max-w-sm` card, and its height follows its children. A plan that swaps the button row, the password form, and the paged list inside that card still needs a height rule the notes do not give. The journal minimum width and the home `max-w-4xl` hero are different regions. Using either of them as the profile div would make the three screens a different size from today's profile card. Using one of them for the list and the profile card for the other two screens would make those screens different sizes from each other.

Unlink stays a new `SECURITY DEFINER` function in a new migration. Authenticated clients have `SELECT` on `trainer_links` in the link migration and no delete grant there. The preview policy already keys off the row.

The header change is in `topbarModel`. The label union and the tests currently use `Profile`.

## Historical Context (from prior changes)

- `context/archive/2026-09-28-trainer-link-preview/plan.md:33` — S-04 excluded removing a link. Supported for that slice. S-32 includes removal (`context/foundation/roadmap.md:507`).
- `context/archive/2026-09-28-trainer-link-preview/plan.md:72` — select-only client grants and a definer insert. Supported by `supabase/migrations/20260928170000_trainer_links.sql:21`.
- `context/archive/2026-10-10-handle-change-and-reset-pass/plan.md:225` — inline Change password section on Profile. Supported by `src/pages/profile.astro:18-23`. MS-24 adds a button and a separate Change password screen inside the same div. It does not rewrite the password rules in that plan.
- `context/archive/2026-09-30-measurement-copy-polish/plan-brief.md:21` — greeting `Hello,` plus email, without a role word. Supported by `src/lib/topbar.ts:43`. The roadmap Intent line that still says `Hello trainee` or `Hello trainer` (`context/foundation/roadmap.md:25`) is stale for the greeting.
- `context/archive/2026-10-08-pagination-and-filter-measurements/` — the 5/10/15 pager that `pageSizes` still defines (`src/lib/measurement-page.ts:4-8`). MS-24 limits that control to the linked-trainee list.

## Related Research

- `context/archive/2026-10-14-reactive-trainee-search/research.md` — search omits trainees who already have a link row
- `context/archive/2026-10-12-visual-update-for-linked-trainee/research.md` — linked-trainee control on `/measurements`, separate from the Profile list
- `context/archive/2026-10-15-some-display-changes/research.md` — page-size button variants on `MeasurementBrowser`

## Open Questions

- MS-24 says the shared region is the same size and does not name a height, a min-height, or overflow. The profile card has no height class (`src/pages/profile.astro:17`). The auth kitchen sink's `min-h-[28rem]` (`src/pages/kitchen-sink/auth.astro:26`) is not cited by MS-24.
- MS-24 does not say whether a page of 15 trainees scrolls inside that div.
- MS-24 does not say whether the three screens are states of `/profile` or separate routes. One shared div fits one page.
- MS-24 does not mention a confirmation step, an empty-list sentence, or the header label when `role` is `null`.
- MS-24 does not say the unlink list's sort. `selectTrainerPreview` sorts by email (`src/lib/trainer-preview.ts:21`).
- MS-24 does not say whether the unlink page size is stored apart from the measurements page-size key.
