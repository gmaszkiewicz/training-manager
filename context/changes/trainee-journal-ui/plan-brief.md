# Trainee journal visual contract — Plan Brief

> Full plan: `context/changes/trainee-journal-ui/plan.md`
> Research: `context/changes/trainee-journal-ui/research.md`

## What & Why

A signed-in trainee still lands on the starter glass card. Sign-in and the public home already use the role tokens in `src/styles/global.css`. This change moves the trainee journal onto that same contract. The trainer branch on `/dashboard` stays on the glass shell until its own change.

## Starting Point

The trainee branch and the trainer branch share one `bg-cosmic` shell in `src/pages/dashboard.astro`. The measurement form already reads role tokens, including an inner light card that exists because that shell is dark. The list, the empty and load-failure sentences, date, note, and Sign out still use starter literals. The token check does not scan the page or the list.

## Desired End State

A trainee sees a light `max-w-2xl` card on the page background: journal heading, welcome line, form, empty sentence or list, and an outline Sign out. A failed load shows `ServerError` and hides the form. A trainer still sees the glass panel and a raw Sign out, with the restyled list inside it when they are previewing entries. `/kitchen-sink/journal` shows the seven states.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Trainee shell | Own file, `src/components/journal/TraineeJournal.astro`, sign-in role classes, width stays `max-w-2xl` | The page file keeps the trainer glass, so the token check can only guard a file that is fully clean | Plan |
| Token values | No edits to `global.css`; deposit the roles in `tokens.md` | The roles already exist; this view was not reading them | Research |
| Textarea | `npx shadcn@latest add textarea`; no `Card`; no `shadcn init` | Note has no shared control; sign-in keeps the panel as a `div` | Research |
| Sign out | Outline `Button` inside the trainee shell; trainer keeps the raw button | Add measurement stays the primary action, and the trainer shell must not change | Plan |
| List | Restyle `MeasurementList` in place | The journal renders it; a second list to spare the trainer preview was rejected | Research |
| Form panel | Remove the inner `bg-card` wrapper | That wrapper existed so fields stayed light on the glass page; the shell is now that surface | Plan |
| Load failure | Existing `ServerError`, form hidden | The sentence stays, and it stops using the same blue as the welcome line | Research |
| Loading | No new skeleton; the sink shows submit pending | The page renders after the server call and has no loading branch | Research |
| Deferred | Trainer glass, `bg-cosmic`, dark-mode toggle | The trainer shell still uses `bg-cosmic`, and no view sets `dark` | Research |

## Scope

**In scope:**

- `Textarea`, trainee shell component, list row tokens, date and note on `Input` / `Label` / `Textarea`
- Outline Sign out for the trainee only
- `/kitchen-sink/journal`, token-check entries, `CLAUDE.md` sink line

**Out of scope:**

- Trainer branch, unresolved-role glass, and that branch's raw Sign out
- Token value edits, removing `bg-cosmic`, a dark-mode toggle, `Card`
- Measurement data, validation, copy, and delta coloring
- Scanning `dashboard.astro` or the kitchen sink

## Architecture / Approach

`dashboard.astro` renders `TraineeJournal` for `role === "trainee"` and keeps the current glass wrapper for everyone else. The journal component owns the light shell, the form, the empty or list branch, the load-failure `ServerError`, and Sign out. `MeasurementList` stays the shared list. Phase order matches the auth visual change: library, token deposit, view, states.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Library | `Textarea` from the existing shadcn setup | The CLI may rewrite `global.css` |
| 2. Tokens | `tokens.md` naming the roles; values unchanged | A later phase invents a color instead of reading the list |
| 3. View | Trainee shell, list, date, note, Sign out | Leaving the form's inner card nests a card inside the shell |
| 4. States | `/kitchen-sink/journal`, token check, `CLAUDE.md` line | Adding `dashboard.astro` to the check fails CI on the trainer glass |

**Prerequisites:** S-02 and S-08 are done. The journal already renders with real measurements.
**Estimated effort:** about 2 sessions across 4 phases.

## Open Risks & Assumptions

- A trainer previewing entries sees the new list rows inside the old shell until the trainer visual change.
- Two Sign out controls exist after the split (trainee outline button, trainer raw button) and can drift.
- `shadcn add textarea` must not leave a second palette in `global.css`.

## Success Criteria (Summary)

- A trainee on `/dashboard` sees the light card, not the glass panel or the gradient heading.
- Empty, load failure, focus, and Sign out match the roles already used on sign-in.
- The token check fails if the journal component or the list grows a palette class, and the trainer glass on `dashboard.astro` still stays off that check.
