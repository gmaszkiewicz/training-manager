<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Avatar tab in Profile

- **Plan**: context/changes/avatar-select/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-10-26
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS (1 observation) |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS (1 observation) |
| Success Criteria | PASS (1 observation) |

## Automated verification (re-run 2026-10-26)

| Command | Result |
|---|---|
| `npm test` | PASS: 172 tests in 12 files |
| `npm run lint` | PASS |
| `npx astro check` | PASS: 0 errors, 0 warnings, 0 hints |
| `npm run check:home-tokens` | PASS |
| `npm run build` | PASS |
| `npm run migration-check` | PASS: `20261026150000_profile_avatar.sql` applied |
| `npm run db:types` | PASS: no diff |
| `npm run smoke` | PASS: all steps, including the 9 avatar checks |
| `npx playwright test` | PASS: 10/10 |

`migration-check` resets the local DB and deletes the local e2e user. Playwright passed once that user was recreated the way CI creates it. This is an environment issue, not a code defect.

## Findings

### F1 — Avatar API reads the whole request body before checking its size

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/profile/avatar.ts:23-37
- **Detail**: `request.formData()` reads the entire multipart body into memory, and only then does `parseAvatarFile` enforce the 2 MB limit. A signed-in user can send a body up to Cloudflare's request limit (about 100 MB) into a Worker that has 128 MB of memory. The risk is limited: anonymous requests are rejected first, and `api/profile/index.ts` uses the same pattern. But this is the first endpoint that is designed to receive large bodies.
- **Fix**: Before calling `formData()`, reject the request when `Content-Length` is missing or larger than `AVATAR_MAX_BYTES + 64 KB`, redirecting to `?error=avatar-large`. Add a smoke check for it.
  - Strength: One cheap header check at the boundary stops oversized bodies before they are buffered.
  - Tradeoff: A chunked upload with no `Content-Length` would be refused; browsers always send the header for form posts.
  - Confidence: MED — Workers forward `Content-Length` for normal uploads, but this has not been measured on Workers.
  - Blind spot: Whether Cloudflare's own body limit on this plan is already lower than the Worker's memory.
- **Decision**: PENDING

### F2 — Two unplanned commits on the branch

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: commits 2d4332a, bed9971
- **Detail**: 2d4332a changes the top-bar greeting from the email to the user's name (`topbarName`, and the model field `email` is renamed to `name`). It is consistent and tested, but it has nothing to do with avatars. bed9971 commits `CLAUDE.md` and removes it from `.gitignore`. Neither commit is in the plan or in `change.md` Notes.
- **Fix**: Add a short addendum about the greeting change to `change.md` Notes and the plan, and name both commits in the PR description.
- **Decision**: PENDING

### F3 — Top bar uses a custom `<img>` instead of `AvatarImage`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/TopbarActions.tsx:34-58
- **Detail**: The plan specified `<AvatarImage className="object-cover">`. The code renders `AccountImage`, a plain absolutely-positioned `<img>` that hides itself when the image fails to load. A comment explains why: the Radix image only renders after hydration, so the initials would flash on every page. The change is intentional and covered by e2e, but the plan is not updated.
- **Fix**: Add a one-line addendum to the plan's Phase 3 §2 recording the change and the reason.
- **Decision**: PENDING

### F4 — `avatar_path` check accepts `..` segments

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20261026150000_profile_avatar.sql:4-8
- **Detail**: `avatar_path like id::text || '/%'` only checks the prefix. Through PostgREST, a user can store `<own-uid>/../<victim-uid>/x.png`, and the browser normalises the `..` when it loads the image. The only effect is that the user's own top bar shows another user's avatar, which is already public. Storage RLS still prevents deleting or overwriting anyone else's file. LIKE wildcards are not a risk, because a uuid's text contains only hex digits and `-`.
- **Fix**: In a new migration, replace the check with `avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')`. Use `not valid` and then `validate`, so the migration stays backward compatible.
- **Decision**: PENDING

### F5 — Concurrent or direct uploads can leave orphaned files

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/profile-avatar.ts:47-101
- **Detail**: Reading the old path, uploading, writing the column and deleting the old file do not happen as one step. Two overlapping saves can leave a file that nothing references; no interleaving breaks the avatar that is shown. The insert policy also lets a user upload directly to their own folder through the Storage API, skipping the magic-byte check. The bucket's MIME and size limits still apply. The plan already excludes orphan cleanup.
- **Fix**: Accept for now, and record a follow-up for a cleanup job that removes objects not referenced by `profiles.avatar_path`.
- **Decision**: PENDING

### F6 — `submitAvatarForm` duplicates `submitAuthForm`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/profile/ProfileAvatarForm.tsx:27-59
- **Detail**: This is almost a copy of `src/lib/auth-form.ts` `submitAuthForm`. The differences are the submitter's `intent` and dropping the file on remove. The plan allowed a plain `fetch`, so this is not drift, but the fetch and payload handling now exists in two places.
- **Fix**: Give `submitAuthForm` an optional prepared `FormData` argument and call it from the avatar form.
- **Decision**: PENDING

### F7 — E2E cleanup only runs if the test passes

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/e2e/profile-avatar.spec.ts:22-53
- **Detail**: The final Remove step is in the test body, not in `afterEach` or `finally`, so a failure after the upload leaves an avatar for other specs. The start-of-test cleanup (L36-38) handles it on the next run, but specs in the same run can still see an image. Separately, the unit test for a sniff mismatch only compares values; the API's refusal is covered by smoke.
- **Fix**: Move the removal into `test.afterEach`, which removes the avatar through the Avatar tab when the Remove button is shown.
- **Decision**: PENDING
