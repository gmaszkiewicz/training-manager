# Cookie Cleanup Implementation Plan

## Overview

Stop the request header from carrying `tm.*` preference cookies that belong to other accounts used in the same browser, and replace the one-year lifetime of `tm.*` cookies with 30 days (MS-43, roadmap S-52, issue #192).

## Current State Analysis

- Every `tm.*` cookie is named `tm.measurements.<name>.<accountId>` or `tm.measurements.<name>.<accountId>.<traineeId>`; the third dot-separated segment is always the owning account id (`src/lib/measurement-page.ts:52-136`).
- Three write sites set `Max-Age=31536000` (one year), refreshed on each write:
  - `writeCookie` in `src/lib/browser-storage.ts:21` (used by `writePreference` and by the mount-time reseeding in `src/components/measurements/MeasurementBrowser.tsx:861-870`);
  - the inline toggle script in `src/components/measurements/CollapsibleTile.astro:105`;
  - the server-set, **httpOnly** selected-trainee cookie in `src/pages/measurements.astro:347`.
- Nothing ever removes cookies, so a shared browser accumulates every account's (and every linked trainee's) cookies for a year, and all of them ride on every request (`Path=/`).
- `src/middleware.ts` resolves `context.locals.user` on every request; it is the one place that sees both the request cookies and the signed-in account.
- localStorage is the source of truth for most preferences; cookies mirror it so the server can render the remembered state. The selected trainee exists only as a cookie.
- The theme lives in localStorage under `theme` (`src/lib/theme.ts:5`), not in a `tm.*` cookie.

## Desired End State

- A signed-in request that carries `tm.*` cookies of another account gets `Set-Cookie` headers expiring them, so the next request no longer carries them. The current account's `tm.*` cookies (including per-trainee ones) and every non-`tm.*` cookie (Supabase `sb-*`, etc.) are untouched.
- Guest requests and `/api/auth/*` requests never delete `tm.*` cookies.
- Every `tm.*` cookie written from now on has `Max-Age=2592000` (30 days), from one shared constant.

Verify with the unit tests for the helper, the new Playwright spec, and the manual DevTools check in Phase 2.

### Key Discoveries:

- `tm.measurements.trainee.<accountId>` is `httpOnly` (`src/pages/measurements.astro:347-352`), so only the server can delete it — cleanup must be server-side.
- Mount-time reseeding (`MeasurementBrowser.tsx:861-870`, `CollapsibleTile.astro` `remember(stored)`) rewrites the current account's cookies from localStorage, so existing one-year cookies are shortened to 30 days on the next visit, and other accounts' localStorage cannot recreate other accounts' cookies (keys use the current account id).
- `CollapsibleTile.astro` writes cookies from an `is:inline` script, which cannot import modules; the lifetime has to reach it from the component's frontmatter (e.g. a `data-*` attribute next to `data-storage-key`).
- Astro's `context.cookies` does not enumerate incoming cookies; the names come from the raw `Cookie` request header.

## What We're NOT Doing

