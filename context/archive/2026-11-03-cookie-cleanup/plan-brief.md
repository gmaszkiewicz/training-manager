# Cookie Cleanup — Plan Brief

> Full plan: `context/changes/cookie-cleanup/plan.md`

## What & Why

When several accounts use the same browser, every account's `tm.*` preference cookies stay for a year and are sent with every request. This change removes other accounts' `tm.*` cookies from the request and shortens the lifetime of every `tm.*` cookie to 30 days (MS-43, S-52, issue #192).

## Starting Point

All `tm.*` cookies are named `tm.measurements.<name>.<accountId>[.<traineeId>]` and are written with `Max-Age=31536000` in three places: `browser-storage.ts`, the inline script in `CollapsibleTile.astro`, and the server-set httpOnly selected-trainee cookie in `measurements.astro`. Nothing ever deletes them.

## Desired End State

After one signed-in request, the browser no longer sends any `tm.*` cookie of another account. The current account's choices and the Supabase auth cookies are untouched. Every `tm.*` cookie expires 30 days after its last write.

## Key Decisions Made

| Decision                        | Choice                                            | Why (1 sentence)                                                                                           |
| ------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Where cleanup runs              | Middleware, every signed-in request               | The selected-trainee cookie is httpOnly, and this also cleans browsers that already carry stale cookies.   |
| Guests / signed-out requests    | Leave `tm.*` cookies alone                        | Signing out and back in keeps your own choices, and an auth failure never wipes anything.                  |
| Sign-in requests                | Skip `/api/auth/*`                                | A sign-in POST could otherwise resolve the previous account and delete the incoming account's cookies.     |
| Lifetime                        | 30 days (`Max-Age=2592000`), one shared constant | Active users never notice (writes and reseeding refresh it); abandoned cookies vanish within a month.      |
| Unlinked trainees' cookies      | Kept; expire in 30 days                           | They belong to the current account, and the middleware stays a pure name check with no database lookup.    |
| Other accounts' localStorage    | Not cleared                                       | It never reaches the request header and cannot recreate other accounts' cookies.                           |

## Scope

**In scope:**

- `src/lib/preference-cookies.ts`: the 30-day constant and `staleAccountCookieNames`, with unit tests
- The three write sites switched to the 30-day lifetime
- Cleanup in `src/middleware.ts`
- A Playwright spec

**Out of scope:**

- Sign-out or guest cleanup
- Removing cookies for trainees who are no longer linked
- Clearing localStorage
- Theme storage and Supabase cookies
- Database changes

## Architecture / Approach

A pure helper reads the raw `Cookie` header. It returns the `tm.*` names whose third dot-separated segment is not the signed-in user's id. The middleware runs after it resolves `locals.user` and calls `cookies.delete(name, { path: "/" })` for each name. Only signed-in, non-`/api/auth/` requests do this.

## Phases at a Glance

| Phase                                      | What it delivers                                                        | Key risk                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1. Shared lifetime and stale-cookie helper | 30-day constant, tested stale-name function, three write sites switched | The `is:inline` tile script cannot import the constant, so it gets it from a data attribute |
| 2. Middleware cleanup and e2e proof        | Cleanup on every signed-in request, Playwright proof                    | Deleting with the wrong name or path would leave the cookie in place                     |

**Prerequisites:** none. Local Supabase is needed for the e2e suite.
**Estimated effort:** about 1 session across 2 phases.

## Open Risks & Assumptions

- The request that triggers the cleanup still carries the stale cookies once. Only later requests are clean.
- The current account's existing one-year cookies are shortened only on their next write or mount-time reseed.
- A trainer away for more than 30 days loses the remembered selected trainee. That cookie has no localStorage copy.

## Success Criteria (Summary)

- After switching accounts in one browser, DevTools shows no `tm.*` cookie of the previous account.
- Each account's remembered choices still restore, and the full e2e suite passes.
- Every newly written `tm.*` cookie expires within 30 days.
