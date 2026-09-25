---
project: training-manager
researched_at: 2026-09-20
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 7 SSR + React 19
  runtime: Cloudflare workerd (Workers)
---

## Recommendation

**Deploy on Cloudflare Workers.**

Training Manager is already an Astro 7 SSR app on `@astrojs/cloudflare` 14.3 and Wrangler 4.13x: `astro dev` / `astro preview` run `workerd`, and production deploy is `wrangler deploy`. That stack scored Pass on all five agent-friendly criteria, matches the Cloudflare familiarity preference, and keeps Supabase as an external data layer (co-location was not required). The request/response journal does not need persistent processes, so container PaaS would add always-on cost and an adapter switch without buying a capability the MVP uses.

Do **not** deploy this adapter to Cloudflare Pages. `@astrojs/cloudflare` v14 removed Pages support; `tech-stack.md` still lists `cloudflare-pages` from the starter hint. The live path is Workers.

## Platform Comparison

Scored Pass / Partial / Fail against CLI-first ops, managed/serverless, agent-readable docs, stable deploy API, and MCP / first-class integration. Hard filters did not drop anyone: the app is stateless request/response, and every candidate can run TypeScript Astro SSR. Soft weights: cost vs DX was a wash; existing Cloudflare familiarity broke remaining ties; single-region users reduced the value of global edge; external Supabase reduced the value of co-located databases.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Vercel | Pass | Pass | Pass | Pass | Partial | 4 Pass / 1 Partial |
| Netlify | Partial | Pass | Pass | Partial | Pass | 3 Pass / 2 Partial |
| Railway | Partial | Pass | Pass | Partial | Pass | 3 Pass / 2 Partial |
| Render | Partial | Pass | Pass | Partial | Pass | 3 Pass / 2 Partial |
| Fly.io | Partial | Pass | Pass | Pass | Partial | 3 Pass / 2 Partial |

**Cloudflare Workers** — `wrangler deploy`, `wrangler rollback`, `wrangler tail`, and `wrangler secret put` cover the loop. Docs ship as `llms.txt` plus markdown on GitHub. MCP endpoints at `docs.mcp.cloudflare.com/mcp` and `mcp.cloudflare.com/mcp` are GA (checked 2026-09-20). Runtime is a managed isolate, not a VM. Python Workers remain **open beta**; unused here.

**Vercel** — `vercel deploy`, `vercel rollback`, and `vercel logs --follow` are GA. Docs are markdown + `llms.txt`. Official `@astrojs/vercel` would work, but this repo would have to drop the Cloudflare adapter. **Vercel MCP is public beta** (checked 2026-09-20). Hobby is non-commercial only; commercial use is Pro ($20/mo). WebSockets and Queues are **public beta**; unused.

**Netlify** — Official `@astrojs/netlify` and a GA MCP server. Rollback has **no dedicated CLI** (dashboard “Publish deploy” or `POST /sites/{id}/deploys/{id}/restore`). Credit-based Free plan (300 credits/month, hard cap). Lambda compatibility mode is **deprecated** (deploys rejected 2027-07-01).

**Railway** — Always-on Node containers via `@astrojs/node`. MCP at `mcp.railway.com` is documented as GA. Arbitrary rollback is **dashboard-only**; images retained 24h (Free) / 72h (Hobby). Free tier is serverless-only and can 502 on wake. Hobby floor is typically $5/mo of always-on compute this MVP does not need. Cloud agents / Slack-Discord integrations are **beta**.

**Render** — Web Service + `@astrojs/node`. Hosted MCP is GA. No CLI rollback (`POST /v1/services/{id}/rollback`; API rollbacks do **not** disable autodeploys). Free instances sleep after 15 minutes. Native object storage is **early access**. Astro’s own Render guide is static-site only.

**Fly.io** — Machines + Docker + `@astrojs/node`. `fly deploy` and `fly logs` are GA; rollback is “redeploy a previous image”, not a first-class command. New accounts get a 2 VM-hour / 7-day trial, then pay-as-you-go. `fly mcp` is **experimental**. Managed Postgres is **region-limited**. Tigris object storage is **beta**.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Won because the repo is already on the correct adapter and CLI, all five criteria Pass, and interview answers favored Cloudflare familiarity plus an external database. Switching would burn 3-week after-hours budget on an adapter rewrite. Workers Paid is $5/mo if the Free 10 ms CPU cap is too tight for auth middleware — cheaper than Vercel Pro and cheaper than always-on containers.

#### 2. Vercel

