# Trainer panel UI — Plan Brief

> Full plan: `context/changes/trainer-panel-ui/plan.md`

## What & Why

A trainer who signs in still gets the starter glass card on `/dashboard`, while the trainee on the same route already uses the shared journal card. This change puts the trainer panel, and the unresolved-role fallback in that same shell, on the journal contract. Linking and the read-only preview stay as they are.

## Starting Point

`TraineeJournal` is the light `max-w-2xl` card: role tokens, `ServerError`, and an outline Sign out. The non-trainee branch in `src/pages/dashboard.astro` is still `bg-cosmic` plus glass inputs and buttons. `MeasurementList` is already on role tokens, so a preview currently shows the new list inside the old shell. `@utility bg-cosmic` has no other consumer. The token check does not scan this page.

## Desired End State

A trainer sees welcome, the email link form, trainee links, the measurement preview, and Sign out on the same light card as the journal. Zero linked trainees still shows the form and no new sentence. A role that is neither trainee nor trainer sees "Could not open your journal" and Sign out on that card. The cosmic utility is gone. `/kitchen-sink/trainer` shows the panel states, and the token check covers this view.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Unresolved role | Same light card, then remove `bg-cosmic` | That fallback shares the glass shell, and the utility has no other consumer | Plan |
| Zero linked trainees | No new sentence | The link form is the empty state; this slice does not add copy | Plan |
| Shell and controls | Journal card, `Input`, `Label`, `Button`, `ServerError` | S-09 already defined that contract and left this panel for S-10 | Research |
| Link form | Native POST, no pending control | Field names and redirects stay; disabled and loading are N/A | Plan |
| Measurement list | Keep shared `MeasurementList` | It already uses role tokens | Research |
| `Card` and token values | Do not add `Card`; do not edit `:root` or `.dark` | The journal shell is a `div`, and the roles already exist | Research |

## Scope

**In scope:**

- `TrainerPanel` for the trainer branch and the unresolved-role fallback
- Wiring it from `dashboard.astro` without changing server loads
- Removing `@utility bg-cosmic`
- `/kitchen-sink/trainer`, the token-check file list, and one `CLAUDE.md` sink line

**Out of scope:**

- An empty-list sentence, a client pending state, and any link or measurement behavior change
- `TraineeJournal`, `MeasurementList`, `Card`, dark mode, and token value edits

## Architecture / Approach

`dashboard.astro` still loads the profile, links, and preview. `role === "trainee"` keeps `TraineeJournal`. Every other role renders `TrainerPanel`, which copies the journal shell and posts the link form to `/api/trainer-links`, including the hidden trainee id. Phase 2 is the review surface and the guard, not a second visual pass.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Trainer panel | Light card on `/dashboard`, cosmic utility removed | A client form or a dropped hidden field would break link errors |
| 2. States and guard | `/kitchen-sink/trainer` and the token check | Sink copy that names a palette class would fail the check |

**Prerequisites:** S-04 (trainer can link and preview) and S-09 (journal contract) are done. `Input`, `Label`, `Button`, and `ServerError` already exist.
**Estimated effort:** About 1–2 sessions across 2 phases.

## Open Risks & Assumptions

- A real unresolved-role session is rare. The kitchen sink is how that card gets reviewed.
- `bg-cosmic` is removed in the same phase as the shell switch. Deleting the utility first would break the current page until the panel lands.
- The plan assumes `Input` keeps forwarding `name`, `type`, and `required`, which it does today.

## Success Criteria (Summary)

- A trainer sees the journal card instead of the glass card, with the same link and preview behavior, and no new empty-list sentence.
- The unresolved-role message sits on that same card, and `bg-cosmic` is gone.
- `/kitchen-sink/trainer` shows the real states, marks disabled and loading N/A, and `npm run check:home-tokens` covers the new view.
