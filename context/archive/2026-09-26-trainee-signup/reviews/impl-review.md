<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Trainee signup Implementation Plan

- **Plan**: context/changes/trainee-signup/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-09-27
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Automated verification (run 2026-09-27)

| Command | Result |
|---------|--------|
| `npm run lint` | FAIL locally: 42 `Delete ␍` errors, all in `src/pages/dashboard.astro` (working copy has CRLF endings; the index has LF) |
| `npx astro check` | PASS: 0 errors, 0 warnings, 0 hints |
| `npm run smoke` (dev server + local Supabase) | PASS: 8/8 steps; signup and sign-in both return 302 to `/dashboard` |

Local DB: `public.profiles` has RLS enabled; 4 rows, 4 distinct ids.

After triage: `npm run lint` passes (F2), and `npm run smoke` passes 8/8 with the F3 grants migration applied.

## Triage summary

- Fixed: F1, F2, F3, F4, F6, F7 (6)
- Deferred: F5, queued for S-02 in `follow-ups/review-fixes.md` (1)

## Findings

### F1 — Hosted migration push marked done but not verifiable

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/trainee-signup/plan.md (Progress 2.5, 2.9)
- **Detail**: Items 2.9 (hosted `public.profiles` via `npx supabase db push`) and 2.5 (confirmation-required signup) are checked off, with the Phase 2 code commit's SHA. This workspace has no linked project (`supabase status` shows `linked_project: null`, and there's no `supabase/.temp/project-ref`), so the push can't have run from here. The Migration Notes say that merging before the push makes every production `/dashboard` show `Could not open your journal`. The branch `cursor/trainee-signup` has no upstream yet, so it's still safe to check.
- **Fix**: Before merging, confirm hosted Supabase has `public.profiles`, using Studio or `npx supabase link` then `npx supabase db push --dry-run`. Otherwise, uncheck 2.5 and 2.9 until they're done.
- **Decision**: FIXED: unchecked 2.5 and 2.9 in plan Progress pending hosted verification

### F2 — Local lint fails on CRLF checkout

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: .gitattributes (missing)
- **Detail**: `core.autocrlf=true` and there's no `.gitattributes`, so Git checks files out with CRLF (`git ls-files --eol`: `i/lf w/crlf` for `dashboard.astro`, the new migration, and others). Prettier then rejects every line. The committed content is LF, so CI passes, but local `npm run lint` (check 1.1/2.1) fails for anyone on Windows, including agents.
- **Fix**: Add `.gitattributes` containing `* text=auto eol=lf`, then run `git add --renormalize .`.
- **Decision**: FIXED: added `.gitattributes`, renormalized (index was already LF), refreshed CRLF working-copy files

### F3 — Migration relies on implicit default grants

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260927065512_trainee_profile.sql
- **Detail**: The migration has no `GRANT`s. Locally, `authenticated` and `anon` both get full table privileges (including UPDATE, DELETE, TRUNCATE) only through Supabase's default privileges (`auto_expose_new_tables`, left unset in `config.toml`). On a project where that default is off, the dashboard's select and insert fail with permission denied, and every user sees `Could not open your journal`. RLS blocks unwanted writes today. Still, the plan's intent of "insert and read only" is enforced by policies alone rather than being stated in the grants.
- **Fix**: Append `revoke all on public.profiles from anon, authenticated; grant select, insert on public.profiles to authenticated;` in a new migration, since this one may already be pushed.
- **Decision**: FIXED: added `supabase/migrations/20260927100031_profiles_explicit_grants.sql`; applied locally (authenticated now holds SELECT, INSERT only; anon none); smoke 8/8

### F4 — Unplanned supabase/config.toml upgrade

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: supabase/config.toml
- **Detail**: Phase 1 regenerated the config for CLI 2.118, which isn't in the plan. The changes rename `[inbucket]` to `[local_smtp]`, change `project_id` from `10x-astro-starter` to `tm-project` (this renames the local Docker containers and volumes, so earlier local data is orphaned), turn on `[storage.vector] enabled = true`, and add `[experimental.pgdelta]`. CI uses `supabase/setup-cli@v1` with `version: latest`, so the renamed keys work there. Only the vector-storage enablement changes runtime behavior, and nothing in this slice needs it. The `eslint.config.js` ignore for `.cursor/**` and `.agents/**` is also unplanned but harmless.
- **Fix**: Add a short addendum to the plan noting the CLI config alignment, and set `[storage.vector] enabled = false` unless it's needed.
- **Decision**: FIXED: `[storage.vector] enabled = false`; plan gained an `## Addenda` section (config alignment, eslint ignores, F3 grants migration)

### F5 — Hand-written Database type shim inside the service

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/lib/services/ensure-trainee-profile.ts:6-39
- **Detail**: The helper declares a private `ProfilesDatabase` schema type and casts the untyped client to it. This is fine for one table. S-02 will add measurement tables, and repeating this per service would duplicate schema types that drift from the SQL.
- **Fix**: When S-02 adds tables, generate `src/db/database.types.ts` with `npx supabase gen types typescript --local`, type `createClient` with it, and delete this shim.
  - Strength: A single schema source that matches the migrations; removes the cast.
  - Tradeoff: Adds a regenerate step after each migration (a script or CI check).
  - Confidence: MED — standard Supabase practice, but the repo doesn't have a generated-types pattern yet.
  - Blind spot: Haven't checked whether `@supabase/ssr`'s `createServerClient` generic fits the existing `createClient` signature cleanly.
- **Decision**: DEFERRED: queued for S-02 in `follow-ups/review-fixes.md`

### F6 — Helper rejects non-trainee roles, which the S-03 note omits

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/ensure-trainee-profile.ts:48-50
- **Detail**: `findProfile` returns `error` when `role !== "trainee"`, so a future trainer row would render `Could not open your journal`. This is correct for this slice. However, the plan's Migration Notes tell S-03 to widen only the check constraint and the insert policy, not this helper or the `Profile` type.
- **Fix**: Add "and `ensureTraineeProfile` / `Profile.role`" to the S-03 sentence in the plan's Migration Notes (or the roadmap S-03 entry).
- **Decision**: FIXED: S-03 sentence in plan Migration Notes now names `Profile.role` and the helper's role check

### F7 — README confirm-email row describes signup, not the page

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: README.md:149
- **Detail**: In the routes table, the `/auth/confirm-email` row now says "Signup opens `/dashboard` when it returns a session, and `/auth/confirm-email` otherwise". That's a redirect rule, not a description of the route. The `/dashboard` row still says "Example protected page" even though it's now the journal.
- **Fix**: Set the confirm-email row to "'Check your inbox' page, shown after signup when no session is returned", and the dashboard row to "Trainee journal (redirects to `/auth/signin` if unauthenticated)".
- **Decision**: FIXED: both README route rows rewritten as proposed
