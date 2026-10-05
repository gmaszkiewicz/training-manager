# End-to-end test configuration Implementation Plan

## Overview

A maintainer can run Playwright against an Astro production build preview, and one seed proves a signed-out visit to the journal is sent to sign-in. The files already landed in `d4fa658` on `cursor/playwright-e2e-setup`. This plan locks that contract so later browser tests copy it.

## Current State Analysis

S-19 (issue [#61](https://github.com/gmaszkiewicz/training-manager/issues/61)) asks for a browser-level runner and one signed-out gate. Measurement comparison, ownership, and illegal dates already have cheaper checks in the archived test rollout.

Commit `d4fa658` adds `@playwright/test`, `playwright.config.ts`, `tests/e2e/auth.setup.ts`, `tests/e2e/seed.spec.ts`, the `## E2E` section of `context/foundation/test-stack.md`, Playwright ignore rules, empty `E2E_USERNAME` / `E2E_PASSWORD` names in `.env.example`, and the `playwright-cli` skill under `.cursor/skills/` and `.agents/skills/`. Vitest includes only `src/**/*.test.ts` (`vitest.config.ts:11`). GitHub Actions does not run Playwright.

The journal route is `/measurements`. `PROTECTED_ROUTES` is that path, and a request with no user is redirected to `/auth/signin` (`src/middleware.ts:4`, `src/middleware.ts:18-20`).

## Desired End State

A maintainer, with local Supabase running and `E2E_USERNAME` / `E2E_PASSWORD` set in the gitignored `.env` for a local user, can run `npx playwright test`. Playwright builds the app and serves `astro preview` on port 4321 (or `E2E_PORT`). The seed opens `/measurements` with an empty session and finds `/auth/signin` and the Sign in heading. The setup project has signed in once and written `playwright/.auth/user.json` for later specs. `context/foundation/test-stack.md` records those commands.

### Key Discoveries:

- Preview port 4321 is Astro's documented default. `astro.config.mjs` sets no `server.port`, and the `preview` script passes no `--port` (`playwright.config.ts:8-11`).
- Astro 7 leaves the preview process as a background daemon unless `webServer.env` sets `ASTRO_PREVIEW_BACKGROUND` to `1` (`playwright.config.ts:34-40`).
- Outside CI, `reuseExistingServer` is true, so a process already listening on the port is the app under test (`playwright.config.ts:38`).
- The Chromium project depends on the setup project (`playwright.config.ts:25-31`). The seed clears that session (`tests/e2e/seed.spec.ts:4-9`) and still requires a successful sign-in first.
- The sign-in form is a React island. `tests/e2e/auth.setup.ts:13-23` clears and refills Email and Password until submit leaves `/auth/signin`.

## What We're NOT Doing

- A Playwright job in GitHub Actions.
- An npm script wrapping `npx playwright test`.
- Further browser specs. Measurement delta, ownership, and illegal dates stay on their existing unit, integration, and smoke checks.
- A change to the middleware redirect, the journal route, or sign-in copy.
- Creating a user on hosted Supabase, or committing `.env` or `playwright/.auth/`.
- Rewriting the installed `playwright-cli` skill files.

## Implementation Approach

Keep the runner in `d4fa658`. Where a file already matches the contract below, leave it byte-identical. Add or restore only a missing piece. Phase 1 locks the runner, the saved-session setup, ignore rules, env names, the test-stack record, and the agent CLI. Phase 2 locks the signed-out seed and proves it with a cold run. That run also signs in, because Chromium depends on the setup project.

## Critical Implementation Details

### Timing & lifecycle

`webServer` must set `ASTRO_PREVIEW_BACKGROUND` to `1` or Astro 7 detaches preview and Playwright loses the process. The phase 2 run starts only when nothing is listening on the preview port. With `reuseExistingServer` true outside CI, a leftover `astro dev` or preview on 4321 is tested as-is, including a stale build.

### State sequencing

The signed-out seed runs in the Chromium project, which depends on setup. A green seed therefore needs `E2E_USERNAME` and `E2E_PASSWORD` and a completed sign-in, then an empty `storageState` for the test itself. Removing the fill retry in `tests/e2e/auth.setup.ts` drops keystrokes typed before the sign-in island hydrates.

## Phase 1: Runner contract

### Overview

The dependency, config, saved-session setup, ignore rules, env names, test-stack record, and `playwright-cli` skill match the contract. Vitest continues to ignore this directory.

### Changes Required:

#### 1. Playwright dependency

**File**: `package.json`

**Intent**: Keep `@playwright/test` as a dev dependency so `npx playwright test` resolves. The lockfile stays in sync with that dependency.

**Contract**: `devDependencies["@playwright/test"]` is `^1.63.0`. No `scripts` entry is added for Playwright.

#### 2. Runner config

**File**: `playwright.config.ts`

**Intent**: Playwright builds, then previews on the detected port, saves failure traces, and signs in once before Chromium specs.

**Contract**: Load `.env` with `process.loadEnvFile` when the file exists. `PORT` is `Number(process.env.E2E_PORT ?? 4321)` and `baseURL` is `http://localhost:${PORT}`. `testDir` is `./tests/e2e`. `forbidOnly` is on when `CI` is set. `retries` is 2 when `CI` is set, otherwise 0. `workers` is 1 when `CI` is set. `use.baseURL` is `baseURL`, `trace` is `on-first-retry`, `screenshot` is `only-on-failure`. Projects: `setup` matches `/.*\.setup\.ts/`; `chromium` uses Desktop Chrome, `storageState` `playwright/.auth/user.json`, and `dependencies: ["setup"]`. `webServer.command` is ``npm run build && npm run preview -- --port ${PORT}``, `url` is `baseURL`, `reuseExistingServer` is `!process.env.CI`, `timeout` is `180_000`, and `env` is `{ ASTRO_PREVIEW_BACKGROUND: "1" }`.

#### 3. Saved-session setup

**File**: `tests/e2e/auth.setup.ts`

**Intent**: One UI sign-in writes the session file later specs reuse. The signed-out seed opts out of that file in Phase 2.

**Contract**: Read `E2E_USERNAME` and `E2E_PASSWORD`. Throw if either is missing. Open `/auth/signin`. Fill the accessible names `Email` and `Password` (exact) and click the button `Sign in`, clearing both fields before each fill, and repeat until the URL pathname no longer starts with `/auth/signin`. Expect a button named `Sign out`. Write `playwright/.auth/user.json`.

#### 4. Ignore rules and env names

**File**: `.gitignore`

**Intent**: Auth state, reports, and CLI logs can contain credentials, so Git ignores them.

**Contract**: The ignore list includes `playwright/.auth/`, `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`, and `.playwright-cli/`. `.env` stays ignored.

**File**: `.env.example`

**Intent**: A maintainer sees the two credential names without any secret value.

**Contract**: The file contains the lines `E2E_USERNAME=` and `E2E_PASSWORD=` and no filled-in passwords.

#### 5. Test-stack record and agent CLI

**File**: `context/foundation/test-stack.md`

**Intent**: Later E2E work reads one record of how to run this runner.

**Contract**: The `## E2E` section records: runner Playwright Test `@playwright/test` 1.63.x; config `playwright.config.ts`; single-spec command `npx playwright test tests/e2e/seed.spec.ts`; full-suite command `npx playwright test`; base URL `http://localhost:4321`; port 4321 from Astro's preview default, override `E2E_PORT`; web server command `npm run build && npm run preview -- --port $PORT` with `reuseExistingServer` outside CI; auth setup `tests/e2e/auth.setup.ts` using `E2E_USERNAME` / `E2E_PASSWORD` from `.env`; storage state `playwright/.auth/user.json` (gitignored); seed `tests/e2e/seed.spec.ts` for auth-gate-redirect; browser CLI `playwright-cli` at `.cursor/skills/playwright-cli/SKILL.md`.

**File**: `.cursor/skills/playwright-cli/SKILL.md`

**Intent**: The agent can drive the same browser the tests use.

**Contract**: The skill file exists. The copy at `.agents/skills/playwright-cli/SKILL.md` exists. Leave both trees unchanged when they are already installed.

#### 6. Unit-runner boundary

**File**: `vitest.config.ts`

**Intent**: `npm test` keeps collecting unit tests only.

**Contract**: `test.include` remains `["src/**/*.test.ts"]`.

### Success Criteria:

#### Automated Verification:

- `@playwright/test` is installed (`npm ls @playwright/test --depth=0`)
- Config and auth setup lint (`npx eslint playwright.config.ts tests/e2e/auth.setup.ts`)
- Git ignore covers Playwright auth state, results, reports, and CLI logs (`git check-ignore -q playwright/.auth/user.json test-results/x playwright-report/x .playwright-cli/x`)
- `.env.example` lists `E2E_USERNAME=` and `E2E_PASSWORD=`
- `context/foundation/test-stack.md` records the E2E runner, commands, port 4321, preview web server, auth setup, storage state, seed, and browser CLI
- Vitest includes only `src/**/*.test.ts`, and `npm test` passes

#### Manual Verification:

- Local `.env` credentials target the local Supabase stack, and `.env` and `playwright/.auth/` stay untracked

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Signed-out journal gate

### Overview

The seed is the only browser spec. A cold run proves a signed-out visit to `/measurements` lands on sign-in, and that the setup project can still sign in.

### Changes Required:

#### 1. Signed-out seed

**File**: `tests/e2e/seed.spec.ts`

**Intent**: Lock the slice outcome: a signed-out visit to the journal is sent to sign-in. Later specs copy this file's shape.

**Contract**: A provenance comment names `auth-gate-redirect`. `test.use` sets `storageState` to `{ cookies: [], origins: [] }`. The test opens `/measurements`, expects the URL to match `/auth/signin` with an optional trailing slash, and expects a heading named `Sign in`. It creates no data, so it has no cleanup.

### Success Criteria:

#### Automated Verification:

- The seed opts out of the saved session, opens `/measurements`, and expects `/auth/signin` plus the Sign in heading
- With nothing listening on the preview port, `npx playwright test tests/e2e/seed.spec.ts` exits 0

#### Manual Verification:

- A signed-out visit to `/measurements` in a browser shows the Sign in page

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit tests. `npm test` stays green and its include glob stays `src/**/*.test.ts`.

### Integration Tests:

- The seed is the browser check. It fails if `/measurements` stays on the journal, or if the Sign in heading is absent.
- The same command fails if setup cannot sign in, because Chromium depends on that project.

### Manual Testing Steps:

1. Confirm `.env` points at local Supabase and names a local user. Confirm `git status` does not track `.env` or `playwright/.auth/`.
2. Stop anything listening on port 4321 (or `E2E_PORT`). Start local Supabase.
3. Run `npx playwright test tests/e2e/seed.spec.ts` and confirm it passes.
4. Open `/measurements` in a browser with no session and confirm the Sign in page.

## Performance Considerations

`webServer` runs a full production build before preview and allows 180 seconds. A cold seed run pays that cost once. Reusing a server already on the port skips the build.

## Migration Notes

No schema change and no hosted data change. The test user exists only on the local Supabase stack. Credential values live only in the gitignored `.env`.

## References

- Slice: `context/foundation/roadmap.md` S-19, issue [#61](https://github.com/gmaszkiewicz/training-manager/issues/61), PRD ref MS-12
- Runner record: `context/foundation/test-stack.md`
- Journal gate: `src/middleware.ts:4`, `src/middleware.ts:18-20`
- Existing implementation: commit `d4fa658` on `cursor/playwright-e2e-setup`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Runner contract

#### Automated

- [x] 1.1 `@playwright/test` is installed (`npm ls @playwright/test --depth=0`) — d1e2638
- [x] 1.2 Config and auth setup lint (`npx eslint playwright.config.ts tests/e2e/auth.setup.ts`) — d1e2638
- [x] 1.3 Git ignore covers Playwright auth state, results, reports, and CLI logs (`git check-ignore -q playwright/.auth/user.json test-results/x playwright-report/x .playwright-cli/x`) — d1e2638
- [x] 1.4 `.env.example` lists `E2E_USERNAME=` and `E2E_PASSWORD=` — d1e2638
- [x] 1.5 `context/foundation/test-stack.md` records the E2E runner, commands, port 4321, preview web server, auth setup, storage state, seed, and browser CLI — d1e2638
- [x] 1.6 Vitest includes only `src/**/*.test.ts`, and `npm test` passes — d1e2638

#### Manual

- [x] 1.7 Local `.env` credentials target the local Supabase stack, and `.env` and `playwright/.auth/` stay untracked — d1e2638

### Phase 2: Signed-out journal gate

#### Automated

- [x] 2.1 The seed opts out of the saved session, opens `/measurements`, and expects `/auth/signin` plus the Sign in heading
- [x] 2.2 With nothing listening on the preview port, `npx playwright test tests/e2e/seed.spec.ts` exits 0

#### Manual

- [x] 2.3 A signed-out visit to `/measurements` in a browser shows the Sign in page
