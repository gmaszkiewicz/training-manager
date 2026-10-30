# Read-only Role in Profile → Details — Plan Brief

> Full plan: `context/changes/role-view-in-profile/plan.md`

## What & Why

A signed-in user can see their app role, Trainee or Trainer, in Profile → Details. It appears as a read-only field directly above Email, styled exactly like Email, with a role icon that matches the other Details icons. Roadmap S-44 (MS-35), issue #165.

## Starting Point

Details shows a muted, read-only, unnamed Email field with a `Mail` icon, followed by the editable first and last names. `/profile` reads only the names from `profiles`. The role is read only by the top bar, inside `Topbar.astro`.

## Desired End State

A trainee sees "Role: Trainee" with a PersonStanding icon above Email, and a trainer sees "Role: Trainer" with a Dumbbell icon. The field cannot be edited and is never sent with the Details form. If the role can't be read or is not trainee or trainer, the row is simply absent.

## Key Decisions Made

| Decision           | Choice                                                            | Why (1 sentence)                                                              |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Copy               | Label "Role", value "Trainee" or "Trainer"                        | Same words as sign-up and Hub, so one concept has one name.                   |
| Icons              | PersonStanding = Trainee, Dumbbell = Trainer                      | Reuses the Hub → Collaborations mapping, so a role always looks the same.      |
| Role source        | Server-side `profiles.role`, read with the names in one query     | The role can't come from the form, and the page makes no extra round trip.    |
| Not submittable    | Input has no `name`, sits outside the form fieldsets, like Email  | The Details POST can never carry a role.                                      |
| Unknown role value | Omit the Role row; the rest of Details unchanged                  | No wrong or placeholder value, and name editing isn't blocked.                |
| Testing            | Unit (pure helper) + one trainee e2e + home kitchen sink          | Covers the trainer visually, since e2e has only a trainee.                    |

## Scope

**In scope:**

- `src/lib/profile-role.ts` with parsing and label, plus its unit tests
- `readProfileDetails` (names + role) and `ProfileDetails.role`
- A Role row in `ProfileDetailsForm` and the `role` prop from `profile.astro`
- A Playwright spec for the trainee
- A "Profile details" section in `/kitchen-sink/home`

**Out of scope:**

- Changing the role, or any change to `POST /api/profile`
- Migrations, top-bar or greeting changes, `/profile/avatar`
- A placeholder or an unavailable state for an unknown role
- A trainer browser test

## Architecture / Approach

`profile.astro` → `readProfileDetails` (one `profiles` select of names + role, narrowed by `parseProfileRole`) → `ProfileDetailsForm role={…}` → the Role row renders `profileRoleLabel(role)` with the per-role lucide icon, using the Email row's markup.

## Phases at a Glance

| Phase                            | What it delivers                                                    | Key risk                                                     |
| -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Role read and Details field   | Role visible and read-only above Email for a real user              | Accidentally giving the input a `name` would put it in the POST |
| 2. Browser and visual coverage   | Trainee e2e check + trainee/trainer kitchen-sink reference          | Kitchen-sink markup tripping `check:home-tokens`             |

**Prerequisites:** S-35 (Profile tabs, Details form) is done. For e2e, local Supabase is running.
**Estimated effort:** about 1 session across 2 small phases.

## Open Risks & Assumptions

- The DB constrains `profiles.role` to trainee or trainer, so the omitted-row branch is defensive only.
- Hydration: the Role row renders on the server too, so the e2e check needs no hydration retry.

## Success Criteria (Summary)

- A trainee and a trainer each see their role, with the matching icon, above Email in Details.
- The role can't be edited or submitted through Details.
- Unit, e2e, lint, type check, build and token checks are green.
