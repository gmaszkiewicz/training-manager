# Auth sign-in form — Plan Brief

> Full plan: `context/changes/auth-signin-form/plan.md`
> Research: `context/changes/auth-signin-form/research.md`

## What & Why

Sign-in, registration, and email confirmation still use the starter glass card, so a visitor who leaves the public home hits a different visual. This change makes those three screens read the same role tokens and shared components as the home. The dashboard shell stays on the cosmic card.

## Starting Point

Role tokens already live in `src/styles/global.css`, and the home already uses them. The auth shells, `FormField`, `ServerError`, `SubmitButton`, and the journal form's own date and note controls still use palette classes. `Button` exists. Input, Label, and Card do not. The journal form shares the auth fields and still renders inside the dark dashboard card.

## Desired End State

A person can sign in, register, and read the email confirmation on a light card with role-colored fields, errors, and a primary submit button. Focus uses the shared ring. The journal form is readable on its own light surface. The dashboard heading and measurement list stay on the dark shell.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Panel | Existing `div` with `bg-card`, `text-card-foreground`, and `border-border` | The home change already shipped that panel and did not add Card | Plan |
| Journal surface | Light `bg-card` island inside `MeasurementForm` | Shared fields move to light roles, and the dashboard shell stays cosmic | Plan |
| Token values | Reuse `src/styles/global.css` unchanged | The public home already reads these roles | Research |
| Confirm-email | Same shell as sign-in | It copies the glass card and has no fields | Research |
| Dashboard shell | Deferred | This slice must not restyle it | Research |
| Role radios | Native inputs with `accent-primary` | That removes the purple accent without a new component | Plan |
| Visual gate | `/kitchen-sink/auth` | The repo has no screenshot test, and the home used a sink | Research |
| Token check | Extend `scripts/check-home-tokens.mjs` | CI already runs `npm run check:home-tokens` | Plan |
| Field primitives | `npx shadcn@latest add` for Input and Label | `components.json` already points `ui` at `src/components/ui` | Research |

## Scope

**In scope:**

- Input and Label, used by `FormField`
- The three auth shells, shared field, server error, submit button, password toggle, signup hint, and role radios
- A light surface on the journal form, including its date, note, and field error
- Kitchen sink at `/kitchen-sink/auth` and the existing token check extended to the cleaned files

**Out of scope:**

- Editing `:root`, `.dark`, or `bg-cosmic`
- Card, radio-group, and `shadcn init`
- Dashboard shell, measurement list, and the public home
- Auth API, validation, redirects, and copy
- A new screenshot tool or a second lint dependency

## Architecture / Approach

The auth pages drop `bg-cosmic` and style the current `div` with card roles. `FormField` renders Input and Label. `SubmitButton` stops painting over Button. `MeasurementForm` wraps itself in `bg-card` so labels that are `text-muted-foreground` stay readable without changing `dashboard.astro`. One phase does the shells, the shared controls, and that island together. Splitting them would leave white text on the new light form, or dark labels on the cosmic card.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Library | Input and Label from shadcn | The CLI rewrites `global.css` |
| 2. Tokens | `tokens.md` listing the existing roles | A later phase invents a second palette |
| 3. View | Three auth shells, shared controls, journal light surface | Date and note stay white and disappear on the light card |
| 4. States | `/kitchen-sink/auth` and a wider token check | The sink quotes a palette class and gets added to the scan |

**Prerequisites:** The public home already uses these tokens. S-08 has no roadmap blocker. Adding Input and Label needs the shadcn CLI.
**Estimated effort:** About two sessions. Phases 1 and 2 are short. Phase 3 is the visual change. Phase 4 is the sink and the check.

## Open Risks & Assumptions

- The light journal form inside the dark dashboard card is an interim look until a later slice restyles that shell.
- `accent-purple-400` is outside the token-check regex, so Phase 3 has to remove it by name. The scan alone will not catch it.
- `Button` keeps shadcn's `ring-[3px]`. That file stays off the scan, and the views must not copy that arbitrary size.
- No view turns on `.dark`. This change does not add a theme toggle.

## Success Criteria (Summary)

- Sign-in, registration, and email confirmation show the home's light card, and an empty email still reports "Email is required".
- The journal form is readable on a light surface, and the dashboard heading and list stay on the dark shell.
- `/kitchen-sink/auth` shows the seven sign-in states, and `npm run check:home-tokens` fails if a palette class returns to the cleaned files.
