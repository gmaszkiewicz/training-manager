# Rules for AI

This file provides guidance to AI Agent when working with code in this repository.

## Commands

- `npm run dev` — start dev server (Cloudflare workerd runtime)
- `npm run build` — production build (SSR via `@astrojs/cloudflare`)
- `npm run preview` — preview production build
- `npm run lint` — ESLint with type-checked rules
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier (includes prettier-plugin-astro + prettier-plugin-tailwindcss)
- `npm run smoke` — dependency-free auth-flow smoke test (`scripts/smoke.mjs`) against a running server, `BASE_URL` env (default `http://localhost:4321`). Run after dependency upgrades; CI runs it against the production preview with a local Supabase.

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Architecture

**Astro 7 SSR app** with React 19 islands, Tailwind 4, Supabase auth, and shadcn/ui components. Deployed to Cloudflare Workers.

### Rendering mode

Full server-side rendering (`output: "server"` in astro.config.mjs). All pages are server-rendered by default. API routes must export `const prerender = false`.

### Auth flow

- `src/lib/supabase.ts` — creates a Supabase SSR client using `@supabase/ssr` with cookie-based sessions. Uses `astro:env/server` for `SUPABASE_URL` and `SUPABASE_KEY` (server-only secrets declared in astro.config.mjs `env.schema`).
- `src/middleware.ts` — runs on every request, resolves the current user, attaches to `context.locals.user`. Redirects unauthenticated users away from routes listed in `PROTECTED_ROUTES`.
- API endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`
- Protected page example: `src/pages/measurements.astro`

### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Astro components** for static content/layout; **React components** only when interactivity is needed.
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names. Do not concatenate class strings manually.
- **shadcn/ui**: components live in `src/components/ui/`, "new-york" style variant. Install new ones with `npx shadcn@latest add [name]`.
- **API routes**: use uppercase `GET`, `POST` exports; validate input with zod.
- **Supabase migrations**: `supabase/migrations/` using naming format `YYYYMMDDHHmmss_short_description.sql`. Always enable RLS on new tables with granular per-operation, per-role policies.
- **React**: no Next.js directives ("use client" etc.). Extract hooks to `src/components/hooks/`.
- **Services/helpers** go in `src/lib/` (or `src/lib/services/` for extracted business logic).
- **Shared types** (entities, DTOs) go in `src/types.ts`.

### UI

- Design tokens live in `src/styles/global.css`.
- Shared UI components live in `src/components/ui`. Check that directory before creating a component; add a missing one with `npx shadcn@latest add [name]`.
- Do not use literal colours or arbitrary values in views — use role tokens and shared components.
- Greeting copy lives in `src/lib/topbar.ts`: a guest reads "Hello, guest"; a signed-in trainee or trainer reads "Hello," and their email, with no role word. The measurements screen and its redirects live at `/measurements`.
- Home kitchen sink: `/kitchen-sink/home`.
- Auth kitchen sink: `/kitchen-sink/auth`.
- Journal kitchen sink: `/kitchen-sink/journal`.
- Trainer kitchen sink: `/kitchen-sink/trainer`.

### Environment

- Node.js v22.14.0 (see `.nvmrc`)
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY` (copy `.env.example` to `.env` for Node, or `.dev.vars` for Cloudflare local dev)
- Local Supabase: `npx supabase start` (requires Docker)
- Cloudflare local dev: secrets go in `.dev.vars` (gitignored)
- Deploy: `npm run deploy` (`npm run build && wrangler deploy`). Requires `npx wrangler login`. Do not use `wrangler pages deploy`.
- Auto-deploy: Cloudflare Workers Builds on push to `main` (build `npm run build:workers`, deploy `npx wrangler deploy`). `scripts/workers-build.mjs` runs `supabase db push` only when `WORKERS_CI_BRANCH` is `main`, then `npm run build`. GitHub Actions does not deploy. `SUPABASE_DB_URL` is a Workers Builds secret. `npm run deploy` does not apply migrations.
- Migrations must be backward compatible: they reach hosted Supabase before the new Worker, so the previous Worker briefly runs on the new schema. Add first, drop in a later release.

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint + build + smoke on every push and PR to main. It is a quality gate only. Requires `SUPABASE_URL` and `SUPABASE_KEY` repository secrets for the build step. Production promotion is Workers Builds.
