# Unlink trainees and label the profile by role — Plan Brief

> Full plan: `context/changes/unlink-function-for-trainer/plan.md`
> Research: `context/changes/unlink-function-for-trainer/research.md`

## What & Why

A trainer needs to remove a linked trainee, and both roles need Change password as a button on Profile. The header should say which profile this is. S-32 / MS-24 puts Profile, Change password, and the unlink list in one region of the same size, with paging only on the list.

## Starting Point

`/profile` is one `max-w-sm` card with the password form always visible. The header link says Profile. Trainers can read and create `trainer_links` rows through a security-definer function, and they cannot delete them. A trainer sees a trainee's measurements only while the link row exists. Page sizes 5, 10, and 15 already exist on the journal, stored in the journal's own cookie.

## Desired End State

Profile shows a heading and a Change password button. A trainer also sees Unlink trainees. Those screens share one card of the same width and height. The list is paged 5, 10, or 15, ordered by email, and scrolls inside the card. Unlink drops that trainer's link immediately and leaves the trainee's measurements in place. The header reads Trainee profile or Trainer profile.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Shared region | One fixed-height card; trainee rows scroll | The three screens stay the same size, and a page of 15 stays inside the card | Plan |
| Card height | Theme token, used as one utility | `profile.astro` is scanned by the token check, which rejects an arbitrary rem class | Plan |
| Screens | Views of `/profile` | The password flow already returns to `/profile`, and one card matches one page | Plan |
| Password URLs | Keep `/profile?error=current-password` and `/profile?notice=password-changed` | Smoke asserts those locations exactly; the page opens Change password from them | Plan |
| Unlink confirmation | Immediate | The note names no confirm step, and the trainer can link the email again | Plan |
| List order | Email A to Z, then trainee id | The measurement trainee list is already email order; the id keeps equal emails stable | Plan |
| Page size | Separate cookie, default 10 | Choosing 5 on Unlink must not change the journal | Plan |
| Profile contents | Heading and buttons | The header already shows the email | Plan |
| Missing role | Header stays Profile | MS-24 names only the two role labels | Plan |
| Delete path | Security-definer function, no delete grant | Link creation already uses that pattern, and measurement access follows the row | Research |

## Scope

**In scope:**

- `unlink_trainee` for the signed-in trainer's own row, plus a form-post route
- Profile button screen, Change password screen, and trainer unlink list in the current card
- Header labels Trainee profile and Trainer profile
- Pager and page sizes only on the unlink list

**Out of scope:**

- A confirm step, a shared journal page-size cookie, and the email repeated in the card
- Measurement-row edits, a delete grant, separate routes, kitchen sink, and new Playwright specs

## Architecture / Approach

The card reads `view`, `notice`, and `error` and renders one screen. Change password stays the current form. The unlink list loads the trainer's links, sorts them, and slices them with the existing page helpers. Each Unlink button posts to `/api/trainer-links/<traineeId>/unlink`, which calls the definer function and redirects back to the list. The card height lives on a theme token so the token check still passes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Unlink function | Definer delete, service, and form post | A delete that is wider than the caller's own link, or that touches measurements |
| 2. Shared profile card and role label | Button screen, password screen, header labels, one card height | The password form clips, or smoke's exact redirect URLs change |
| 3. Unlink list | Trainer list, separate page size, immediate unlink | The card grows with 15 rows, or the journal page size changes with it |

**Prerequisites:** S-04 and S-25 are done. Local Supabase for the migration and `npm run db:types`.
**Estimated effort:** About 2–3 sessions across 3 phases.

## Open Risks & Assumptions

- The height token has to fit Change password, including the password-changed notice, without making the button screen feel like an empty frame. The implementer checks both.
- A long email must wrap inside `max-w-sm` so the card width stays put.
- `migration-check` proves the measurement row survives the migration. Unlink behavior itself is the Phase 1 manual check.

## Success Criteria (Summary)

- A trainee and a trainer open Change password from a button in one fixed-size card, and the header names the role.
- A trainer unlinks a trainee from an email-sorted list paged 5, 10, or 15, and that choice does not change the journal page size.
- The link row goes away immediately, the trainee's measurements remain, and that trainer no longer sees them.
