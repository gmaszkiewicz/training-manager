# Auth sign-in form Implementation Plan

## Overview

Sign-in, registration, and email confirmation use the same role tokens as the public home, on the existing `div` panel. Shared fields, errors, and the submit button switch to those tokens, and the journal form gets a light surface so it stays readable inside the untouched dashboard shell.

## Current State Analysis

`/auth/signin`, `/auth/signup`, and `/auth/confirm-email` still render the starter glass card: `bg-cosmic` on the page, `border-white/10 bg-white/10 text-white` on the panel, and a blue-to-purple heading. Role tokens already live in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`). The public home reads them. These three screens do not, so editing `--primary` does not change them.

`FormField`, `ServerError`, and `SubmitButton` are shared with `MeasurementForm`. The dashboard page still wraps that form in `bg-cosmic` and a glass card (`src/pages/dashboard.astro:73-74`). `MeasurementForm` also paints its own date input, note textarea, and `FieldError` with white, blue, and red palette classes. `src/components/ui` has `Button` and does not have Input, Label, or Card. `SubmitButton` imports `Button` and then overrides it with `bg-purple-600`.

`npm run check:home-tokens` scans five home files and already runs in CI. A palette class on the auth screens leaves that check green. `CLAUDE.md` already names the token source, `src/components/ui`, and `/kitchen-sink/home`. No view adds the `dark` class.

## Desired End State

A visitor on `/auth/signin`, `/auth/signup`, or `/auth/confirm-email` sees a light card on the page background, the same contract as the public home. Headings are not a gradient. Links use `primary`. Fields, the password control, errors, and the submit button use role tokens and shared components. Keyboard focus uses `--ring`. An empty email still says "Email is required". The password control still exposes "Show password" and "Hide password".

The dashboard shell, its heading, and the measurement list stay on the cosmic glass card. The journal form itself sits on a light `bg-card` surface, including the date, the note, and field errors, so those controls stay readable.

Verify by reading the three auth routes, submitting an empty sign-in email, tabbing through the sign-in controls, and reading the journal form on `/dashboard` beside the still-dark list. The kitchen sink at `/kitchen-sink/auth` shows the seven sign-in states.

### Key Discoveries:

- `Button` already defines `bg-primary`, `hover:bg-primary/90`, `disabled:opacity-50`, and `focus-visible:ring-ring/50` (`src/components/ui/button.tsx:8-13`). The purple classes on `SubmitButton` are an override.
- `bg-cosmic` is a hex utility (`src/styles/global.css:113-115`). Dashboard still depends on it (`src/pages/dashboard.astro:73`). The auth pages must stop using it. The utility stays.
- `MeasurementForm` local controls use `text-white` and `text-blue-100/80` (`src/components/measurements/MeasurementForm.tsx:18`, `src/components/measurements/MeasurementForm.tsx:119`). A light card behind those classes would hide the date and the note.
- `accent-purple-400` on the role radios sits outside the token-check pattern (`src/components/auth/SignUpForm.tsx:152`, `src/components/auth/SignUpForm.tsx:168`). The scan going to zero does not remove it.
- The repo has no screenshot test. The home visual gate is `/kitchen-sink/home`, and that file is not in the token check because quoted class names would fail the regex.

## What We're NOT Doing

- Editing `:root`, `.dark`, or `@utility bg-cosmic`.
- Adding Card, adding a radio-group component, or running `shadcn init`.
- Restyling `src/pages/dashboard.astro`, `src/components/measurements/MeasurementList.astro`, or the public home.
- Adding a dark-mode toggle. No view sets `dark` today.
- Changing auth API routes, validation rules, redirects, field names, or visible copy. The confirm-email envelope character stays.
- Installing Playwright or a new lint dependency.
- Putting the kitchen sink, the dashboard shell, or the measurement list on the token check.

## Implementation Approach

Extend the system the home already uses. Phase 1 adds Input and Label through the shadcn CLI. Phase 2 records the existing roles and does not change their values. Phase 3 moves the three copied shells and the shared controls onto those roles in one step, and gives `MeasurementForm` a light surface so the journal does not inherit a dark parent. Signup radios stay native and use `accent-primary`. Phase 4 adds `/kitchen-sink/auth` and extends the existing home token check to the cleaned files.

Charge map: shell tokens, field and focus tokens, and the submit override land in Phase 3. The missing Input and Label land in Phase 1 and are used in Phase 3. Card is the deferred half of the raw-panel charge, because this plan keeps a `div`. The shared-field constraint lands in Phase 3. The home-only check lands in Phase 4.

## Critical Implementation Details

- **Same-phase journal surface** — `FormField` labels become `text-muted-foreground` and inputs become light role colors in Phase 3. `MeasurementForm`'s date, note, and `FieldError` have to move in that same phase. Leaving them on `text-white` puts white text on the new `bg-card`.
- **shadcn must not rewrite tokens** — `npx shadcn@latest add` is allowed to add Input, Label, and the dependencies those two need. If it edits `src/styles/global.css`, restore `:root`, `.dark`, and `@utility bg-cosmic` before the phase ends.
- **Pending preview is sink-only** — `SubmitButton` learns `forcePending` so the kitchen sink can show disabled and loading without a request. Sign-in, sign-up, and the journal form do not pass it. Live pending still comes from `useFormStatus`.

## Phase 1: Library

### Overview

Add the missing field primitives. Do not add a panel primitive.

### Changes Required:

#### 1. Input and Label

**File**: `src/components/ui/input.tsx`

**Intent**: The auth fields and the journal fields need one Input and one Label from this repo's system, instead of a native input with palette classes.

**Contract**: Add Input and Label with `npx shadcn@latest add`, using the existing `components.json` (`style` `new-york`, `cssVariables` true, `ui` alias `@/components/ui`). Do not run `shadcn init`. Do not add `card` or `radio-group`. Do not edit `:root`, `.dark`, or `@utility bg-cosmic`. Dependency updates required by Input or Label may change `package.json`. No other dependencies. The new files live at `src/components/ui/input.tsx` and `src/components/ui/label.tsx`.

### Success Criteria:

#### Automated Verification:

- `src/components/ui/input.tsx` and `src/components/ui/label.tsx` exist
- `src/components/ui/card.tsx` does not exist
- `npm run lint` passes

#### Manual Verification:

- Input and Label use the existing CSS variables and do not introduce a second palette

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Tokens

### Overview

Name the roles this change will read. Leave the values where they are.

### Changes Required:

#### 1. Token deposit

**File**: `context/changes/auth-signin-form/tokens.md`

**Intent**: The next session must reuse the home's roles instead of inventing colors for the auth card.

**Contract**: List `background`, `foreground`, `card`, `card-foreground`, `muted-foreground`, `primary`, `primary-foreground`, `destructive`, `border`, `input`, and `ring`. State that the values are the current ones in `src/styles/global.css` (`:root`, `.dark`, `@theme inline`) and that this change does not edit them. Do not modify `src/styles/global.css`.

### Success Criteria:

#### Automated Verification:

- `context/changes/auth-signin-form/tokens.md` lists `background`, `foreground`, `card`, `card-foreground`, `muted-foreground`, `primary`, `primary-foreground`, `destructive`, `border`, `input`, and `ring`, and states those values stay in `src/styles/global.css`
- `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged

