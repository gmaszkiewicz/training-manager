---
date: 2026-10-14T04:36:47+02:00
researcher: gmaszkiewicz
git_commit: 0be481e03d54dea2ce4f5cc176cabf1f37e42500
branch: cursor/reactive-trainee-search
repository: training-manager
topic: "Show matching unlinked trainee emails as the trainer types"
tags: [research, codebase, trainer-panel, trainer-links]
status: complete
last_updated: 2026-10-14
last_updated_by: gmaszkiewicz
---

# Research: Show matching unlinked trainee emails as the trainer types

**Date**: 2026-10-14T04:36:47+02:00
**Researcher**: gmaszkiewicz
**Git Commit**: 0be481e03d54dea2ce4f5cc176cabf1f37e42500
**Branch**: cursor/reactive-trainee-search
**Repository**: training-manager

## Research Question

What does the trainee email finder on `/measurements` do today, and what do S-29 and MS-21 require for a search that shows matching unlinked trainee emails while the trainer types?

## Summary

When `measurements.astro` has `role === "trainer"`, it renders `TrainerPanel` with `mode="trainer"` (`src/pages/measurements.astro:167-169`). In that mode the card `h1` is `Find trainee by email` (`src/components/trainer/TrainerPanel.astro:56-57`). The email control in that form is an `Input` with `name="email"`, `type="email"`, `required`, and `aria-label="Email"`, and that JSX does not pass `placeholder` (`TrainerPanel.astro:66`). `Input` forwards remaining props onto the element, including a `placeholder` when a caller passes one (`src/components/ui/input.tsx:5-17`). The form is `method="POST"` and `action="/api/trainer-links"`, and this form has no `client:*` directive (`TrainerPanel.astro:64-69`). The submit text is `Link trainee`.

That POST calls `linkTraineeByEmail`, which calls the RPC `link_trainee_by_email` with the submitted string (`src/pages/api/trainer-links/index.ts:42`, `src/lib/services/trainer-links.ts:34`). In `supabase/migrations/20260928170000_trainer_links.sql`, the function returns null unless the caller has `profiles.role = 'trainer'` (`:36-43`), sets `v_email` to `lower(btrim(p_email))` (`:45`), and selects one `auth.users` id where `lower(btrim(u.email))` equals that value (`:51-54`). It returns null unless that id has `profiles.role = 'trainee'` (`:56-62`), then inserts `trainer_links` and returns the uuid (`:65-69`). This research did not execute the database.

The `profiles` table created in `supabase/migrations/20260927065512_trainee_profile.sql:1-6` has columns `id`, `role`, and `created_at`. A search of `supabase/migrations` for `create function` returned two statements, `link_trainee_by_email` and `measurement_months`. The same search for `ilike` returned no lines. `src/db/database.types.ts:145-152` lists those two names under `public.Functions`. `listTrainerLinks` selects `trainee_id, email, linked_at` from `trainer_links` with no `limit` and no pattern filter in that call (`src/lib/services/trainer-links.ts:10`). The select policy on that table is `auth.uid() = trainer_id` (`20260928170000_trainer_links.sql:13-17`). `profiles_select_own` is `auth.uid() = id` (`20260927065512_trainee_profile.sql:10-14`). In the inspected migrations, `auth.users` is read inside `link_trainee_by_email` (`:53`) and those files do not grant `authenticated` a select on `auth.users`.

MS-21 (`context/foundation/roadmap.md:49`) and the S-29 outcome (`roadmap.md:465`, `context/changes/reactive-trainee-search/change.md:12-13`) require a search that shows trainee emails matching the typed character sequence, at most the first 10 when more match, excluding trainees who are already linked, with `Find trainee by email` as the field placeholder rather than a heading above the field. Those sentences do not state an empty field, case folding, substring versus prefix, the sort that makes a match first, a click, or the heading that replaces the moved `h1` text. The S-29 unknowns line is `—` (`roadmap.md:471`). The risk line says a typed sequence can show trainee emails this trainer has not linked (`roadmap.md:472`).

Smoke step `trainer measurements confirms the role` expects status 200 and body text `Find trainee by email` (`scripts/smoke.mjs:430-433`). That body check is `actual.body.includes(text)` (`scripts/smoke.mjs:883`). This research did not run smoke.

## Detailed Findings

### Finder on `/measurements`

A signed-in user whose ensured role is `trainee` takes the journal branch (`src/pages/measurements.astro:80-81`). When that comparison is false, the branch calls `listTrainerLinks` and `selectTrainerPreview` (`measurements.astro:114-120`). The page then passes `mode="trainer"` when `role === "trainer"`, and `mode="unavailable"` otherwise (`measurements.astro:168-169`).

