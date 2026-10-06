# End-to-end test configuration — Plan Brief

> Full plan: `context/changes/e2e-setup/plan.md`

## What & Why

A maintainer needs to run browser-level tests against a production-like preview. This slice stands up that runner and one gate: a signed-out visit to the journal is sent to sign-in. Measurement risks already have cheaper checks, so they stay off the browser suite.

## Starting Point

Commit `d4fa658` on `cursor/playwright-e2e-setup` already adds Playwright, a build-plus-preview config on port 4321, a one-time sign-in that saves `playwright/.auth/user.json`, and a seed that opens `/measurements` with an empty session. The journal route is `/measurements`, and `src/middleware.ts` redirects a signed-out request there to `/auth/signin`. Vitest collects only `src/**/*.test.ts`. CI does not run Playwright.

## Desired End State

A maintainer with local Supabase and local `E2E_USERNAME` / `E2E_PASSWORD` runs `npx playwright test`. Playwright builds the app, serves the preview, signs in once, and the seed finds the Sign in page. `context/foundation/test-stack.md` records the commands later browser tests will use.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Slice scope | Local runner plus one signed-out gate | S-19 asks a maintainer to run browser tests against a preview, and names only the journal redirect | Roadmap |
| Seed | `/measurements` with an empty session expects `/auth/signin` and the Sign in heading | That is the built journal gate in `src/middleware.ts` | Roadmap |
| Server | `npm run build && npm run preview` on port 4321, override `E2E_PORT` | The slice asks for a production-like preview, and 4321 is Astro's preview default | Plan |
| Session | Setup project saves `playwright/.auth/user.json`; the seed opts out | Later specs reuse one sign-in, while this gate must be signed out | Plan |
| Interview | No further questions after the complexity check | The slice text and `d4fa658` already fixed the runner, port, and seed | Plan |
| Phases | Runner contract, then the signed-out seed | Config can be checked before the cold browser run | Plan |

## Scope

**In scope:**

- `@playwright/test`, `playwright.config.ts`, `tests/e2e/auth.setup.ts`, `tests/e2e/seed.spec.ts`
- Git ignore rules, empty `E2E_*` names in `.env.example`, the `## E2E` record, and the installed `playwright-cli` skill
- A cold run of the seed

**Out of scope:**

- A CI job, an npm script, and any browser spec beyond the seed
- Middleware, journal route, or sign-in copy changes
- Hosted Supabase users, or committing `.env` or `playwright/.auth/`

## Architecture / Approach

Playwright's `webServer` builds and previews the Astro app. The setup project signs in through the real form and writes a gitignored session file. Chromium specs depend on that project. The seed clears the session, requests `/measurements`, and expects the sign-in page. Files that already match this contract stay as they are.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Runner contract | Config, saved session, ignore rules, env names, test-stack record | A server already on 4321 is reused and hides a stale build |
| 2. Signed-out journal gate | Seed proven by a cold `npx playwright test tests/e2e/seed.spec.ts` | The run still signs in first, so missing local credentials fail the signed-out spec |

**Prerequisites:** Local Supabase running, and `E2E_USERNAME` / `E2E_PASSWORD` in gitignored `.env` for a user on that stack. Nothing else listening on the preview port for the cold run.
**Estimated effort:** Under one session. The files exist; the cold run includes one production build.

## Open Risks & Assumptions

- This planning pass did not re-run the seed. Phase 2 still has to pass on a free preview port.
- `ASTRO_PREVIEW_BACKGROUND=1` must stay on `webServer.env`. Astro 7 otherwise detaches preview.
- The fill retry in `tests/e2e/auth.setup.ts` must stay. The sign-in island drops input typed before hydration.

## Success Criteria (Summary)

- `npx playwright test` builds and previews the app, and the seed passes from a cold port.
- A signed-out visit to `/measurements` shows the Sign in page.
- Auth state and `.env` stay untracked, and `context/foundation/test-stack.md` records the runner.