#### Manual Verification:

- The listed roles are the ones the auth panel, fields, errors, and submit button will use

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: View

### Overview

Move the three auth shells and the shared controls onto the recorded roles, and put the journal form on a light surface in the same change.

### Changes Required:

#### 1. Auth shells

**File**: `src/pages/auth/signin.astro`

**Intent**: The person signing in, registering, or confirming email sees the home's light card instead of the glass panel.

**Contract**: Apply the same shell to `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, and `src/pages/auth/confirm-email.astro`. Keep the outer centering wrapper (`flex`, `min-h-screen`, `items-center`, `justify-center`, `p-4`) and remove `bg-cosmic`. Keep the inner element a `div`. Replace `border-white/10 bg-white/10 text-white backdrop-blur-xl` with `border-border bg-card text-card-foreground`. Keep each page's existing max width and padding. Replace the gradient heading with `text-card-foreground`. Helper copy uses `text-muted-foreground`. The sign-up link, the sign-in link, and "Back to sign in" use `text-primary`, `hover:underline`, `focus-visible:ring-2`, and `focus-visible:ring-ring`. Confirm-email body copy uses `text-muted-foreground`. The envelope character stays. Do not add Card. Do not change titles, form islands, or the `error` query prop.

#### 2. Shared field

**File**: `src/components/auth/FormField.tsx`

**Intent**: Email, password, and journal measurements use Input and Label, so focus and errors come from roles instead of purple and red glass.

**Contract**: Keep the existing props so `SignInForm`, `SignUpForm`, and `MeasurementForm` do not change their data flow. Render `Label` from `@/components/ui/label` with `text-muted-foreground`. Render `Input` from `@/components/ui/input`. Do not pass palette classes or arbitrary sizes. The icon uses `text-muted-foreground`. When `endContent` is present, the Input also uses `pr-14`, which clears a `size-9` control sitting at `right-3`. Fields with no `endContent` do not get that padding. An error sets `aria-invalid` and a destructive border and ring from the `destructive` role, and the message stays next to the field with `CircleAlert` and `text-destructive`. Focus comes from Input's `focus-visible` ring (`--ring`), not from `focus:ring-purple-400` or `focus:outline-none`. Placeholder uses `muted-foreground`.

#### 3. Submit button

**File**: `src/components/auth/SubmitButton.tsx`

**Intent**: The submit control is the shared Button. The starter purple paint and the white spinner stop covering it.

**Contract**: Keep `type="submit"` and `useFormStatus`. `className` may set `w-full` only. Remove `bg-purple-600`, `text-white`, `hover:bg-purple-500`, and the extra radius and padding overrides. The spinner uses `border-primary-foreground` and `border-primary-foreground/30`, not `border-white`. Add optional `forcePending?: boolean`. When it is true, the button is disabled and shows `pendingText` plus the spinner. When it is omitted, pending still comes only from `useFormStatus`. Callers in `SignInForm`, `SignUpForm`, and `MeasurementForm` do not pass `forcePending`.

#### 4. Server error

**File**: `src/components/auth/ServerError.tsx`

**Intent**: A failed sign-in or a failed measurement save is a destructive message, not a red glass bar.

**Contract**: Keep the `message` prop and the null render. The box uses `border-destructive`, `bg-destructive/10`, and `text-destructive`, plus the existing icon and message. No `red-*` or `white` classes.

#### 5. Password toggle

**File**: `src/components/auth/PasswordToggle.tsx`

**Intent**: Show and hide password keeps its name and gains the shared button's focus ring.

**Contract**: Render `Button` from `@/components/ui/button` with `type="button"`, `variant="ghost"`, and `size="icon"`. Keep `aria-label` as "Hide password" when visible and "Show password" otherwise. Positioning classes may stay absolute at `right-3`. The Input's `pr-14` is what keeps the password value visible beside this `size-9` control. Do not pass palette color classes.

#### 6. Sign-up extras

**File**: `src/components/auth/SignUpForm.tsx`

**Intent**: The password hint, the role legend, and the role error sit on the same light card as the fields. The radios stop using a purple accent.

**Contract**: Keep the POST to `/api/auth/signup`, the role values, and the validation. The password hint uses `text-muted-foreground`. The legend uses `text-muted-foreground`. The radio labels use `text-card-foreground`. Both radios use `accent-primary`, `focus-visible:ring-2`, and `focus-visible:ring-ring`. The role error uses `text-destructive` and keeps its message. Do not add a radio-group component. `SignInForm` keeps its POST to `/api/auth/signin`, its validation copy, and its field composition. Do not add palette classes there.

#### 7. Journal form surface

**File**: `src/components/measurements/MeasurementForm.tsx`

**Intent**: The shared light fields need a light parent. The dashboard page shell stays dark, so the form supplies that parent itself.

**Contract**: Wrap the form's contents in a surface of `bg-card text-card-foreground border-border` with existing radius and padding utilities. Do not edit `src/pages/dashboard.astro` or `src/components/measurements/MeasurementList.astro`. Date and note labels use `text-muted-foreground`. The date input and the note textarea use role classes only: `bg-background`, `text-foreground`, `border-input`, `placeholder:text-muted-foreground`, `focus-visible:ring-2`, and `focus-visible:ring-ring`. Drop `scheme-dark`, `bg-white/10`, `text-white`, and the purple and red focus rings. Error state uses `border-destructive` and `FieldError` uses `text-destructive`. Do not add a Textarea component. Measurement create, field names, and validation stay.

The ten files this phase leaves clean for the later check are `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`, `src/components/auth/SignInForm.tsx`, `src/components/auth/SignUpForm.tsx`, `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`, `src/components/auth/PasswordToggle.tsx`, and `src/components/measurements/MeasurementForm.tsx`.

### Success Criteria:

#### Automated Verification:

- The hardcoded-value scan returns no matches on the ten files named in this phase
- `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, and `src/pages/auth/confirm-email.astro` do not contain `bg-cosmic`, and `accent-purple-400` does not appear under `src/components/auth` or `src/pages/auth`
- `src/pages/dashboard.astro` still contains `bg-cosmic`, and `src/components/measurements/MeasurementList.astro` is unchanged
- Sign-in still posts to `/api/auth/signin` and sign-up still posts to `/api/auth/signup`
- `npm run lint` passes

