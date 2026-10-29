# Reduce Supabase Round Trips Implementation Plan

## Overview

Signed-in pages, `/measurements` above all, wait on a chain of sequential Supabase calls (~300 ms each on the free tier). This plan removes the auth call from the middleware by verifying the session from its JWT claims, runs the independent `/measurements` reads in parallel, and places the Worker near Supabase. Every page shows the same data as before. Roadmap item S-43 (MS-34), issue #158.

## Current State Analysis

- The middleware calls `supabase.auth.getUser()` on every request ([src/middleware.ts:12](../../../src/middleware.ts)) — one network round trip to the auth server before any page code runs.
- `App.Locals.user` is typed as the full Supabase `User` ([src/env.d.ts](../../../src/env.d.ts)), but the codebase reads only `user.id` (42 uses), `user.email` (4) and `user.user_metadata` (1, [src/pages/measurements.astro:153](../../../src/pages/measurements.astro)). All three are present in the access-token claims (`sub`, `email`, `user_metadata`). No other file depends on the `User` type.
- Trainee `/measurements`, default view, runs roughly nine sequential calls: auth → `ensureProfile` → `measurement_months` rpc → page select → older row → chart range ‖ `measurement_days` → `readPreviousMeasurement` → Topbar (profile ‖ bell). The Topbar's frontmatter only starts once the page frontmatter has finished.
- In the trainee branch ([src/pages/measurements.astro:152-200](../../../src/pages/measurements.astro)), `readPreviousMeasurement`, `readMeasurementDays` and the `?edit=` / `?delete=` `getMeasurement` reads do not depend on the page read; only the chart range needs the list's resolved `month`.
- In the trainer branch ([src/pages/measurements.astro:201-240](../../../src/pages/measurements.astro)), `measurement_days` waits for the page read although it does not need it.
- `readInitialChart` ([src/pages/measurements.astro:127-150](../../../src/pages/measurements.astro)) already runs range ‖ days with `Promise.all`; the service functions return `{ ok }` results instead of throwing.
- `wrangler.jsonc` has no `placement` entry.
- Local Supabase signs JWTs with the legacy HS256 secret (`signing_keys_path` is commented out in `supabase/config.toml`; `jwt_expiry = 3600`). `@supabase/auth-js` 2.117.3 provides `getClaims()`, which verifies locally only for asymmetric keys and otherwise falls back to an auth-server call.

## Desired End State

- The middleware resolves the user from verified JWT claims. With asymmetric signing keys on the hosted project, a page load makes no `/auth/v1/user` call. Protected routes and API routes still refuse a missing, expired or invalid token exactly as today.
- On `/measurements`, the trainee's page read, days read, previous-entry read and edit/delete row read start together after the profile check. The chart range follows the page's month. The trainer's days read starts alongside the page read.
- The Worker runs with Smart Placement.
- Rendered output is unchanged in every view: default, `?edit=`, `?delete=`, failed reads, and the trainer preview.
- A before/after timing of the signed-in `/measurements` response on production is recorded in the change folder.

### Key Discoveries:

- `getClaims()` reads the session through `getSession()`, which refreshes an expired access token and writes the refreshed cookies through the SSR client's `setAll`. This is the same refresh path the middleware relies on today.
- Account-security actions are already server-verified without a middleware `getUser()`. [src/pages/api/auth/password.ts:45-59](../../../src/pages/api/auth/password.ts) proves the current password with `signInWithPassword` and changes it with `updateUser`, which the auth server checks against the live session. `reset-password/confirm.ts` also uses `updateUser`. The planning decision "account-security endpoints stay server-verified" is therefore met by the existing calls; no extra `getUser()` is added.
- `readMeasurementDays` is only consumed when the list loaded and the view is not `?edit=`. Starting it early must not change when its result is shown.

## What We're NOT Doing

- Sharing the profile read between the page and the Topbar, or starting Topbar reads early. This changes the Topbar contract on every page; it is left for a later slice.
- Reusing the row `readMeasurementPage` already fetches for `focusId` in place of the edit/delete `getMeasurement` call.
- Parallelizing reads on pages other than `/measurements` (hub, profile, settings).
- Adding `Server-Timing` or other instrumentation code.
- Pinning placement to an explicit cloud region.
- Shortening `jwt_expiry`, or adding `getUser()` checks to write APIs.
- Any schema or migration change.

## Implementation Approach

Three independent mechanisms, each shippable on its own:

1. Middleware verifies the session locally and exposes a narrow `SessionUser`.
2. The measurements page starts every read that doesn't depend on another as soon as the profile role is known, and awaits results in the order the current code applies them. That way error copy and precedence stay identical.
3. Smart Placement, plus the manual production steps that actually realize the gain: the signing-key check or migration, and the before/after timing.

## Critical Implementation Details

- **Revocation window**: `getClaims()` trusts an unexpired token, so a session revoked elsewhere stays usable for page loads and RLS-scoped reads and writes for up to `jwt_expiry` (1 h). This trade-off was accepted in planning. Password change stays safe through the auth-server calls noted above.
- **Result precedence on `?edit=` + `?delete=`**: today the delete branch runs after the edit branch, so its "Could not delete the measurement" copy wins when both rows are missing. Apply the awaited results in that same order.
- **No floating reads**: every read started early must be awaited on every path, including when `readMeasurementPage` fails, so no promise is left unhandled.
- **Baseline before merge**: production auto-deploys on merge to `main`, so the "before" timing must be taken before the PR merges.

## Phase 1: Session from JWT claims

### Overview

Replace the middleware's `getUser()` with `getClaims()` and a tested mapping to a narrow session user, without changing route protection.

### Changes Required:

#### 1. Session user type

**File**: `src/types.ts`

**Intent**: Add the shape every page and API actually reads from the signed-in user, so `Locals.user` no longer claims to be a full auth-server `User`.

**Contract**: `SessionUser { id: string; email?: string; user_metadata: Record<string, unknown> }`.

#### 2. Claims mapper

**File**: `src/lib/session-user.ts` (new), `src/lib/session-user.test.ts` (new)

**Intent**: Turn verified JWT claims into a `SessionUser`, or `null` when there is no usable identity, so the middleware stays a thin wiring layer and the mapping is unit-tested.

**Contract**: `sessionUserFromClaims(claims: unknown): SessionUser | null`:
- returns `null` for missing claims, or when `sub` is not a non-empty string;
- `email` is copied only when it is a string;
- `user_metadata` falls back to `{}` when absent or not an object.

#### 3. Middleware

**File**: `src/middleware.ts`

**Intent**: Resolve `context.locals.user` from `supabase.auth.getClaims()` through the mapper. An error or `null` claims means signed out. The `PROTECTED_ROUTES` redirect logic is unchanged.

**Contract**: `context.locals.user: SessionUser | null`; protected-route redirect to `/auth/signin` when it is `null`.

#### 4. Locals type

**File**: `src/env.d.ts`

**Intent**: Narrow `App.Locals.user` to `SessionUser | null`. Every existing consumer compiles unchanged because it reads only `id`, `email` and `user_metadata`.

**Contract**: `interface Locals { user: import("@/types").SessionUser | null }`.

### Success Criteria:

#### Automated Verification:

- Unit tests for `sessionUserFromClaims` cover valid claims, missing claims, missing or empty `sub`, non-string `email`, and absent `user_metadata`: `npm test`
- Type check passes with the narrowed `Locals.user`: `npx astro check`
- Lint passes: `npm run lint`
- Production build succeeds: `npm run build`
- Auth-flow smoke passes against the preview with local Supabase: `npm run smoke`
- Playwright suite passes: `npx playwright test`

#### Manual Verification:

- Signed in, `/measurements`, `/profile`, `/hub` and `/settings` load with the same greeting and data as before
- After sign-out, or with the auth cookie deleted or edited by hand, every protected route redirects to `/auth/signin`, and an API call (e.g. `POST /api/measurements`) is refused as it is today
- Password change on `/settings` still rejects a wrong current password, succeeds with the right one, and signs out other sessions
- A first-time trainer sign-up still gets the trainer role on the first `/measurements` visit (role read from `user_metadata` in the claims)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Parallel reads on /measurements

### Overview

Start independent reads together in both the trainee and trainer branches of the measurements page, keeping each read's condition, error handling and output.

### Changes Required:

#### 1. Initial chart read takes a pre-started days read

**File**: `src/pages/measurements.astro`

**Intent**: Let the caller start `readMeasurementDays` early and hand its pending result to `readInitialChart`. Only the range read waits for the list's month.

**Contract**: `readInitialChart` receives the in-flight days result alongside `listMonth`. `chartInitial` and `chartDays` are set under the same conditions as today, and stay `null` when the corresponding read fails.

#### 2. Trainee branch

**File**: `src/pages/measurements.astro`

**Intent**: Right after `ensureProfile` reports `trainee`, start these together:
- `readMeasurementPage`;
- `readMeasurementDays`, only when `editId === null`;
- `readPreviousMeasurement`, only when `editId === null`;
- `getMeasurement(editId)`, only when `editId !== null`;
- `getMeasurement(deleteId)`, only when `deleteId !== null`.