In trainer mode, with `trainerLinksLoaded`, the card shows the POST form (`TrainerPanel.astro:59-70`). When `selectedLink` is set, the form includes a hidden `trainee` input (`TrainerPanel.astro:65`). When `trainerLinks.length > 0`, an `h2` reads `Body measurements`, and `LinkedTraineeField` renders with `client:load` when `selectedLink` is set (`TrainerPanel.astro:71-76`). That field is a separate control from the email input named in `change.md:15`. When `trainerLinksLoaded` is false, the form is replaced by `Could not load trainees` (`TrainerPanel.astro:102-104`).

`selectTrainerPreview` copies the link rows and sorts them with `a.email.localeCompare(b.email)` (`src/lib/trainer-preview.ts:11`). That sort is the linked-list order on this page. It is not a search ranking, and this function does not cap the array at 10.

### Exact email link

`POST /api/trainer-links` redirects to `/auth/signin` when `context.locals.user` is absent (`src/pages/api/trainer-links/index.ts:25-27`). It redirects with `Enter an email address` when `email.trim().toLowerCase()` is `""` (`index.ts:38-39`). It passes the original submitted string to `linkTraineeByEmail` (`index.ts:37-42`). A failed RPC redirects with `No trainee with that email` (`index.ts:43-44`). Success redirects to `/measurements?trainee=<traineeId>` (`index.ts:47`). The route does not check `profiles.role`; the function does (`20260928170000_trainer_links.sql:36-43`).

The stored link email is the normalized `v_email` (`20260928170000_trainer_links.sql:65-66`). `on conflict (trainer_id, trainee_id) do nothing` (`:67`) leaves an existing row in place and still returns the trainee id (`:69`).

A search of `src` for `.rpc(` in `*.{ts,tsx,astro}` returned two call sites: `link_trainee_by_email` in `trainer-links.ts:34` and `measurement_months` in `src/lib/services/measurements.ts:216`. Neither call lists emails by a character sequence.

### Where an unlinked email lives

`trainer_links.email` is the copy written at link time (`20260928170000_trainer_links.sql:4`, `:65-66`). A trainer session can read those copies for rows with `trainer_id = auth.uid()` (`:13-17`). Emails of accounts that have no such row are read, in the inspected migrations, from `auth.users` inside the security-definer function (`:23-27`, `:51-54`). That function returns one uuid or null. It does not return a list, apply a character-sequence predicate, limit the result to 10, or skip rows already present in `trainer_links`.

`prd.md` was searched for `MS-21`, `trainee search`, and `Find trainee by email`. That search returned no matches. The link requirement that is in the PRD is FR-007: a trainer can link an existing trainee by email, with no pending or accept step (`context/foundation/prd.md:81`). The measurement visibility sentence is about measurements, not a directory of emails (`prd.md:88`). Roadmap source for MS-21 is “user description for the reactive trainee search” (`roadmap.md:26`).

### What S-29 adds on top of that link

The current required sentences, which agree with `change.md:12-13`:

