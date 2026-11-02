# Find Trainee by First and Last Name — Plan Brief

> Full plan: `context/changes/find-tranne-by-first-and-lastname/plan.md`

## What & Why

Trainers can only find a trainee by email today, although the Find trainee placeholder already promises first and last name. This change adds name search. Trainees are shown the way Hub → Collaborations shows them, but with the full first name. Tile headings stop repeating the trainee's name, and the Request for checkboxes move to two columns (roadmap S-50, MS-41).

## Starting Point

- **Search.** An RPC (`search_unlinked_trainee_emails`) returns up to 10 unlinked trainee emails, matched as one substring and ordered by email. The dialog lists bare emails.
- **Choose trainee.** It shows only emails, sorted by email.
- **Headings.** They read "Measurements for A. Lovelace (ada@example.com)", and likewise for Weekly and Top progression.

## Desired End State

- **Search.** A trainer types "ada love", "lovelace ada" or "lukasz zolty" and sees up to 10 matches. Each reads "Ada Lovelace" over "ada@example.com", in last-name order. Choosing one fills in the email.
- **Choose trainee.** Same rows and order. Its note names the chosen trainee even when the tile is collapsed.
- **Headings.** They read "Measurements", "Weekly progression" and "Top progression".

## Key Decisions Made

| Decision                  | Choice                                                            | Why (1 sentence)                                                        |
| ------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Multi-word query          | Every word must be a substring of first name, last name or email  | "ada love" and "love ada" both find Ada Lovelace and still narrow.      |
| Diacritics                | Ignored (Postgres `unaccent`), case ignored                       | Polish names are found from any keyboard.                               |
| Order (search and picker) | Last name, first name, email; nameless trainees last              | Rows now lead with names; the picker arrows follow the same order.      |
| Row layout                | Two lines like Collaborations: bold full name over muted email    | The look the notes ask for; long emails stay readable on a phone.       |
| Typed name submitted      | Not sent; field invalid + toast "Choose a trainee from the list"  | No request reaches the wrong person; errors stay toasts (lessons.md).   |
| Field after choosing      | The chosen email                                                  | The visible text is exactly what gets sent.                             |
| Collapsed picker          | Note names the trainee ("Ada Lovelace · ada@example.com")         | Something on screen still says whose data shows, without names in headings. |
| List tile title           | "Measurements" (heading and Settings label)                       | Matches the chart titles; no dangling "for".                            |
| Collaborations column     | Unchanged ("A. Lovelace")                                         | The notes name the full first name as a difference, not a change there. |

## Scope

**In scope:**
- An additive migration (`unaccent`, a fold helper, `search_unlinked_trainees` returning names), plus the service and GET API returning `{ trainees }`
- A shared full-name helper and comparator, and a two-line `TraineeRowLabel` used by the dialog and the picker
- The no-"@" submit guard, and two-column Request for
- Name order in the picker, the note naming the trainee, headings without names, and "Measurements" as the label
- Unit, E2E and kitchen-sink updates

**Out of scope:**
- Dropping the old email-only RPC (a later release)
- Changing the Collaborations column, fuzzy search, or a server-side name check on POST
- The trainee's own headings

## Architecture / Approach

The work runs bottom-up:

1. A new security-definer RPC, with the same trainer, trainee-only and not-linked rules, folds the query and the names through an immutable `unaccent` wrapper. Every word must match, and results come back in name order, at most 10.
2. `GET /api/trainer-links` returns `TraineeMatch[]`.
3. One `traineeName` helper, one `compareTrainees` comparator and one `TraineeRowLabel` component feed the dialog rows, the picker rows and order, and the picker note.

## Phases at a Glance

| Phase                          | What it delivers                                                  | Key risk                                                                   |
| ------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1. Name search backend         | Additive RPC + API returning names                                | `unaccent` under `search_path = ''` needs the qualified, immutable wrapper |
| 2. Find trainee dialog         | Two-line matches, choose fills email, no-"@" guard, two columns   | E2E lookups tied to the old "Email" accessible name                        |
| 3. Choose trainee and headings | Two-line picker in name order, note names trainee, plain headings | Missed `subjectLabel`/"Measurements for" references in tests and kitchen sink |

**Prerequisites:** S-49 done (Find trainee in the top bar). Local Supabase with Docker is needed for migration and E2E.
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- Name search lets a trainer see the names of unlinked trainees who match. This is inherent to the feature, and limited to trainees and to 10 rows, as email search is today.
- A cached old page that calls the new API gets no list until it reloads, because the client and API ship together.
- The search scans without an index, which is fine at the current user count.

## Success Criteria (Summary)

- A trainer finds a trainee by "first last" (in any order, without Polish letters) and reads each match as name over email.
- Choose trainee lists trainees the same way in name order, and its note names the chosen trainee when collapsed.
- No tile heading names the trainee, and Request for shows two columns.
