# Measurement copy and the measurements route — Plan Brief

> Full plan: `context/changes/measurement-copy-polish/plan.md`

## What & Why

The measurements screen still opens at `/dashboard`, the greeting still names the role, and the list still hangs the unit and the previous-entry difference on the number. S-13 moves that screen to `/measurements` and makes the finder, the units, and the difference readable without changing stored values.

## Starting Point

`HEAD` protects `src/pages/dashboard.astro`. Guests read `Hello guest`; a trainee or trainer reads `Hello trainee` or `Hello trainer` plus their email. The nav label is already `Measurements` and points at `/dashboard`. Form labels already say `Weight kg`. The list still prints the unit on the value, and the delta sits beside that value. The date column is the same width as every measurement column.

## Desired End State

A guest reads `Hello, guest`. A signed-in trainee or trainer reads `Hello,` and their email. The screen, nav href, and post-sign-in redirects use `/measurements`. `/dashboard` is a 404. The trainer card says `Find trainee by email`, with no visible Email label, a full-width `Link trainee` button, and `Body measurements` above linked emails. The trainee card says `Add your next measurement`. Each unit sits beside its name, the value is bare, and the same arrow-and-number delta sits under the value in semibold. The date column is wider, and the calendar icon does not cover the day.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Greeting | `Hello, guest` and `Hello,` plus email | The slice drops the role word and adds the comma | Notes |
| Role null | Email only, greeting null | That signed-in state already has no role phrase | Code |
| Route | `/measurements`, and `/dashboard` 404s | S-13 says the old address no longer opens the screen | Roadmap |
| Nav label | Stays `Measurements` | Only the href was `/dashboard` | Code |
| Unavailable heading | `Measurements` | The visible `Dashboard` title moves with the route | Notes |
| Trainer headings | `Find trainee by email`, then `Body measurements` above links | The finder and the linked list are different jobs | Notes |
| Email label | No visible label; accessible name `Email` | The notes remove the label; the input still needs a name | Notes |
| Link width | `w-full` on the button, card stays `w-max` until measurements load | The notes match Add measurement's class, not the loaded row width | Notes |
| Units | `Weight kg` on the label; value bare | The unit is the existing string beside the name | Notes |
| Delta | Under the value, `font-semibold`, same `formatDelta` text | The notes ask for placement and weight, not a new calculation | Notes |
| Date column | `w-36` on form and list; loaded floor `calc(75rem+4px)` | The day must clear the icon, and the card floor is tied to column width | Notes |

## Scope

**In scope:**

- Route, redirects, greeting, document title, unavailable heading
- Trainer finder copy, accessible email name, full-width Link trainee
- Trainee heading, list units, delta placement, date column, card floor
- Smoke, token file list, `CLAUDE.md`, and the home, journal, and trainer kitchen sinks

**Out of scope:**

- A redirect from `/dashboard` to `/measurements`
- Stored measurements, delta math, link rules, and good/bad delta colors
- Widening the empty trainer card to the loaded measurement row
- Editing or deleting an entry

## Architecture / Approach

`topbarModel` owns the greeting and the Measurements href. The page file rename owns the route. `measurementFields` keeps supplying name and unit; the list stops appending the unit to the number. `formatDelta` stays the delta string; the list only moves that string under the value. The date column and the loaded card `min-w` move together so one entry still fits the card.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Measurements route and greeting | `/measurements`, role-free greeting, `/dashboard` 404 | A leftover redirect or smoke path still opens `/dashboard` |
| 2. Screen copy and field layout | Finder copy, units on labels, semibold delta, wider date | The card floor stays at 73rem and the wider date clips |

**Prerequisites:** S-11 and S-12 are done. Local smoke needs a running server and local Supabase, as `CLAUDE.md` describes.
**Estimated effort:** ~1 session across 2 phases. The working tree already matches these contracts, so implementation is a confirmation pass unless a check fails.

## Open Risks & Assumptions

- Bookmarks to `/dashboard` 404 after deploy. That is the S-13 risk, not a redirect to add later in this change.
- Native date inputs differ by browser. The manual check is that the day digits are visible, not only that a WebKit class is present.
- The 2rem floor increase assumes the date column moves from `w-28` to `w-36` and the eight measurement columns stay `w-28`.

## Success Criteria (Summary)

- Signed-in users land on `/measurements`, greet without a role name, and get a 404 from `/dashboard`.
- A trainer finds a trainee by email, and `Body measurements` heads the linked emails.
- A trainee reads each unit beside the field name, a bare value, a semibold difference under that value, and a date whose day is clear of the calendar icon.
