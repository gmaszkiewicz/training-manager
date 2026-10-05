<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Align contributor CI docs with the live pull-request gate

- **Plan**: context/changes/new-pr-ci-cd-workflow/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1
- **Date**: 2026-10-05
- **Verdict**: APPROVED
- **Findings**: 0 critical 0 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

None.

Phase 1 is the only phase. Its product diff is staged and uncommitted. Progress is 3/4: automated rows 1.1–1.3 are checked, and manual row 1.4 is still open. That open row was left unchecked.

Automated commands re-run on 2026-10-05:

- `git diff --exit-code -- .github/workflows/ci.yml` — exit 0
- `rg -n "check:home-tokens" CLAUDE.md README.md` — matched both files
- `rg -n "npm test" CLAUDE.md README.md` — matched both files

`CLAUDE.md` `## CI` names `.github/workflows/ci.yml`, `push` to `main`, `pull_request` targeting `main`, job `ci` (`npm run lint`, `npm run check:home-tokens`, `npx astro check`, `npm test`, `npm run build` with `SUPABASE_URL` and `SUPABASE_KEY`), and job `smoke` (local Supabase, production preview, `npm run smoke`, no GitHub secrets). It says Actions does not deploy and that production promotion is Cloudflare Workers Builds.

`README.md` `## CI` adds `npm run check:home-tokens` and `npm test` to the `ci` bullet and keeps the smoke bullet, the no-deploy sentence, and the Workers Builds sentence.

`.github/workflows/ci.yml` and `context/changes/deployment/deployment-plan.md` are unchanged. No heading outside `## CI` changed in either doc. `change.md` notes and title are unchanged.
