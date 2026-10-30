# Read-only Role in Profile → Details Implementation Plan

## Overview

Show the signed-in user's app role, Trainee or Trainer, in a read-only field above Email in Profile → Details. The field looks exactly like the Email field and carries the role icon the app already uses in Hub → Collaborations. Roadmap S-44 (MS-35).

## Current State Analysis

- Details renders Email as a muted, `readOnly`, unnamed `Input` with a lucide `Mail` icon absolutely positioned on the left (`src/components/profile/ProfileDetailsForm.tsx:88-98`). Because it has no `name`, it never reaches `POST /api/profile`.
- `src/pages/profile.astro:15-27` builds `ProfileDetails` from the session email plus `readProfileNames` (`src/lib/services/profile-details.ts:7-26`), which selects only `first_name, last_name`. A failed read sets `unavailable`, shows the error and disables the fields and Save.
- The role lives on `profiles.role`. `readTopbarProfile` (`src/lib/services/profile-details.ts:56-82`) already reads it for the top bar and narrows any value outside `"trainee" | "trainer"` to `null`, but that read happens inside `Topbar.astro` and the page cannot reuse it.
- `readProfileNames` is also used by `src/pages/profile/avatar.astro:25`, which needs only the names.
- Role icons already exist: in Hub → Collaborations (`src/components/hub/CollaborationsList.astro:34`, `src/pages/kitchen-sink/hub.astro:216`) `PersonStanding` stands for Trainee and `Dumbbell` for Trainer.
- Unit tests cover pure modules in `src/lib/*.test.ts` (e.g. `profile-form.test.ts`). `src/lib/services/` has no tests.
- E2E (`tests/e2e/`) runs as one throwaway **trainee** only, so a trainer cannot be covered in the browser.
- No kitchen sink renders the Details form. `/kitchen-sink/home` already holds the `/profile` top-bar states (`src/pages/kitchen-sink/home.astro:121-135`) and is checked by `check:home-tokens`.

## Desired End State

On `/profile` a trainee sees a **Role** field reading "Trainee" with a `PersonStanding` icon, and a trainer sees "Trainer" with a `Dumbbell` icon. The field sits directly above Email and has the same muted read-only style. It has no `name`, so the Details POST never carries it, and the role comes only from the server-side profile row. When the role cannot be read, or is not trainee or trainer, the Role row is omitted and the rest of Details behaves as it does today.

### Key Discoveries:

- Email row pattern to mirror: `src/components/profile/ProfileDetailsForm.tsx:88-98`.
- Role narrowing precedent: `src/lib/services/profile-details.ts:71`.
- Role icon precedent: `src/components/hub/CollaborationsList.astro:34`.
- The Details POST handler validates only the names (`src/lib/profile-form.ts`, `src/pages/api/profile/index.ts`). This change does not touch it.

## What We're NOT Doing

- No way to change the role, and no role in `POST /api/profile` or its zod schema.
- No schema or migration change.
- No change to the top bar, the greeting copy (`src/lib/topbar.ts`) or `readTopbarProfile`.
- No change to `/profile/avatar` or its use of `readProfileNames`.
- No new wording such as "Account type". The label is "Role" and the values are "Trainee" and "Trainer".
- No placeholder ("—") and no `unavailable` state for an unknown role value. The row is simply omitted.
- No browser test for a trainer, because the e2e environment has only a trainee. The kitchen sink is the trainer's visual reference.

## Implementation Approach

Add a small pure module for the role's parsing and display copy so it can be unit-tested. Add a page-specific read that returns names and role from the one `profiles` row in a single query. Thread an optional `role` prop through `profile.astro` into `ProfileDetailsForm`, which renders the Role row above Email using the Email row's markup and picks the icon per role. Then add a browser check and a kitchen-sink section.

## Phase 1: Role read and Details field

### Overview

Load the role on `/profile` and render it as a read-only, unnamed field above Email.

### Changes Required:

#### 1. Role helper

**File**: `src/lib/profile-role.ts` (new), `src/lib/profile-role.test.ts` (new)

**Intent**: One place that narrows a raw `profiles.role` value to the app role and returns its display copy, so the read and the form agree and the mapping is unit-tested.

**Contract**: `parseProfileRole(value: unknown): Profile["role"] | null` returns `"trainee"`/`"trainer"` and `null` for anything else. `profileRoleLabel(role: Profile["role"]): "Trainee" | "Trainer"`. Tests cover both roles, plus `null`, `undefined`, `""` and `"admin"` → `null`.

#### 2. Profile Details read

**File**: `src/lib/services/profile-details.ts`, `src/types.ts`

**Intent**: Give `/profile` the names and the role from a single `profiles` read. `readProfileNames` stays as it is for the avatar page.

**Contract**: new `readProfileDetails(supabase, userId): Promise<{ names: ProfileNames; role: Profile["role"] | null } | null>`. It selects `first_name, last_name, role` and returns `null` on error or a missing row, the same failure semantics as `readProfileNames`. The role goes through `parseProfileRole`. Add `role: Profile["role"] | null` to `ProfileDetails` in `src/types.ts`. Optionally switch `readTopbarProfile`'s inline narrowing to `parseProfileRole`, with no behaviour change.

#### 3. Profile page

**File**: `src/pages/profile.astro`