#### Manual Verification:

- `/auth/signin`, `/auth/signup`, and `/auth/confirm-email` show a light card on the page background, with no glass panel and no gradient heading
- Submitting an empty email on `/auth/signin` shows "Email is required" in the destructive role, and the password control still exposes Show password / Hide password
- On `/dashboard`, the journal form is readable on its light surface, and the heading plus measurement list stay on the dark shell

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: States

### Overview

Show the seven sign-in states on a kitchen sink, and make the existing token check fail if those screens grow a palette class again.

### Changes Required:

#### 1. Auth kitchen sink

**File**: `src/pages/kitchen-sink/auth.astro`

**Intent**: Review can see every sign-in state without a screenshot tool, including the states the happy path never hits.

**Contract**: Public route `/kitchen-sink/auth`. Do not add it to `PROTECTED_ROUTES` in `src/middleware.ts`. Do not link it from the bar or the home. Render it with `bg-background text-foreground`. Sections, in order:

- **Default** — the sign-in shell and one `SignInForm` with `client:load` and no server error, plus the confirm-email shell (envelope, heading, body, "Back to sign in"). This is the only sign-in form on the page.
- **Hover** — state that submit uses Button `hover:bg-primary/90`, and that the auth text links use `hover:underline`.
- **Focus-visible** — the email field, password toggle, submit button, sign-up link, and confirm-email link from that single form are present to tab through. The ring is the shared `--ring`, not a purple ring.
- **Disabled** — `SubmitButton` with `forcePending` so the control is disabled.
- **Error** — `FormField` with `id="sink-email"`, error "Email is required", and `ServerError` with a non-empty message. Do not reuse `id="email"` or `id="password"`.
- **Empty** — no second form. Say on the page that empty for this form is the blank email and password in the Default section.
- **Loading** — `SubmitButton` with `forcePending` showing "Signing in..." and the spinner.