- `roadmap.md:25` — a trainer typing in the trainee search sees emails matching that character sequence, at most the first 10, and does not see trainees who are already linked. `Find trainee by email` is the placeholder in that field, not a heading above it.
- `roadmap.md:49` — MS-21 states the same cap, the same exclusion, and the same placeholder.
- `roadmap.md:91` and `roadmap.md:465-468` — S-29 outcome matches that sentence. Change ID is `reactive-trainee-search`. Prerequisites are `S-04, S-13`. Status is `ready`.
- `roadmap.md:103` — Stream E reads `S-09 → S-10 → S-12 → S-13 → S-28 → S-29`. S-29 joins Stream B at S-04 for who is already linked. S-28 is earlier in that chain and is not in the prerequisite cell.
- `roadmap.md:472` — risk: a typed sequence can show trainee emails this trainer has not linked.
- `roadmap.md:507` — issue [#95](https://github.com/gmaszkiewicz/training-manager/issues/95). `change.md:21` has the same URL.

The view note names the heading and the email input in `TrainerPanel.astro` (`change.md:15`). It does not name `LinkedTraineeField` or the `Link trainee` button.

### Checks that mention the heading

The smoke body matcher for this step is substring inclusion (`scripts/smoke.mjs:882-883`). The step does not assert an `h1` role or a `placeholder` attribute (`smoke.mjs:430-433`). If the same character sequence remains anywhere in the HTML body, including a `placeholder` attribute, this matcher still passes. This research did not run smoke, so that is a reading of the matcher, not an executed result.

A search of `tests` for `Find trainee by email`, `trainer-links`, and `Link trainee` returned no matches.

## Code References

- `src/components/trainer/TrainerPanel.astro:56-76` — trainer `h1`, email POST form, and the separate linked-trainee island
- `src/pages/measurements.astro:114-120` — trainer link load and preview selection
- `src/pages/measurements.astro:167-169` — `mode="trainer"` versus `unavailable`
- `src/pages/api/trainer-links/index.ts:24-47` — exact-email POST and redirects
- `src/lib/services/trainer-links.ts:10` — linked-row select with no pattern and no limit
- `src/lib/services/trainer-links.ts:34` — `link_trainee_by_email` RPC
- `src/lib/trainer-preview.ts:11` — linked emails sorted with `localeCompare`
- `supabase/migrations/20260928170000_trainer_links.sql:13-69` — own-row select policy and exact email function
- `supabase/migrations/20260927065512_trainee_profile.sql:1-14` — `profiles` columns and own-row select
- `src/components/ui/input.tsx:5-17` — `placeholder` is a forwarded prop; placeholder color is `placeholder:text-muted-foreground`
- `scripts/smoke.mjs:430-433` — body substring `Find trainee by email`
- `scripts/smoke.mjs:883` — `actual.body.includes(text)`
- `context/foundation/roadmap.md:49` — MS-21
- `context/foundation/prd.md:81` — FR-007 link by email

## Architecture Insights

Linking one trainee is a security-definer function that reads `auth.users` and returns an id. Listing emails for accounts this trainer has not linked is outside `trainer_links_select_own` and outside `profiles_select_own`. The S-29 risk line accepts that a typed sequence can show those emails (`roadmap.md:472`), so a search result cannot be a client select of `trainer_links` or `profiles` as those policies are written.

The current email control is `type="email"` and `required` (`TrainerPanel.astro:66`). Those attributes belong to the submit form. MS-21 describes matching while the trainer types a character sequence (`roadmap.md:49`). This research did not run a browser, so it does not report how a browser treats a partial sequence in an email input.

`src/components/ui` contains `input.tsx`, `button.tsx`, `label.tsx`, `textarea.tsx`, and `LibBadge.astro`. A search of that directory found no Combobox, Command, or Popover module. `LinkedTraineeField` is the existing floating email list on this card (`TrainerPanel.astro:76`). It lists `trainerLinks`, which are already linked, so it is the set MS-21 says not to show.

## Historical Context (from prior changes)

- `context/archive/2026-09-30-measurement-copy-polish/plan.md:25` — **Supported** for the current panel. The trainer heading is `Find trainee by email`, the email field keeps accessible name `Email`, and `Link trainee` is full width. Current markup matches that sentence (`TrainerPanel.astro:56-69`). **Contradicted** as the S-29 rule: MS-21 puts that string in the placeholder (`roadmap.md:49`, `change.md:13`).
- `context/archive/2026-10-12-visual-update-for-linked-trainee/plan.md:21` — **Supported** as the S-28 decision. That plan keeps the link form and the heading rule. **Partial** for S-29: the current S-29 text moves the heading string to the placeholder (`change.md:13`) and does not say whether `Link trainee` stays.
- `context/archive/2026-10-12-visual-update-for-linked-trainee/research.md:42` — **Partial**. The `h1` text is still `Find trainee by email`; in the current file that expression is `TrainerPanel.astro:57`, not the cited `:55-56`. The following bullets in that note describe a `ul` of email anchors (`research.md:45-46`). The current panel renders `LinkedTraineeField` there (`TrainerPanel.astro:75-76`).

## Related Research

- `context/archive/2026-10-12-visual-update-for-linked-trainee/research.md` — linked-trainee control that now sits under `Body measurements`, separate from the finder
- `context/archive/2026-09-30-measurement-copy-polish/plan.md` — archived contract that made `Find trainee by email` the trainer heading

## Open Questions

These are unspecified in `change.md` and in the S-29 / MS-21 sentences. The unknowns line does not list them (`roadmap.md:471`).

- Empty field: no rule for zero characters.
- Case: the link function folds case with `lower(btrim(...))` (`20260928170000_trainer_links.sql:45-54`). The search sentences do not say whether a typed sequence is folded the same way.
- Match shape: “character sequence” is not defined as prefix, substring, or another comparison.
- Order: “the first 10” names no sort. `localeCompare` on `trainer-preview.ts:11` orders linked rows on the page, not a search result.
- Eligible accounts: the sentences say trainee emails, and they exclude trainees who are already linked. They do not say whether a trainee linked only to a different trainer is included. The risk line is about emails this trainer has not linked (`roadmap.md:472`).
- Click and submit: no rule for choosing a shown email. FR-007 still requires a link by email (`prd.md:81`). `change.md` does not say whether `Link trainee` and the exact POST remain.
- Heading: the sentences say `Find trainee by email` is not a heading above the field. They do not name the trainer `h1` that replaces it. The non-trainer branch of the same expression is `Measurements` (`TrainerPanel.astro:57`).
- Zero matches: no rule for a sequence that matches no email.