Strongest alternative if Cloudflare `workerd` / Node-compat becomes a blocker: full Node Functions, Fluid compute **GA**, official Astro adapter, complete CLI loop. Loses because MCP is still **public beta**, Hobby bans commercial use, Pro is $20/mo, and this codebase would abandon `@astrojs/cloudflare` and Wrangler.

#### 3. Netlify

Keeps a serverless request/response model and an official Astro adapter, with a GA MCP server. Loses because rollback is not CLI-first, credit pricing can pause the site on Free, and there is no existing familiarity or adapter in this repo.

## Anti-Bias Cross-Check: Cloudflare Workers

Risks reviewed and accepted (proceed with Cloudflare Workers).

### Devil's Advocate — Weaknesses

1. **`workerd` is not Node 22.** `nodejs_compat` is a subset plus polyfills. `@supabase/ssr` cookie handling and any CommonJS dependency can pass `astro check` and fail only on Workers.
2. **Free plan is 10 ms CPU per invocation.** Middleware that resolves a Supabase user on every request will often exceed that. Result is errors on Free or a quiet move to Workers Paid ($5/mo).
3. **Starter docs still say Pages.** `@astrojs/cloudflare` v14 deploys with `wrangler deploy` to Workers. `wrangler pages deploy` will fail.
4. **Environment is selected at build, not deploy.** With the Cloudflare Vite plugin, use `CLOUDFLARE_ENV=… npm run build && npx wrangler deploy`. `wrangler deploy --env` no longer picks the Astro environment. Easy to ship a Worker missing `SUPABASE_KEY`.
5. **Rollback restores Worker code, not Supabase.** `wrangler rollback` covers the last 100 Worker versions and prompts if secrets differ; it does not undo database migrations.

### Pre-Mortem — How This Could Fail

The team treated “deploy to Cloudflare Pages” as already done and spent week one on the journal. CI still ran `wrangler pages deploy`; the adapter refused Pages. They moved to Workers but left Pages-named GitHub secrets. Auth middleware plus a Supabase round-trip exceeded the 10 ms Free CPU cap: some requests returned 1101, others landed on Paid without anyone noticing. Cookie sessions worked on localhost `workerd` and broke on `*.workers.dev` (Secure / SameSite). Cloudflare Auto Minify mangled React island hydration. A CommonJS package only exploded in production. Rollback restored an old bundle that still expected the rotated `SUPABASE_KEY`. Six months in, the after-hours budget was still on Node-compat and env wiring, not trainee deltas.

### Unknown Unknowns

- With Astro 7 and `@astrojs/cloudflare` 14, `npm run dev` already uses `workerd` via the Cloudflare Vite plugin. A separate `wrangler dev` loop is redundant and can drift from Vite.
- This repo’s Worker entry is `main: "@astrojs/cloudflare/entrypoints/server"` in `wrangler.jsonc` — not `dist/_worker.js/index.js` from Cloudflare’s generic Astro guide.
- Preview URLs are public `*.workers.dev` hosts. **You cannot tail logs for Preview URLs** (`wrangler tail`, Workers Logs, Logpush) as of 2026-09-20. Protect them with Cloudflare Access if they hold real trainee data.
- Aliased branch previews need Wrangler ≥ 4.21.0 (this repo pins `^4.131.1`). Preview URLs cannot use a custom domain.
- Custom domains on Workers require Cloudflare nameservers.
- Auto Minify can break React hydration; disable it for this app.
- `wrangler secret put` creates a **new version and deploys it immediately**. For a non-prod version only, use `wrangler versions secret put`.

## Operational Story