Then await and apply the results in the current order: list, chart (only when the list loaded and `editId === null`), previous entry, edit row, delete row.

**Contract**: Unchanged values for `measurementsLoaded`, `entries`, `dates`, `page`, `pageCount`, `pageSize`, `month`, `chartInitial`, `chartDays`, `previousEntry`, `editingEntry`, `confirmingEntry` and `traineeServerError` in every combination of `?edit=` / `?delete=` and read success or failure. The days result is discarded when the list fails, exactly as it is never shown today.

#### 3. Trainer branch

**File**: `src/pages/measurements.astro`

**Intent**: Once `selectedLink` is known, start `readMeasurementDays` for the selected trainee alongside `readMeasurementPage`. The chart range still follows the page's month, and the chart is set only when the list loaded.

**Contract**: Unchanged values for `trainerMeasurementsLoaded`, `entries`, `dates`, `page`, `pageCount`, `pageSize`, `month`, `chartInitial` and `chartDays`. The selected-trainee cookie is written exactly as today.

### Success Criteria:

#### Automated Verification:

- Type check passes: `npx astro check`
- Lint passes (no floating promises): `npm run lint`
- Unit tests pass: `npm test`
- Production build succeeds: `npm run build`
- Playwright suite passes, including `measurement-charts`, `measurement-prefill`, `measurements-menus` and `hub-collaborations`: `npx playwright test`

#### Manual Verification:

- Trainee default view: list, page, month, Charts tile (with its remembered period and day picker) and the prefilled add form match the pre-change render
- `?edit=<id>` opens the edit form with the row and no charts; `?edit=<unknown id>` shows "Could not open that measurement"
- `?delete=<id>` shows the confirmation for the row; `?delete=<unknown id>` shows "Could not delete the measurement"
- Trainer preview with a selected trainee shows the same list and Charts tile; switching trainee still remembers the choice
- In the Network or Workers log, a trainee default load shows the days and previous-entry reads starting together with the page read, not after it

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Placement and production check

### Overview

Enable Smart Placement and do the production-side steps: a timing baseline, the hosted JWT signing-key check or migration, and the after timing.

### Changes Required:

#### 1. Smart Placement

**File**: `wrangler.jsonc`

**Intent**: Let Cloudflare run the Worker near the Supabase project its subrequests go to.

**Contract**: top-level `"placement": { "mode": "smart" }`; static assets stay served from the edge.

#### 2. Timing record

**File**: `context/changes/reduce-supabase-round-trips/timing.md` (new)

**Intent**: Keep the before and after numbers next to the plan as the evidence for "noticeably faster".

**Contract**: For each run, record the method (`curl -w "%{time_total}"` on the signed-in production `/measurements` with a session cookie, 5 runs), the date, the median and the individual values. Include the before run, the after run, and an after run following the key migration if that happens.

#### 3. Hosted JWT signing keys (dashboard, no code)

**Intent**: Make `getClaims()` verify locally in production. With the legacy HS256 secret it still calls the auth server, which is correct but gains nothing.

**Contract**: Supabase Dashboard → Project Settings → JWT Keys. If the project is still on the legacy secret:
1. migrate to signing keys;
2. create an ES256 standby key and rotate it in;
3. leave the legacy key as "previously used" so tokens already issued stay valid until they expire.

Local Supabase stays on HS256; code paths are identical either way.

### Success Criteria:

#### Automated Verification:

- Production build succeeds: `npm run build`
- Wrangler accepts the config: `npx wrangler deploy --dry-run`

#### Manual Verification:

- Before timing on production recorded in `timing.md` before the PR merges
- Hosted project checked for JWT signing keys and migrated to ES256 if it was on the legacy secret
- After deploy, a signed-in page load makes no `/auth/v1/user` request (Supabase auth logs or Workers observability subrequests)
- After timing recorded in `timing.md`, with a median below the before median
- Smart Placement shows as enabled for the Worker in the Cloudflare dashboard

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `sessionUserFromClaims`: valid claims; `null` / `undefined` claims; missing, empty and non-string `sub`; non-string `email`; missing or non-object `user_metadata`.

### Integration Tests:

- Existing Playwright specs render every parallelized section (charts, prefill, menus, trainer preview) against local Supabase on the HS256 fallback path.
- `npm run smoke` covers sign-up, sign-in, protected redirect and sign-out through the new middleware.

### Manual Testing Steps:

