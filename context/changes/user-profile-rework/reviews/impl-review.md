<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Avatar menu with Profile Details and Settings

- **Plan**: context/changes/user-profile-rework/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-26
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

Success criteria on HEAD (fbccf03): `npm test` 147 passed, `check:home-tokens` clean, `astro check` 0 errors, `lint` clean, `smoke` all steps passed, `playwright` 9 passed. `npx supabase db reset` and `npm run migration-check` passed during Phase 1 and were not re-run, because they wipe local data and the migration has not changed since. Manual rows 1.7, 2.7, 2.8 and 3.8–3.11 were confirmed by the user during implementation.

## Findings

### F1 — Profile read failure shows blank names that Save then wipes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/profile.astro:16-24
- **Detail**: `/profile` can fail to load the names in two ways: `createClient` returns null, or `readProfileNames` returns null after a Supabase error. In both cases `details` keeps `firstName: null, lastName: null` and the form renders empty fields with no message. If the user then clicks Save, `updateProfileNames` writes null to both columns. A temporary read failure becomes data loss.
- **Fix**: When the read fails for a signed-in user, pass `serverError = PROFILE_UNAVAILABLE_ERROR` and make the form read-only, i.e. disable Save via a new `unavailable` prop on `ProfileDetailsForm`.
  - Strength: The form never presents blank fields as if they were the saved state. It reuses the existing error copy and toast path.
  - Tradeoff: One new prop and a small branch in the page. The same Supabase outage already breaks the top bar role read anyway.
  - Confidence: HIGH — the path is fully visible in profile.astro and profile-details.ts.
  - Blind spot: No test for the read-failure branch. Simulating a Supabase failure in smoke is not practical.
- **Decision**: FIXED — on read failure, profile.astro sets `unavailable` and shows PROFILE_UNAVAILABLE_ERROR; ProfileDetailsForm wraps the fields and Save in `<fieldset disabled>` and its submit handler returns early.

### F2 — `ProfileNames` type lives outside `src/types.ts`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/profile-form.ts:12-15
- **Detail**: CLAUDE.md puts shared entity/DTO types in `src/types.ts`. `ProfileNames` is shared by the service, the API route, the form and the top bar, but it is defined in `lib/profile-form.ts`, next to the sibling `ProfileDetails` that already sits in `src/types.ts`.
- **Fix**: Define `ProfileNames = Pick<ProfileDetails, "firstName" | "lastName">` in `src/types.ts` and import it from `@/types`.
- **Decision**: FIXED — ProfileNames moved to src/types.ts as a Pick of ProfileDetails; profile-form.ts and profile-details.ts import it from @/types.

### F3 — Unused shadcn exports in avatar.tsx and tabs.tsx

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/ui/avatar.tsx:86, src/components/ui/tabs.tsx:68
- **Detail**: The plan names `Avatar`/`AvatarFallback`. The generated file also exports `AvatarImage`, `AvatarBadge`, `AvatarGroup` and `AvatarGroupCount`, and tabs exports `tabsListVariants` and an unused "line" variant. This is stock shadcn output, it is harmless, and nothing uses it.
- **Fix**: Keep as generated (shadcn convention), or trim the unused exports if the project prefers lean ui files.
- **Decision**: SKIPPED — keep the stock shadcn output.

### F4 — Signed-in pages read the same profile row two or three times

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/Topbar.astro:29, src/pages/profile.astro:19
- **Detail**: Every signed-in page runs `readProfileRole` and `readProfileNames` in parallel against the same `profiles` row. `/profile` reads the names a third time. The plan's Performance Considerations accepted this, with a merge as the follow-up if it shows up.
- **Fix**: Leave for now; merge into one `select("role, first_name, last_name")` if latency shows up.
- **Decision**: FIXED — new readTopbarProfile (one select of role, first_name, last_name) in src/lib/services/profile-details.ts replaces the parallel readProfileRole + readProfileNames in Topbar.astro. readProfileRole is unchanged for the API routes. /profile still reads the names once more for its form.

### F5 — Direct PostgREST callers can store untrimmed names

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261026120000_profile_names.sql:5-9
- **Detail**: The DB check enforces only length 1–50. Someone calling PostgREST directly with their own JWT can store `" "` or padded names on their own row. The app trims, and `avatarInitials` trims, so rendering degrades gracefully. The only effect is on that user's own data.
- **Fix**: Optionally add `check (first_name = btrim(first_name))` (same for `last_name`) in a later additive migration.
- **Decision**: SKIPPED — only affects the user's own row; the app and initials trim.

### F6 — database.types.ts regenerated with a newer CLI format

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/db/database.types.ts
- **Detail**: Besides the two new columns, the regeneration added `ComputedFields: never` to every table and reflowed some types. This is generator output from Supabase CLI v2.121.0. It is diff noise only, and astro check passes.
- **Fix**: Accept as is; future `npm run db:types` runs will produce the same shape.
- **Decision**: ACCEPTED — generator output from the current Supabase CLI.
