# 10x Astro Starter

![](./public/template.png)

A modern, opinionated starter template for building fast, accessible web applications.

## Tech Stack

- [Astro](https://astro.build/) v7 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v6 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier
- `npm run smoke` - Smoke test the auth flow against a running server (`BASE_URL`, defaults to `http://localhost:4321`)

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

`public.profiles` stores `trainee` or `trainer`. Migrations under `supabase/migrations/` apply locally on `supabase start`. `public.measurements` holds a trainee's entries (owner-only RLS). `public.trainer_links` stores a trainer's link to a trainee, and a trainer can select that trainee's `measurements` rows. `npm run db:types` regenerates `src/db/database.types.ts` after a migration (local Supabase running).

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

Migrations reach the hosted project automatically: the Workers Builds build command is `npm run build:workers`, which runs `npx supabase db push --db-url "$SUPABASE_DB_URL"` on `main` only (see `scripts/workers-build.mjs`) before `npm run build`, so a failed migration stops the deploy. `SUPABASE_DB_URL` is the Session pooler connection string, stored as a Workers Builds secret. `npm run deploy` does not apply migrations; run `npx supabase db push` yourself when deploying manually.

### Email confirmation in local development

Local Supabase reads `enable_confirmations` under `[auth.email]` in `supabase/config.toml`. It is `false`, so signup returns a session and opens `/dashboard`; smoke and CI rely on that. To test the confirmation flow, set it to `true` and restart with `npx supabase stop && npx supabase start` (the running stack does not reload `config.toml`). Confirmation emails land in Mailpit at `http://127.0.0.1:54324` and link back to `http://localhost:4321`. Set it back to `false` and restart again before running smoke.

For a cloud project, the same switch is **Authentication → Email → Confirm email** in the Supabase dashboard. With it on, signup shows `/auth/confirm-email` and the first sign-in after confirming opens `/dashboard`.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | "Check your inbox" page, shown after signup when no session is returned |
| `/dashboard`          | Trainee journal (redirects to `/auth/signin` if unauthenticated)        |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/) with `@astrojs/cloudflare`. Do not use `wrangler pages deploy`.

Manual production deploy (Wrangler from this repo, not a global install):

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` runs `npm run build && wrangler deploy` and does not apply migrations.

Set runtime `SUPABASE_URL` and `SUPABASE_KEY` with `npx wrangler secret put` (interactive prompt) or in the Worker dashboard under **Settings → Variables and Secrets**. Those are runtime secrets, not build variables. `secret put` publishes a new Worker version immediately.

Auto-deploy on push to `main` is **Cloudflare Workers Builds**, not a GitHub Actions deploy job. In the Worker dashboard: **Settings → Builds → Connect**, production branch `main`, build command `npm run build:workers`, deploy command `npx wrangler deploy`. Leave non-production branch builds off. Workers Builds creates its own API token; `CLOUDFLARE_API_TOKEN` is not required in GitHub.

## Smoke test

`scripts/smoke.mjs` is a dependency-free Node script that walks the whole auth flow (sign-up, sign-in, protected page, sign-out) over HTTP. Run it against the dev server or the production preview after dependency upgrades:

```bash
npm run dev            # or: npm run build && npm run preview
BASE_URL=http://localhost:4321 npm run smoke
```

It needs a reachable Supabase instance (local or cloud) with email confirmation disabled.

> **Note:** this script exists primarily to guard the development of the starter itself — it is a fast sanity check that dependency upgrades did not break the build, the Cloudflare adapter or the Supabase auth flow. It is **not** a substitute for a real test suite. Once you build your own product on top of this starter, add proper tests (unit, integration, end-to-end) suited to your application.

## CI

GitHub Actions is a quality gate only. It does not deploy. On every push and PR to `main`:

- **ci** — lint, `npm run check:home-tokens`, `npx astro check`, `npm test`, and `npm run build`. Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets for the build step.
- **smoke** — starts a local Supabase via the Supabase CLI, builds, serves the production preview on the Cloudflare runtime and runs `npm run smoke` against it. No repository secrets.
- **e2e** — starts the same local Supabase, creates a throwaway trainee, and runs `npx playwright test`. Playwright builds and serves the preview. The HTML report is uploaded as the `playwright-report` artifact. No repository secrets.

Production deploys run in Cloudflare Workers Builds when `main` is pushed.

## License

MIT