1. Sign in as a trainee; compare `/measurements` default, `?edit=`, `?delete=` and unknown-id variants with the pre-change render.
2. Sign in as a trainer with a linked trainee; compare the preview and the Charts tile.
3. Remove or tamper with the auth cookie; confirm redirects and API refusals.
4. Change the password; confirm wrong-current-password rejection and other-session sign-out.
5. Time production before merge and after deploy; record both in `timing.md`.

## Performance Considerations

After this change, a trainee default load runs about six sequential steps instead of nine:
1. local claims check;
2. profile read;
3. the page read chain (months → page → older), with days and previous-entry running alongside;
4. chart range;
5. Topbar.

Smart Placement then shortens each remaining hop. The Topbar hop stays (see What We're NOT Doing).

## Migration Notes

No database migration. The signing-key rotation is a dashboard action that is independent of the deploy order, and code behaves correctly before and after it. Rollback: revert the middleware commit (back to `getUser()`) or remove the `placement` entry. Neither needs data changes.

## References

- Roadmap: `context/foundation/roadmap.md` — S-43 (MS-34), issue #158
- Middleware: `src/middleware.ts:6-25`
- Measurements reads: `src/pages/measurements.astro:127-240`
- Existing parallel read pattern: `src/pages/measurements.astro:140-147`, `src/components/Topbar.astro:33-36`
- Server-verified password change: `src/pages/api/auth/password.ts:45-59`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Session from JWT claims

#### Automated

- [x] 1.1 Unit tests for `sessionUserFromClaims` cover valid claims, missing claims, missing or empty `sub`, non-string `email`, and absent `user_metadata`: `npm test` — 87cfb36
- [x] 1.2 Type check passes with the narrowed `Locals.user`: `npx astro check` — 87cfb36
- [x] 1.3 Lint passes: `npm run lint` — 87cfb36
- [x] 1.4 Production build succeeds: `npm run build` — 87cfb36
- [x] 1.5 Auth-flow smoke passes against the preview with local Supabase: `npm run smoke` — 87cfb36
- [x] 1.6 Playwright suite passes: `npx playwright test` — 87cfb36

#### Manual

- [x] 1.7 Signed in, `/measurements`, `/profile`, `/hub` and `/settings` load with the same greeting and data as before — 87cfb36
- [x] 1.8 After sign-out, or with the auth cookie deleted or edited by hand, every protected route redirects to `/auth/signin`, and an API call (e.g. `POST /api/measurements`) is refused as it is today — 87cfb36
- [x] 1.9 Password change on `/settings` still rejects a wrong current password, succeeds with the right one, and signs out other sessions — 87cfb36
- [x] 1.10 A first-time trainer sign-up still gets the trainer role on the first `/measurements` visit (role read from `user_metadata` in the claims) — 87cfb36

### Phase 2: Parallel reads on /measurements

#### Automated

- [ ] 2.1 Type check passes: `npx astro check`
- [ ] 2.2 Lint passes (no floating promises): `npm run lint`
- [ ] 2.3 Unit tests pass: `npm test`
- [ ] 2.4 Production build succeeds: `npm run build`
- [ ] 2.5 Playwright suite passes, including `measurement-charts`, `measurement-prefill`, `measurements-menus` and `hub-collaborations`: `npx playwright test`

#### Manual

- [ ] 2.6 Trainee default view: list, page, month, Charts tile (with its remembered period and day picker) and the prefilled add form match the pre-change render
- [ ] 2.7 `?edit=<id>` opens the edit form with the row and no charts; `?edit=<unknown id>` shows "Could not open that measurement"
- [ ] 2.8 `?delete=<id>` shows the confirmation for the row; `?delete=<unknown id>` shows "Could not delete the measurement"
- [ ] 2.9 Trainer preview with a selected trainee shows the same list and Charts tile; switching trainee still remembers the choice
- [ ] 2.10 In the Network or Workers log, a trainee default load shows the days and previous-entry reads starting together with the page read, not after it

### Phase 3: Placement and production check

#### Automated

- [ ] 3.1 Production build succeeds: `npm run build`
- [ ] 3.2 Wrangler accepts the config: `npx wrangler deploy --dry-run`

#### Manual

- [ ] 3.3 Before timing on production recorded in `timing.md` before the PR merges
- [ ] 3.4 Hosted project checked for JWT signing keys and migrated to ES256 if it was on the legacy secret
- [ ] 3.5 After deploy, a signed-in page load makes no `/auth/v1/user` request (Supabase auth logs or Workers observability subrequests)
- [ ] 3.6 After timing recorded in `timing.md`, with a median below the before median
- [ ] 3.7 Smart Placement shows as enabled for the Worker in the Cloudflare dashboard
