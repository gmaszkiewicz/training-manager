# Reactive trainee search — Plan Brief

> Full plan: `context/changes/reactive-trainee-search/plan.md`
> Research: `context/changes/reactive-trainee-search/research.md`

## What & Why

A trainer typing in the trainee search on `/measurements` should see the trainee emails that contain that sequence, at most the first 10, and should not see trainees already linked to that trainer. `Find trainee by email` becomes the field placeholder. The current field only submits an exact email, and unlinked addresses are not readable under the current row policies.

## Starting Point

The trainer card heading is `Find trainee by email`. The email input posts to `/api/trainer-links` and has no placeholder and no client island. `link_trainee_by_email` can read one `auth.users` email from inside a security-definer function. `LinkedTraineeField` lists people this trainer has already linked.

## Desired End State

The card heading is `Measurements`. The placeholder is `Find trainee by email`. Typing `nn` lists unlinked trainee emails containing those characters, such as `anna@x.com` and `nn@x.com`, in alphabetical order of the normalized email, at most 10. ` Ann ` matches `ann@x.com`. An empty field and `zzzqqq` show nothing. Choosing a row fills the field, and `Link trainee` still submits the existing link.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Match | Literal substring of the normalized email | `nn` should find `anna@x.com` as well as `nn@x.com`, and `%` or `_` stays a character | Plan |
| First 10 | Alphabetical by the normalized email, capped inside the database function | A signed-in trainer can call the function directly, so that call has to stop at the same 10 | Plan |
| Empty field | No emails until the trimmed sequence has a character | An empty field would publish a directory of unlinked addresses | Plan |
| Case and surrounding spaces | `lower` and trim, same as the link function | ` Ann ` should find the address `ann@x.com` that the link would accept | Plan |
| Already linked | Hide only this trainer's links | A trainee linked only to trainer B can still be found and linked by trainer A | Plan |
| No matches | No rows and no new sentence | `zzzqqq` stays quiet, and `No trainee with that email` stays the failed-link message | Plan |
| Choosing a row | Write the email into the field | The trainer can read the address, and `Link trainee` remains the commit | Plan |
| Heading | `Measurements` | The finder words move to the placeholder, and `Body measurements` stays over the linked journal | Plan |

## Scope

**In scope:**

- A security-definer search function, a `GET /api/trainer-links?q=` JSON response, and an island on the existing email field
- Smoke coverage for signed-out access, case and surrounding spaces, and exclusion after the link

**Out of scope:**

- The linked-trainee control, its order, and the `Body measurements` heading
- Linking on click, a no-match sentence, and results for an empty field
- Hiding a trainee linked only to another trainer

## Architecture / Approach

The new function reads `auth.users` the way `link_trainee_by_email` already does, filters to trainee accounts, drops this trainer's links, orders the normalized email, and returns at most 10. The GET route uses the cookie session. The island fetches that JSON and fills the input that `Link trainee` already posts.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Search function | The capped email list from the database | A `LIKE` pattern would treat `%` and `_` as wildcards |
| 2. Search endpoint | JSON for the signed-in trainer, checked by smoke | The exclusion check has to run before smoke's existing link step |
| 3. Finder field | Heading, placeholder, and a list that fills the field | A late response can show emails for an earlier sequence |

**Prerequisites:** S-04 and S-13 are done. Local Supabase for the migration and smoke.
**Estimated effort:** ~2 sessions across 3 phases

## Open Risks & Assumptions

- Database alphabetical order can place a different address tenth than the linked list's `localeCompare` when the address contains `_`, `-`, or `@`
- Searchable accounts are `profiles.role = 'trainee'`, the same rule the link function uses
- A one-character query can match many rows; the response still contains at most 10, and this slice adds no index
- Smoke still finds `Find trainee by email` in the placeholder, so the heading change is a manual check

## Success Criteria (Summary)

- Typing a sequence shows at most 10 matching unlinked trainee emails, alphabetically by the normalized email
- ` Ann ` can match `ann@x.com`, an empty field shows nothing, and choosing a row fills the field
- The heading is `Measurements`, the placeholder is `Find trainee by email`, and `Link trainee` still links
