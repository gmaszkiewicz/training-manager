# Shared top bar — Plan Brief

> Full plan: `context/changes/shared-topbar/plan.md`

## What & Why

A guest and a signed-in trainee or trainer should see the same top bar on the public home, sign-in, sign-up, and both dashboards. Today the bar exists only on `/`, still says "Not signed in" or shows a Dashboard link, and Sign out is repeated under the journal and the trainer panel.

## Starting Point

`Topbar.astro` is mounted from `Welcome.astro` only. Sign-in, sign-up, and `/dashboard` center a card and do not render it. Role is not on the session; `ensureProfile` reads `profiles` and may insert, and only the dashboard page calls it. The trainer list already marks a current item with `aria-current="page"` and `font-semibold text-card-foreground`.

## Desired End State

A guest on `/` reads "Hello guest", with Home marked, Sign in, and Sign up, and the hero buttons stay. On `/auth/signin`, Sign in is marked. On `/auth/signup`, Sign up is marked. Home is on both auth bars and is not marked there.

A trainee `ada@example.com` reads "Hello trainee ada@example.com" as one phrase with a single space, with Home (`/`), Measurements (`/dashboard`), and Sign out. Home is marked on `/`. Measurements is marked on `/dashboard`, including `/dashboard?trainee=abc`, and that link always goes to `/dashboard` with no query. Opening that URL keeps the existing preview: the most recently linked trainee, or nobody when the list is empty. A trainer reads "Hello trainer" instead, still one space before the email. A signed-in user with no usable stored role reads `ada@example.com` only, with the same signed-in links. A signed-in person on the sign-in page sees that signed-in bar and nothing marked. Sign out, Welcome, and the email are gone from both cards. Those cards are titled Body measurements. The unavailable panel heading stays Dashboard. Email confirmation has no bar.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Where the bar appears | `/`, sign-in, sign-up, and both dashboards | S-11 names those screens and does not name email confirmation | Roadmap |
| Guest copy | "Hello guest", Home, Sign in, Sign up | Home was added after the first bar shipped so a guest can leave sign-in and sign-up | Follow-up |
| Signed-in copy | "Hello trainee" or "Hello trainer" and the email as one phrase, Home, Measurements, Sign out | One space between the greeting and the email; replaces the email plus Dashboard link | Follow-up |
| Card copy | Title Body measurements; no Welcome and no email on the card | The bar already carries the greeting and the email | Follow-up |
| Sign out placement | Only in the bar | The journal and trainer cards drop their own Sign out form | Roadmap |
| Current page | Mark the link whose href equals the pathname | A guest on `/` marks Home; Sign out is never marked | Follow-up |
| Signed-in user on auth | The signed-in bar, nothing marked | The bar follows the session, and Home and Measurements are not those paths | Plan |
| Unusable role | Email only, signed-in links, no Hello line | A failed read or a role other than trainee or trainer must not say guest or trainee | Plan |
| Measurements href | Always `/dashboard`, still marked when `?trainee=` is present | Clicking it follows the existing preview rule: the most recently linked trainee, not an empty selection | Plan |
| Role lookup | Read `profiles`, never insert from the bar | Opening the home must not create a profile; the dashboard page still runs `ensureProfile` first | Plan |
| Mount point | Each of the four pages includes `Topbar`, not `Layout` | `Layout` also wraps email confirmation and the kitchen sinks | Plan |

## Scope

**In scope:**

- The shared bar model, a read-only role lookup, and the current-page mark
- Mounting the bar on `/`, `/auth/signin`, `/auth/signup`, and `/dashboard`
- Removing Sign out from the journal and the trainer panel
- Home, journal, and trainer kitchen sinks

**Out of scope:**

- `/auth/confirm-email`, and any redirect off the auth pages
- Removing the hero Sign in and Sign up
- Changing the unavailable-panel heading away from Dashboard
- Measurement data, trainer linking, and the unavailable-panel copy
- A migration or a mobile menu

## Architecture / Approach

`topbarModel` in `src/lib/topbar.ts` turns a session, a stored role, and a pathname into the greeting and the links. `Topbar.astro` either computes that from `Astro.locals` plus `readProfileRole`, or accepts a `preview` prop for the home sink. The island renders the greeting on the left and ghost-button links plus the existing Sign out form on the right. The marked link uses the trainer list's `aria-current="page"` treatment.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Bar contract | New copy, links, mark, and read-only role lookup, visible on `/` | Sign-in creates the profile on `/dashboard`. The email-only bar shows only when that row is missing and `/` is opened without running `ensureProfile` again |
| 2. Auth and both dashboards | The same bar above sign-in, sign-up, and both dashboard cards; Sign out removed underneath | Nesting the bar inside the centering wrapper would drop it into the card |
| 3. Kitchen sinks | Five session-free previews on the home sink; journal and trainer sinks drop the card Sign out | The sinks drift from the product if they keep the old Sign out notes |

**Prerequisites:** S-07, S-08, S-09, and S-10 are done. No new env or migration.
**Estimated effort:** about one to two sessions across three phases.

## Open Risks & Assumptions

- Sign-in redirects to `/dashboard`, which inserts the `profiles` row. The email-only bar is what you see when that row is missing or the read fails: delete the row while the session exists, then open `/` directly, without loading `/dashboard` again.
- Invalid signup metadata still shows the unavailable panel, while a stored `trainee` or `trainer` role still gets a Hello line. The bar does not copy the page's null role.
- The dashboard card keeps its own `min-h-screen` centering, so the page is the bar plus a full-height card.

## Success Criteria (Summary)

- A guest can move among `/`, sign-in, and sign-up and see "Hello guest", with Home, and with Sign in or Sign up marked only on its own page. Home is marked on `/`.
- A trainee or trainer sees "Hello trainee" or "Hello trainer" and their email as one phrase, plus Home, Measurements, and Sign out, with the current path marked. The measurement card is titled Body measurements and has no Sign out, Welcome, or email.
- A signed-in user with no usable stored role sees the email and the signed-in links, and is not called a guest or a trainee.