**Intent**: Use the new read and pass the role to the form. A failed read keeps today's `unavailable` path, and `role` stays `null`.

**Contract**: `details.role` is set from `readProfileDetails`, and `<ProfileDetailsForm role={details.role} … />`.

#### 4. Role row in the form

**File**: `src/components/profile/ProfileDetailsForm.tsx`

**Intent**: Render a Role row directly above Email, with the same markup and classes (muted label, left icon span, `Input` with `readOnly` and `bg-muted text-muted-foreground pl-10`) and no `name` attribute. The icon is `PersonStanding` for a trainee and `Dumbbell` for a trainer. When `role` is `null`, render nothing. The row sits outside the `disabled` fieldsets, like Email.

**Contract**: new prop `role?: Profile["role"] | null`. Input `id="role"`, `<Label htmlFor="role">Role</Label>`, `value={profileRoleLabel(role)}`, no `name`.

### Success Criteria:

#### Automated Verification:

- Unit tests pass, including the new `profile-role.test.ts`: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`

#### Manual Verification:

- Signed in as a trainee, `/profile` shows Role "Trainee" with the PersonStanding icon directly above Email, styled the same as Email and not editable
- Saving names still works, and the DevTools request payload contains only `firstName` and `lastName`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Browser and visual coverage

### Overview

Prove the trainee case in the browser and give both roles a visual reference.

### Changes Required:

#### 1. Playwright check

**File**: `tests/e2e/profile-details.spec.ts` (new)

**Intent**: Signed in as the e2e trainee, `/profile` shows a Role field with value "Trainee" that is read-only, has no `name` attribute, and comes before Email in document order.

**Contract**: locate the field by `getByLabel("Role")` and assert `toHaveValue("Trainee")`, `toHaveAttribute("readonly")` and no `name`. Check the order by comparing positions with the `getByLabel("Email")` input, for example through `compareDocumentPosition` or bounding-box `y`. Follow the existing spec style (header comment, `@playwright/test`).

#### 2. Kitchen-sink section

**File**: `src/pages/kitchen-sink/home.astro`

**Intent**: Add a "Profile details" section that renders `ProfileDetailsForm` for trainee Ada Lovelace (`role: "trainee"`) and for a trainer (`role: "trainer"`), each with a one-line caption naming the icon. It uses only role tokens so `check:home-tokens` stays green.

**Contract**: new `<section aria-labelledby="state-profile-details">` following the existing section pattern. `ProfileDetailsForm` is rendered with `client:load`, a static email and names, and no session read.

### Success Criteria:

#### Automated Verification:

- New spec passes: `npx playwright test tests/e2e/profile-details.spec.ts`
- Home token check passes: `npm run check:home-tokens`
- Lint passes: `npm run lint`
- Build passes: `npm run build`

#### Manual Verification:

- `/kitchen-sink/home` shows Details for a trainee (PersonStanding, "Trainee") and a trainer (Dumbbell, "Trainer"), both matching the Email field's look in light and dark themes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human.

---

## Testing Strategy

### Unit Tests:

- `parseProfileRole`: trainee, trainer, null, undefined, empty string, unknown string.
- `profileRoleLabel`: trainee → "Trainee", trainer → "Trainer".

### Integration Tests:

- Playwright: the trainee sees a read-only, unnamed Role "Trainee" above Email on `/profile`.

### Manual Testing Steps:

1. Sign in as a trainee, open Profile → Details, and check the Role row, its icon, its style and its position.
2. Edit a name and Save. Confirm the payload has only the names and the notice appears.
3. Open `/kitchen-sink/home` and compare the trainee and trainer rows in both themes.

## Performance Considerations

None. The page still makes one `profiles` read, now with one more column.

## Migration Notes

None. `profiles.role` already exists.

## References

- Roadmap item: `context/foundation/roadmap.md` S-44 (MS-35), issue #165
- Email row pattern: `src/components/profile/ProfileDetailsForm.tsx:88-98`
- Role icons: `src/components/hub/CollaborationsList.astro:34`
- Role narrowing: `src/lib/services/profile-details.ts:71`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Role read and Details field

#### Automated

- [x] 1.1 Unit tests pass, including the new `profile-role.test.ts`: `npm test` — 786c13c
- [x] 1.2 Lint passes: `npm run lint` — 786c13c
- [x] 1.3 Type check passes: `npx astro check` — 786c13c
- [x] 1.4 Build passes: `npm run build` — 786c13c

#### Manual

- [x] 1.5 Signed in as a trainee, `/profile` shows Role "Trainee" with the PersonStanding icon directly above Email, styled the same as Email and not editable — 786c13c
- [x] 1.6 Saving names still works, and the DevTools request payload contains only `firstName` and `lastName` — 786c13c

### Phase 2: Browser and visual coverage

#### Automated

- [x] 2.1 New spec passes: `npx playwright test tests/e2e/profile-details.spec.ts`
- [x] 2.2 Home token check passes: `npm run check:home-tokens`
- [x] 2.3 Lint passes: `npm run lint`
- [x] 2.4 Build passes: `npm run build`

#### Manual

- [x] 2.5 `/kitchen-sink/home` shows Details for a trainee (PersonStanding, "Trainee") and a trainer (Dumbbell, "Trainer"), both matching the Email field's look in light and dark themes
