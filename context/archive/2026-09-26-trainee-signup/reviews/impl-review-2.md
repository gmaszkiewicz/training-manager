<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Trainee signup Implementation Plan (re-review)

- **Plan**: context/changes/trainee-signup/plan.md
- **Scope**: Full plan, focused on changes since the first review (`impl-review.md`): e60c828, f1946a8, f997f45 as merged in `main` at 7b1cdcf
- **Reviewed phases**: 1, 2
- **Date**: 2026-09-27
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | WARNING |
| Scope Discipline    | PASS    |
| Safety & Quality    | PASS    |
| Architecture        | WARNING |
| Pattern Consistency | PASS    |
| Success Criteria    | WARNING |

## Automated verification (run 2026-09-27 on `main` 7b1cdcf)

| Command           | Result                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`    | PASS                                                                                                                                                                               |
| `npx astro check` | PASS: 0 errors, 0 warnings, 0 hints                                                                                                                                                |
| `npm run smoke`   | First run FAIL 3/8 (`Email not confirmed`): local auth container still had `GOTRUE_MAILER_AUTOCONFIRM=false` from the 2.5 test. After `supabase stop` + `supabase start`: PASS 8/8 |

Local DB: both migrations applied (`20260927065512`, `20260927100031`); `authenticated` holds only SELECT, INSERT on `public.profiles`, and `anon` holds nothing.

Delta since first review verified: `/auth/confirm-email` always renders "Check your email", and `signup.ts` is its only entry point. First-review fixes F1–F4, F6 and F7 are present. F5 is still deferred to S-02.

## Triage summary

- Fixed: F1, F2, F3, F4 (4)
- Open outside the repo: switch the Workers Builds build command to `npm run build:workers` (F1)

## Findings

### F1 — Hosted migration step exists only in the Cloudflare dashboard

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: CLAUDE.md:52, README.md:131
- **Detail**: Production schema changes now depend on a build command typed into Workers Builds settings. The repo documents a specific command (`supabase db push --db-url "$SUPABASE_DB_URL"` gated on `main`), but nothing versioned enforces it. The `main`-only gate, the secret name and the ordering can't be reviewed or changed in a PR, and the docs can drift from what Cloudflare actually runs. The docs weren't checked against the real dashboard value.
- **Fix**: Move the command into a versioned script (e.g. `scripts/workers-build.sh`, or `"build:workers"` in `package.json`), set the Workers Builds build command to `npm run build:workers`, and point the docs at the script.
- **Decision**: FIXED: added `scripts/workers-build.mjs` + `npm run build:workers` (refuses `main` without `SUPABASE_DB_URL`; non-main skips migrations); CLAUDE.md, README and plan Addenda updated. Cloudflare build command still has to be switched to `npm run build:workers` by hand.

### F2 — plan-brief still says push migrations before merging

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/trainee-signup/plan-brief.md:60
- **Detail**: "Nothing applies migrations to hosted Supabase. Run `npx supabase db push` before merging to `main`" contradicts the plan's Addenda, README and CLAUDE.md, which now say that Workers Builds applies migrations.
- **Fix**: Replace that line with a pointer to the automated Workers Builds step, or leave it and note in the plan's Addenda that the brief predates it.
- **Decision**: FIXED: plan-brief line now points at `npm run build:workers`

### F3 — Progress row 2.5 has no SHA suffix

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/trainee-signup/plan.md (Progress 2.5)
- **Detail**: 2.5 was checked after the confirm-page fix landed, but without ` — <sha>`. `/10x-archive` flags it as a soft warning.
- **Fix**: Append ` — f1946a8` (the commit that fixed the confirm page and recorded the local 2.5 check).
- **Decision**: FIXED: 2.5 now ends with ` — f1946a8`

### F4 — Local email-confirmation setup is undocumented and points links at the wrong port

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: README.md:133-141, supabase/config.toml:158
- **Detail**: The README section "Email confirmation in local development" describes the hosted dashboard toggle. It doesn't mention `[auth.email] enable_confirmations` in `supabase/config.toml`, or that local Supabase must be restarted for a change to take effect. That missing restart is why smoke first failed in this review. Also, `site_url = "http://127.0.0.1:3000"` sends Mailpit confirmation links to a port where nothing runs; the dev server is on 4321. Both issues predate this change, but the 2.5 check ran into them.
- **Fix**: Rewrite the README section to cover the local `config.toml` flag plus `npx supabase stop && npx supabase start` (keeping the hosted toggle as a second paragraph), and set `site_url` / `additional_redirect_urls` to `http://localhost:4321`.
- **Decision**: FIXED: README section rewritten (local `config.toml` flag, restart, Mailpit, hosted toggle); `site_url` and `additional_redirect_urls` set to `http://localhost:4321`; local Supabase restarted (`GOTRUE_SITE_URL=http://localhost:4321`, autoconfirm on)
