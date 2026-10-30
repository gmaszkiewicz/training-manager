# Reduce Supabase Round Trips — Plan Brief

> Full plan: `context/changes/reduce-supabase-round-trips/plan.md`

## What & Why

Free-tier Supabase answers in about 300 ms per call, and a signed-in `/measurements` load chains about nine of those calls one after another, which is two seconds or more. This change cuts the chain so signed-in pages, the measurements screen above all, open noticeably faster and show the same data as before (roadmap S-43, MS-34, issue #158).

## Starting Point

The middleware calls `auth.getUser()` on every request. The measurements page runs its reads one after another even where one doesn't need another's result. The Worker runs at the edge nearest the user, not near the database.

## Desired End State

The middleware verifies the session from the JWT claims, with no auth-server call once the hosted project uses asymmetric signing keys. The measurements page starts its independent reads together for trainees and trainers. The Worker uses Smart Placement. Before/after production timings are recorded in the change folder, and every view renders exactly as before.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Where `getClaims()` applies | Middleware for every route; account-security actions stay server-verified | Password change already goes through `signInWithPassword` + `updateUser`, so no extra `getUser()` is needed |
| Revocation window | Accept up to 1 h (`jwt_expiry`) for a session revoked elsewhere | That's the cost of local verification; route protection for missing or invalid tokens is unchanged |
| Session user shape | Narrow `SessionUser` (id, email, user_metadata) from a tested claims mapper | The code reads only these three fields, and all are in the claims |
| Placement | Smart Placement | No region to look up or keep in sync; it's the roadmap's named change |
| Hosted signing keys | Manual plan step: check, and migrate to ES256 if needed | Without it, `getClaims()` falls back to a server call and gains nothing |
| Parallelization scope | Trainee reads plus trainer days read on `/measurements` only | Same pattern in the same file; Topbar sharing and the edit-view dedupe are deferred |
| Proof of speed-up | Before/after `curl` timing on production (median of 5) in `timing.md` | Measures the user-facing number without adding instrumentation code |
| Testing | Unit-test the claims mapper; rely on existing e2e + smoke; manual edit/delete checks | Covers the new logic and reuses specs that already render the parallelized sections |

## Scope

**In scope:**
- `SessionUser` type, `sessionUserFromClaims` + unit tests, middleware `getClaims()`, narrowed `Locals.user`
- Trainee `/measurements`: page, days, previous-entry and edit/delete reads start together; chart range waits for the page's month
- Trainer `/measurements`: days read starts alongside the page read
- `wrangler.jsonc` Smart Placement; signing-key check or migration; before/after timing

**Out of scope:**
- Sharing the profile with the Topbar or starting Topbar reads early
- Reusing the focused row from `readMeasurementPage` in edit/delete views
- Other pages, `Server-Timing` instrumentation, an explicit region pin, `jwt_expiry` changes, schema changes

## Architecture / Approach

Request → middleware (`getClaims()`, local JWKS verify → `SessionUser`) → page.

On `/measurements` (trainee), after the profile check:
- `[months → page → older] ‖ days ‖ previous ‖ edit/delete row` run together;
- then the chart range for the resolved month;
- then the Topbar.

Results are applied in today's order, so error copy and precedence stay identical. Sequential steps drop from about nine to about six, and Smart Placement shortens each remaining hop.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Session from JWT claims | Middleware without the auth round trip; narrow `SessionUser` | A missing or invalid token must still redirect, and APIs must still refuse |
| 2. Parallel reads on /measurements | Independent trainee and trainer reads start together | Same output in edit, delete and failed-read views; no floating promises |
| 3. Placement and production check | Smart Placement, signing keys, recorded timings | Before timing must be taken before the PR merges (auto-deploy) |

**Prerequisites:** S-24 and S-42 merged (done); Supabase dashboard access for the signing-key step; Cloudflare dashboard access to confirm placement.
**Estimated effort:** ~1–2 sessions across 3 phases.

## Open Risks & Assumptions

- Smart Placement learns from traffic, so a low-traffic app may see its effect late.
- Until the hosted project uses asymmetric keys, phase 1 is correct but brings no speed-up.
- A revoked session stays usable for page loads and RLS-scoped writes for up to an hour.

## Success Criteria (Summary)

- The signed-in production `/measurements` median time is lower after the change, recorded in `timing.md`.
- Every view (default, edit, delete, failed reads, trainer preview) renders the same as before.
- Unauthenticated requests are still redirected or refused.