On the confirm-email portion, mark these as N/A with these reasons, in the page: disabled, because the page has no control to disable; error, because the page has no error slot; empty, because the page has no data list; loading, because the page has no pending state. Hover and focus-visible for that page are the "Back to sign in" link. Do not quote palette class names or `ring-[3px]` in the page text. The sink is not one of the scanned files.

#### 2. Token check

**File**: `scripts/check-home-tokens.mjs`

**Intent**: A palette class on the cleaned auth screens or the journal form fails the check that CI already runs.

**Contract**: Append the ten files named in Phase 3 to the existing `FILES` list. Do not add `src/pages/kitchen-sink/auth.astro`, `src/pages/kitchen-sink/home.astro`, `src/pages/dashboard.astro`, `src/components/measurements/MeasurementList.astro`, `src/styles/global.css`, or files under `src/components/ui`. Keep the script name, the npm script `check:home-tokens`, and the existing `.github/workflows/ci.yml` step. Do not add a second checker and do not add a lint dependency.

#### 3. Rule

**File**: `CLAUDE.md`

**Intent**: The next agent can find the auth sink next to the home sink.

**Contract**: In the existing UI block, add that the auth kitchen sink is `/kitchen-sink/auth`. Keep the current sentences about `src/styles/global.css`, `src/components/ui`, `npx shadcn@latest add`, literal colours, and `/kitchen-sink/home`. Do not create a second rules file.

### Success Criteria:

#### Automated Verification:

- `src/pages/kitchen-sink/auth.astro` exists, `PROTECTED_ROUTES` in `src/middleware.ts` does not include it, and no bar or home component links to `/kitchen-sink/auth`
- `npm run check:home-tokens` exits 0, and `scripts/check-home-tokens.mjs` lists the ten Phase 3 files and does not list the kitchen sink, `dashboard.astro`, or `MeasurementList.astro`
- `.github/workflows/ci.yml` still runs `npm run check:home-tokens`
- `CLAUDE.md` names `/kitchen-sink/auth` beside `/kitchen-sink/home`
- `npm run lint` passes

#### Manual Verification:

- `/kitchen-sink/auth` shows default, hover, focus-visible, disabled, error, empty, and loading for sign-in, and marks confirm-email disabled, error, empty, and loading as N/A with the reasons in this plan
- The sink is readable at a desktop width and at one mobile width
- Tabbing the sign-in controls shows a visible focus ring on the email field, the password toggle, the submit button, and the sign-up link

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- No new unit test is required for this visual change. Existing validation copy and POST targets stay.

### Integration Tests:

- `npm run check:home-tokens` is the regression check for palette classes on the ten cleaned files.
- `npm run lint` covers the new Input, Label, and the kitchen sink.

### Manual Testing Steps:

