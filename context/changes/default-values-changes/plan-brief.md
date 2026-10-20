# Default values for the measurement accordion and entries per page — Plan Brief

> Full plan: `context/changes/default-values-changes/plan.md`

## What & Why

Opening `/measurements` should show the add form already open and five entries per page. That is S-33 / MS-25. A choice the account already saved still wins on the next visit.

## Starting Point

The branch already sets `defaultPageSize` to `5` and opens the add form when no preference is stored, including when the journal has entries. Before that, the unset size was 10 and the form opened only for an empty journal. Trainee and trainer lists share `preferredPageSize`. The trainer has no add form. The open rule is still an inline expression, so tests do not yet name “nothing stored opens the form” or “a saved closed form stays closed.”

## Desired End State

A first visit shows **Add your next measurement** expanded and five rows per page. A linked trainer sees those five rows and no add form. Choosing 10 or 15, or collapsing the form, is what the next visit shows. A server error still forces the form open.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Saved page size | Keep an explicit 5, 10, or 15 | The Entries per page control restores the account's choice; five is only the unset default |
| Collapsed add form | Stay collapsed | Closing the form and reloading leaves it closed; a server error still forces it open |
| Journal that already has entries | Form starts open when nothing is stored | The old rule opened the form only for an empty journal |
| Linked trainer | Same page-size default, no add form | The trainer screen is the read-only list and already uses `preferredPageSize` |

## Scope

**In scope:**

- Unset page size of five for the trainee and a linked trainer
- Add form open when no add-form preference is stored
- Unit tests for that open rule and for a restored 10 or 15
- Server error still forcing the form open

**Out of scope:**

- Clearing a saved 10 or 15
- Opening the form again after the trainee collapsed it
- An add form on the trainer panel
- Page-size options, month filter, page index, URL, or measurement data

## Architecture / Approach

`defaultPageSize` stays `5` in `src/lib/measurement-page.ts`. A new `addFormStartsOpen(hasServerError, preference)` sits beside `parseAddFormOpen`, and `TraineeJournal.astro` uses it for `<details open>`. Cookies and localStorage stay the saved-choice path. The trainer list keeps reading the same page-size cookie.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. First-visit defaults | Five rows and an open add form when nothing is stored | A test that still treats an empty journal as the reason the form opens |
| 2. Saved choices | A stored 10 or 15, and a stored closed form, survive reload | A change that treats every stored 10 as the old default and wipes it |

**Prerequisites:** S-23 (page-size control) and S-32 (remembered add form) are already done.
**Estimated effort:** One session across two small phases.

## Open Risks & Assumptions

- An explicit stored page size still overrides five. That is the accepted rule, not a reset.
- An add form that starts open can cover the list on a first visit.
- If the cookie and localStorage disagree, localStorage still wins after paint when restore is allowed. This plan does not change that.

## Success Criteria (Summary)

- A trainee with entries and no saved preference sees the add form open and five entries per page.
- A linked trainer with no saved page size sees five entries per page and no add form.
- After choosing 10 and collapsing the form, reload shows 10 and a collapsed form. A trainer who chose 15 still sees 15.
