---
bootstrapped_at: 2026-09-19T14:18:47Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: training-manager
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: training-manager
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

Training Manager is a small, 3-week after-hours web app with email/password accounts, so the recommended JavaScript/TypeScript starter wins: Astro + React + TypeScript + Tailwind + Supabase + Cloudflare. Auth and Postgres come with the starter, which matches trainee/trainer sign-up and a per-user measurement journal; payments, realtime, AI, and background jobs are out of scope. Cloudflare Pages, GitHub Actions, and auto-deploy on merge are what the starter already assumes. Scaffolding is first-class rather than fully battle-tested, so expect mostly-smooth setup with occasional manual steps.

## Pre-scaffold verification

| Signal             | Value                              | Severity | Notes                              |
| ------------------ | ---------------------------------- | -------- | ---------------------------------- |
| npm package        | not run                            | n/a      | skipped: `cmd_template` starts with `git clone`, not an npm `create-*` CLI |
| GitHub repo        | not run                            | n/a      | `gh api repos/przeprogramowani/10x-astro-starter` failed: `gh` is not recognized as a command (GitHub CLI not on PATH) |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 22
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

Move log (top-level paths; directories moved as units when absent in cwd):

- MOVE dir: `.github`
- MOVE dir: `.husky`
- MOVE dir: `.vscode`
- MOVE dir: `node_modules`
- MOVE dir: `public`
- MOVE dir: `scripts`
- MOVE dir: `src`
- MOVE dir: `supabase`
- MOVE file: `.env.example`
- MOVE file: `.gitignore`
- MOVE file: `.nvmrc`
- MOVE file: `.prettierrc.json`
- MOVE file: `AGENTS.md`
- MOVE file: `astro.config.mjs`
- MOVE file: `CLAUDE.md`
- MOVE file: `components.json`
- MOVE file: `eslint.config.js`
- MOVE file: `package-lock.json`
- MOVE file: `package.json`
- MOVE file: `README.md`
- MOVE file: `tsconfig.json`
- MOVE file: `wrangler.jsonc`

Upstream `.git/` was deleted before move-up. `context/` in cwd was preserved (scaffold had no `context/` to drop).

CLI notes: `npm install` added 654 packages. Two `EBADENGINE` warnings: `astro-eslint-parser@3.1.0` and `eslint-plugin-astro@3.1.0` require Node `^22.22.3 || ^24.16.0 || >=26.3.0`; current runtime was `v24.14.0`.

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: not distinguished by this tool (`metadata.dependencies.direct` absent from npm audit v2 report). Totals: 0/0/0/0. Dependency counts: prod 377, dev 269, optional 167, total 804.

#### CRITICAL findings

none

#### HIGH findings

none

#### MODERATE findings

none

#### LOW / INFO findings

none

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                              |
| path_taken                 | standard                           |
| self_check_answers         | null                               |
| team_size                  | solo                               |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