- No cleanup for guests (no resolved user) or at sign-out — a user who signs out and back in keeps their own choices, and an auth failure never wipes anything.
- No removal of the current trainer's per-trainee cookies for trainees no longer linked — they count as the current account's and age out within 30 days.
- No clearing of localStorage (other accounts' copies never reach the request header).
- No change to the theme storage or to Supabase auth cookies.
- No database or migration changes.

## Implementation Approach

A pure helper in `src/lib/` decides which cookie names in a `Cookie` header are stale for an account, and exports the shared 30-day lifetime. The middleware calls the helper after it resolves the user and expires each stale name. The three write sites switch to the shared lifetime.

## Critical Implementation Details

- **Timing & lifecycle** — Skip the cleanup on `/api/auth/*`: on a sign-in POST made while another session is still valid, the middleware resolves the *previous* account and would expire the incoming account's cookies. The redirect that follows sign-in runs the cleanup as the new account.
- **Cookie names** — Expire each stale cookie under the exact name it has in the request header, with `path: "/"` (the path every write site uses); a different path or a re-encoded name would leave the original cookie in place.

## Phase 1: Shared lifetime and stale-cookie helper

### Overview

Introduce the 30-day constant and the pure stale-name function with unit tests, and switch every `tm.*` write site to the new lifetime.

### Changes Required:

#### 1. Preference cookie helper

**File**: `src/lib/preference-cookies.ts` (new), `src/lib/preference-cookies.test.ts` (new)

**Intent**: Own the `tm.*` cookie policy in one place: how long the cookies live and which ones on a request belong to another account.

**Contract**: `PREFERENCE_COOKIE_MAX_AGE = 2592000` (seconds, 30 days) and `staleAccountCookieNames(cookieHeader: string | null, accountUserId: string): string[]`. It returns the names (as they appear in the header) that start with `tm.` and whose third dot-separated segment is not `accountUserId`; a `tm.` name with no third segment also counts as stale. Non-`tm.` names (`sb-*`, `theme`, anything else) are never returned. Empty or null header → `[]`. Tests cover: own two-segment-key and per-trainee cookies kept; another account's account-level and per-trainee cookies returned; `sb-*` auth cookies (including chunked `sb-…-auth-token.0`) kept; a name that only contains the account id in a different segment (e.g. as the trainee id) is still stale; whitespace and `=` inside values handled.

#### 2. Client-side write sites

**File**: `src/lib/browser-storage.ts`

**Intent**: `writeCookie` uses `PREFERENCE_COOKIE_MAX_AGE` instead of the literal one year.

**Contract**: Same signature; the cookie string's `Max-Age` comes from the constant.

**File**: `src/components/measurements/CollapsibleTile.astro`

**Intent**: The inline toggle script writes the cookie with the shared lifetime instead of `31536000`.

**Contract**: The frontmatter imports the constant and passes it to the `<details>` element (e.g. `data-cookie-max-age`), which the inline script reads next to `data-storage-key`. No module import inside the `is:inline` script.

#### 3. Server-side write site

**File**: `src/pages/measurements.astro`

**Intent**: The httpOnly selected-trainee cookie uses the shared lifetime.

**Contract**: `maxAge: PREFERENCE_COOKIE_MAX_AGE` in the `Astro.cookies.set` call at line ~347; other options unchanged.

### Success Criteria:

#### Automated Verification:

- Unit tests for `staleAccountCookieNames` pass: `npm test`
- No `31536000` literal remains in `src/`: `grep -rn 31536000 src` returns nothing
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`

#### Manual Verification:

- After toggling a tile and changing the page size on `/measurements`, DevTools shows the `tm.*` cookies expiring about 30 days from now

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Middleware cleanup and e2e proof

### Overview

Expire other accounts' `tm.*` cookies on every signed-in request, and prove it in the browser.

### Changes Required:

#### 1. Middleware cleanup

**File**: `src/middleware.ts`

**Intent**: After `context.locals.user` is resolved, and only when it is non-null and the path does not start with `/api/auth/`, expire every name `staleAccountCookieNames` returns for the request's `Cookie` header and the user's id. Runs before the protected-route redirect check, so it also applies to pages and API routes alike.

**Contract**: For each stale name, `context.cookies.delete(name, { path: "/" })`. No change to user resolution, `PROTECTED_ROUTES` or `SERVER_VERIFIED_ROUTES`.

#### 2. Playwright spec

**File**: `tests/e2e/cookie-cleanup.spec.ts` (new)

**Intent**: Prove the request header loses another account's `tm.*` cookies while the current account's stay and expire within 30 days.

**Contract**: Uses the signed-in storage state from `auth.setup.ts`. Before navigation, `context.addCookies` seeds `tm.measurements.pageSize.<random uuid>` and `tm.measurements.trainee.<random uuid>` (httpOnly) for a fake other account. After visiting `/measurements` and waiting for the journal to render, `context.cookies()` contains neither seeded cookie, still contains the `sb-*` auth cookie, and the current account's `tm.measurements.pageSize.<own id>` cookie (written at mount) expires no later than now + 30 days (+ a small margin). Creates no data, so nothing to clean up.

### Success Criteria:

#### Automated Verification:

- New spec passes: `npx playwright test tests/e2e/cookie-cleanup.spec.ts`
- Full e2e suite still passes (remembered choices unaffected): `npx playwright test`
- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build succeeds: `npm run build`

#### Manual Verification:

- Sign in as account A, open `/measurements`, change a preference; sign out, sign in as account B and open `/measurements`: DevTools shows no `tm.*` cookie with A's id, and B's choices still render
- Sign back in as A: A's tile and page-size choices are restored from localStorage

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `staleAccountCookieNames`: own vs other account (account-level and per-trainee keys), `sb-*` and other non-`tm.` cookies, account id in the wrong segment, malformed `tm.` names, empty/null header.

### Integration Tests:

- `tests/e2e/cookie-cleanup.spec.ts`: seeded foreign `tm.*` cookies (including httpOnly) are gone after one signed-in page load; auth cookie and own cookies remain; own cookie lifetime ≤ 30 days.

### Manual Testing Steps:

1. Two accounts on one browser: switch between them and inspect cookies in DevTools.
2. Confirm remembered choices of each account survive switching (via localStorage reseeding).
3. Visit a guest page (`/`) while foreign `tm.*` cookies exist: they are left in place.

## Performance Considerations

The middleware adds one parse of the `Cookie` header per request and no network calls; deletion adds a few `Set-Cookie` headers only when stale cookies exist.

## Migration Notes

Existing one-year cookies of the current account are shortened to 30 days on their next write or mount-time reseed; other accounts' existing cookies are removed on the first signed-in request. No data migration.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-52 / MS-43
- Cookie keys: `src/lib/measurement-page.ts:52-136`
- Write sites: `src/lib/browser-storage.ts:21`, `src/components/measurements/CollapsibleTile.astro:105`, `src/pages/measurements.astro:347`
- Middleware: `src/middleware.ts`
- Mount-time reseeding: `src/components/measurements/MeasurementBrowser.tsx:861-870`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared lifetime and stale-cookie helper

#### Automated

- [x] 1.1 Unit tests for `staleAccountCookieNames` pass: `npm test` — 9266528
- [x] 1.2 No `31536000` literal remains in `src/`: `grep -rn 31536000 src` returns nothing — 9266528
- [x] 1.3 Lint passes: `npm run lint` — 9266528
- [x] 1.4 Type check passes: `npx astro check` — 9266528

#### Manual

- [x] 1.5 After toggling a tile and changing the page size on `/measurements`, DevTools shows the `tm.*` cookies expiring about 30 days from now — 9266528

### Phase 2: Middleware cleanup and e2e proof

#### Automated

- [x] 2.1 New spec passes: `npx playwright test tests/e2e/cookie-cleanup.spec.ts`
- [x] 2.2 Full e2e suite still passes (remembered choices unaffected): `npx playwright test`
- [x] 2.3 Unit tests pass: `npm test`
- [x] 2.4 Lint passes: `npm run lint`
- [x] 2.5 Type check passes: `npx astro check`
- [x] 2.6 Build succeeds: `npm run build`

#### Manual

- [x] 2.7 Sign in as account A, open `/measurements`, change a preference; sign out, sign in as account B and open `/measurements`: DevTools shows no `tm.*` cookie with A's id, and B's choices still render
- [x] 2.8 Sign back in as A: A's tile and page-size choices are restored from localStorage