1. Open `/auth/signin`, `/auth/signup`, and `/auth/confirm-email` and confirm each is a light card on the page background.
2. Submit `/auth/signin` with an empty email and confirm "Email is required".
3. Tab from the email field through the password toggle, the submit button, and the sign-up link, and confirm each focus ring is visible.
4. Open `/dashboard` signed in as a trainee and confirm the journal form is readable on a light surface while the heading and the list stay on the dark shell.
5. Open `/kitchen-sink/auth` at a desktop width and at one narrow width.

## Performance Considerations

No new requests, caches, or data loading. The auth and measurement posts stay as they are.

## Migration Notes

No schema change and no stored data change. The previous dashboard shell keeps working because `bg-cosmic` is not edited. The journal form's light surface is an interim look until a later slice restyles that shell.

## References

- Related research: `context/changes/auth-signin-form/research.md`
- Roadmap slice: `context/foundation/roadmap.md` (S-08, Change ID `auth-signin-form`, MS-02)
- Similar implementation: `context/archive/2026-09-29-product-home/plan.md`
- Token source: `src/styles/global.css:6-39`, `src/styles/global.css:41-73`, `src/styles/global.css:113-115`
- Shared button: `src/components/ui/button.tsx:8-13`
- Token check: `scripts/check-home-tokens.mjs:7-13`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Library

#### Automated

- [x] 1.1 `src/components/ui/input.tsx` and `src/components/ui/label.tsx` exist — be93c8e
- [x] 1.2 `src/components/ui/card.tsx` does not exist — be93c8e
- [x] 1.3 `npm run lint` passes — be93c8e

#### Manual

- [ ] 1.4 Input and Label use the existing CSS variables and do not introduce a second palette

### Phase 2: Tokens

#### Automated

- [x] 2.1 `context/changes/auth-signin-form/tokens.md` lists `background`, `foreground`, `card`, `card-foreground`, `muted-foreground`, `primary`, `primary-foreground`, `destructive`, `border`, `input`, and `ring`, and states those values stay in `src/styles/global.css` — d67949e
- [x] 2.2 `:root`, `.dark`, and `@utility bg-cosmic` in `src/styles/global.css` are unchanged — d67949e

#### Manual

- [ ] 2.3 The listed roles are the ones the auth panel, fields, errors, and submit button will use

### Phase 3: View

#### Automated

- [x] 3.1 The hardcoded-value scan returns no matches on the ten files named in this phase
- [x] 3.2 `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, and `src/pages/auth/confirm-email.astro` do not contain `bg-cosmic`, and `accent-purple-400` does not appear under `src/components/auth` or `src/pages/auth`
- [x] 3.3 `src/pages/dashboard.astro` still contains `bg-cosmic`, and `src/components/measurements/MeasurementList.astro` is unchanged
- [x] 3.4 Sign-in still posts to `/api/auth/signin` and sign-up still posts to `/api/auth/signup`
- [x] 3.5 `npm run lint` passes

#### Manual

- [x] 3.6 `/auth/signin`, `/auth/signup`, and `/auth/confirm-email` show a light card on the page background, with no glass panel and no gradient heading
- [x] 3.7 Submitting an empty email on `/auth/signin` shows "Email is required" in the destructive role, and the password control still exposes Show password / Hide password
- [x] 3.8 On `/dashboard`, the journal form is readable on its light surface, and the heading plus measurement list stay on the dark shell

### Phase 4: States

#### Automated

- [ ] 4.1 `src/pages/kitchen-sink/auth.astro` exists, `PROTECTED_ROUTES` in `src/middleware.ts` does not include it, and no bar or home component links to `/kitchen-sink/auth`
- [ ] 4.2 `npm run check:home-tokens` exits 0, and `scripts/check-home-tokens.mjs` lists the ten Phase 3 files and does not list the kitchen sink, `dashboard.astro`, or `MeasurementList.astro`
- [ ] 4.3 `.github/workflows/ci.yml` still runs `npm run check:home-tokens`
- [ ] 4.4 `CLAUDE.md` names `/kitchen-sink/auth` beside `/kitchen-sink/home`
- [ ] 4.5 `npm run lint` passes

#### Manual

- [ ] 4.6 `/kitchen-sink/auth` shows default, hover, focus-visible, disabled, error, empty, and loading for sign-in, and marks confirm-email disabled, error, empty, and loading as N/A with the reasons in this plan
- [ ] 4.7 The sink is readable at a desktop width and at one mobile width
- [ ] 4.8 Tabbing the sign-in controls shows a visible focus ring on the email field, the password toggle, the submit button, and the sign-up link