- **Preview deploys**: Connect the GitHub repo to Workers Builds. Production branch runs `npm run build` then `npx wrangler deploy`. Enable “Builds for non-production branches”; the preview command is `npx wrangler versions upload` (after the same build). GitHub gets a commit preview URL and a stable branch alias on `*.workers.dev`. Those URLs are public — put Cloudflare Access in front if they talk to a shared Supabase. Fork PRs do not get previews unless the Cloudflare GitHub App is allowed to build them. Current `.github/workflows/ci.yml` only lints and builds; it does not deploy.
- **Secrets**: Production `SUPABASE_URL` and `SUPABASE_KEY` live as Wrangler secrets (`npx wrangler secret put SUPABASE_URL`, same for `SUPABASE_KEY`). Dashboard visibility is account-admin. Local copies go in gitignored `.dev.vars` (and `.env` for Node-side tooling). GitHub Actions already needs the same names as repository secrets for `npm run build`. Rotate by putting the new value, then confirm auth still works; do not commit values into `wrangler.jsonc`.
- **Rollback**: `npx wrangler versions list` then `npx wrangler rollback <VERSION_ID> --message "reason"` (omit the id to take the previous version). Applies immediately to all routes; last 100 versions only. Typical time-to-revert is seconds. Wrangler prompts if the target version has different secrets. **Supabase migrations do not roll back with the Worker.**
- **Approval**: A human must `wrangler login`, enable Workers Paid if CPU exceeds 10 ms, attach a custom domain (nameserver change), and rotate primary secrets. An agent may `npm run build`, `npx wrangler deploy`, `npx wrangler rollback --message …`, and `npx wrangler tail` once those humans steps exist. Do not let an agent run `wrangler secret put` unattended — it deploys immediately.
- **Logs**: Production: `npx wrangler tail` or `npx wrangler tail --status error --format json`. Dashboard Workers Logs (Free: 200k/day, 3-day retention; Paid: 20M/month included, 7-day). Cloudflare MCP (`https://mcp.cloudflare.com/mcp`) for structured observability. Preview URLs currently have **no** tail/logs.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| CommonJS / incomplete Node APIs fail only on `workerd` | Devil's advocate | M | H | Keep `compatibility_flags: ["nodejs_compat"]`; develop with `npm run dev` (already `workerd`); smoke-test auth after every dependency change |
| Auth middleware exceeds Free 10 ms CPU | Devil's advocate / Research finding | H | M | Budget Workers Paid ($5/mo); measure CPU in dashboard; avoid extra work in `src/middleware.ts` |
| CI or docs still target Cloudflare Pages | Devil's advocate / Pre-mortem | H | H | Deploy with `npx wrangler deploy` only; never `wrangler pages deploy`; treat `tech-stack.md` `cloudflare-pages` as stale |
| Build-time env mismatch ships a Worker without `SUPABASE_KEY` | Devil's advocate | M | H | Put secrets via Wrangler before first deploy; if using named envs, prefix the **build**: `CLOUDFLARE_ENV=production npm run build && npx wrangler deploy` |
| Worker rollback leaves a migrated Supabase schema | Devil's advocate | M | H | Expand/contract migrations; never assume `wrangler rollback` undoes SQL |
| Cookie sessions break on `*.workers.dev` vs custom domain | Pre-mortem | M | H | Test sign-in on the real hostname; set cookie `Secure`/`SameSite` for HTTPS; confirm email redirects use the production URL |
| Auto Minify breaks React island hydration | Pre-mortem / Unknown unknowns | M | M | Disable Auto Minify for this zone/Worker before first UI deploy |
| Preview URLs leak trainee data and cannot be tailed | Unknown unknowns | M | H | Cloudflare Access on preview hosts; do not point previews at production Supabase with real measurements |
| `wrangler secret put` silently deploys | Unknown unknowns | M | M | Use `wrangler versions secret put` when the secret must not go live; keep production puts as a human step |
| Generic Cloudflare Astro guide points `main` at `dist/_worker.js` | Unknown unknowns | L | M | Keep `wrangler.jsonc` `main` as `@astrojs/cloudflare/entrypoints/server` (adapter 14 + Astro 7) |

## Getting Started

Pinned in this repo: Astro `^7.3.2`, `@astrojs/cloudflare` `^14.3.1`, Wrangler `^4.131.1` (devDependency — do not install a second global copy). Local loop is `npm run dev` / `npm run preview`, not `wrangler dev`.

1. Log in with the project CLI: `npx wrangler login`. Rename `"name": "10x-astro-starter"` in `wrangler.jsonc` to `training-manager` before the first deploy so the `*.workers.dev` subdomain matches the product.
2. Put production secrets (interactive prompt, not argv): `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`. Locally copy `.env.example` into gitignored `.dev.vars` with the same keys (Cloudflare local) and `.env` if Node-side scripts need them.
3. Deploy: `npm run build && npx wrangler deploy`. Confirm the Worker URL, then run `npx wrangler tail` and sign in once. If invocations exceed 10 ms CPU, switch the account to Workers Paid ($5/mo).
4. Disable Auto Minify for this Worker/zone. If you attach a custom domain, use Cloudflare nameservers.
5. Optional Git loop: connect the repo in Workers Builds; production deploy command `npm run build && npx wrangler deploy`; non-production `npm run build && npx wrangler versions upload`. Protect preview URLs with Cloudflare Access.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
