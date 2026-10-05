# Test stack

## E2E

<!-- Written by /10x-e2e-setup. Re-run it to change this section; other skills only read it. -->

- runner: Playwright Test, @playwright/test 1.63.0
- config: playwright.config.ts
- single-spec command: npx playwright test tests/e2e/seed.spec.ts
- full-suite command: npx playwright test
- base URL: http://localhost:4321
- port: 4321 (detected from Astro's documented preview default; detected default 4321, override with E2E_PORT)
- web server command: npm run build && npm run preview -- --port $PORT (PORT is E2E_PORT or 4321); reuseExistingServer outside CI
- auth setup project: setup (tests/e2e/auth.setup.ts), credentials from E2E_USERNAME / E2E_PASSWORD in .env
- storageState: playwright/.auth/user.json (gitignored)
- seed: tests/e2e/seed.spec.ts — protects auth-gate-redirect (a signed-out visit to the journal is sent to sign-in)
- browser CLI: playwright-cli, command skill at .cursor/skills/playwright-cli/SKILL.md
- updated: 2026-10-05
