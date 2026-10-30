<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Read-only Role in Profile → Details

- **Plan**: context/changes/role-view-in-profile/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2
- **Date**: 2026-10-30
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

Automated checks re-run on 2026-10-30: `npm test` (306 passed), `npm run lint` (clean), `npx astro check` (0 errors), `npm run build` (complete), `npm run check:home-tokens` (clean), `npx playwright test tests/e2e/profile-details.spec.ts` (2 passed).

## Findings

### F1 — Kitchen-sink Details forms can really save names

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/kitchen-sink/home.astro:340-365
- **Detail**: The new "Profile details" section renders two live `ProfileDetailsForm`s (`client:load`, `action="/api/profile"`). `/kitchen-sink/home` has no auth guard, and `POST /api/profile` writes the names for whoever is signed in. A signed-in user who clicks Save in the sink overwrites their own first and last name with "Ada Lovelace" or "Grace Hopper". The plan asked only for a visual reference.
- **Fix**: Add `inert` to the two wrapper `div`s around the sink forms (and drop `client:load`), so the forms keep their look but cannot be focused or submitted.
- **Decision**: FIXED — wrapper divs are `inert`, `client:load` dropped, caption updated

### F2 — Spec uses `elementHandle()` for the order check

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: tests/e2e/profile-details.spec.ts:19-25
- **Detail**: The order check gets an `ElementHandle`, which Playwright discourages in favour of locators, and never disposes it. The only other position check in `tests/e2e/` (`measurements-narrow.spec.ts:13`) uses `boundingBox()`, which is also what the plan suggested.
- **Fix**: Compare `(await role.boundingBox())!.y < (await email.boundingBox())!.y` instead of the handle.
- **Decision**: FIXED — order check now compares `boundingBox()` y values
