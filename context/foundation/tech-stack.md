---
starter_id: 10x-astro-starter
package_manager: npm
project_name: training-manager
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

Training Manager is a small, 3-week after-hours web app with email/password accounts, so the recommended JavaScript/TypeScript starter wins: Astro + React + TypeScript + Tailwind + Supabase + Cloudflare. Auth and Postgres come with the starter, which matches trainee/trainer sign-up and a per-user measurement journal; payments, realtime, AI, and background jobs are out of scope. Cloudflare Workers (not Pages — `@astrojs/cloudflare` v14), GitHub Actions as a quality gate, and auto-deploy on merge via Workers Builds are the live path. The starter hint `cloudflare-pages` is stale. Scaffolding is first-class rather than fully battle-tested, so expect mostly-smooth setup with occasional manual steps.
