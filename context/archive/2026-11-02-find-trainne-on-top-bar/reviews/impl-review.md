<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Find trainee in the top bar

- **Plan**: context/changes/find-trainne-on-top-bar/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3
- **Date**: 2026-11-02
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
| --------- | ------- |
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

Scope note: the changes outside the plan are justified and stay in. They are the `portal` prop on `PageErrorToasts`, the `--container-find-trainee` token in `global.css`, and the `React.lazy` loading of the dialog in `TopbarActions`. The "What We're NOT Doing" guardrails are all kept.

## Findings

### F1 — Dismissing an error toast closes the open dialog

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/trainer/FindTraineeDialog.tsx:179 (also TraineeEmailSearch.tsx:216, PageErrorToasts.tsx:117-148)
- **Detail**: Two error toasts are portaled into `document.body` with `pointer-events-auto`: the failed-request toast and the "Enter an email address" toast. They are siblings of `<Dialog>`, so they sit outside `DialogContent` in both the DOM tree and the React tree. Radix's DismissableLayer treats a pointerdown on a toast's close button as a click outside and calls `onOpenChange(false)`. `FindTraineeForm` unmounts, so the typed email and the checkbox state are lost. The focus trap also keeps keyboard users from reaching the close button. This was found by reading the code and has not been reproduced at runtime. The e2e test never clicks the toast.
- **Fix**: On `DialogContent`, add `onPointerDownOutside` and `onInteractOutside` handlers that call `preventDefault()` when `event.target` is inside `[data-error-toast-stack]`. Then add an e2e step: dismiss the toast and check that the dialog is still open.
  - Strength: The fix sits at the dialog boundary, where the "outside" decision is made, and it covers both portaled toasts.
  - Tradeoff: A few lines plus one e2e step.
  - Confidence: HIGH. This is the documented Radix escape hatch for portaled children.
  - Blind spot: The bug itself has not been reproduced in the browser.
- **Decision**: FIXED — `keepOpenOnToast` guard on `DialogContent` (onPointerDownOutside/onInteractOutside), plus an e2e dismiss step in the unknown-email test (lint and type check clean; e2e not run yet)

### F2 — Request outcome is a toast, not a message inside the dialog

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/trainer/FindTraineeDialog.tsx:162-188; tests/e2e/find-trainee.spec.ts:105-107
- **Detail**: The plan, Phase 1 item 5, asked for an `aria-live="polite"` message region inside the dialog, styled with `text-destructive`, for the not found, pending, granted and failed outcomes. Instead these outcomes show a portaled error toast. The e2e test asserts that the message is *not* in the dialog. The commit message for 7aa8ac3 gives the reason, but plan.md was never updated, so the plan and the code disagree. The toast choice also causes F1. Keyboard users cannot reach the toast, and it auto-dismisses after `ERROR_TOAST_MS`.
- **Fix A ⭐ Recommended**: Add the in-dialog `aria-live` message as planned, and drop the portaled failed toast.
  - Strength: Matches the plan and the change brief ("the dialog stays open and shows the outcome message"). The message stays next to the field it explains and is reachable inside the focus trap. It removes the failed-toast half of F1.
  - Tradeoff: Rework of the dialog's failure path and the e2e assertion. The empty-email toast from `TraineeEmailSearch` stays portaled, so F1's guard is still needed for it.
  - Confidence: MED. The implementer chose the toast on purpose, and that reason is not recorded in the plan.
  - Blind spot: The 7aa8ac3 rationale has not been read in full.
- **Fix B**: Keep the toast and add a plan addendum that records the deviation and its reason.
  - Strength: No code churn, and the plan becomes the source of truth again.
  - Tradeoff: Keeps the keyboard-reachability and auto-dismiss weaknesses. F1 must still be fixed.
  - Confidence: HIGH that the code is otherwise correct.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix B + ACCEPTED-AS-RULE: Show every error as a toast, also inside dialogs. Fix A (in-dialog message) was first applied, then reversed at the user's request. All dialog errors are toasts again: a portaled `PageErrorToasts` rendered inside `FindTraineeForm`, so it goes away when the dialog closes, with the F1 keep-open guard. The e2e unknown-email test asserts the toast outside the dialog and that dismissing it keeps the dialog open. The plan deviation is recorded in plan.md (Addendum). e2e 35/35 (`--workers=1`) and smoke pass.

### F3 — An answer from a previous open can act on a reopened dialog

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/trainer/FindTraineeDialog.tsx:79-86, 132, 158-164
- **Detail**: A request keeps running when the dialog closes. If the trainer closes and reopens the dialog before the answer arrives, a `sent` answer calls `setOpen(false)` and closes the new dialog. Separately, the `failed` toast state lives in the parent and is not cleared on close, so a failure toast can outlive the dialog it came from by up to 10 s.
- **Fix**: Use an open-generation ref, or an AbortController aborted on unmount, to ignore answers from a previous open. Clear `failed` in `onOpenChange` when the dialog closes.
- **Decision**: FIXED — the request carries an AbortController signal and is aborted when `FindTraineeForm` unmounts; `sendRequest` returns `null` for an aborted request and the form drops it. The `failed` half was already resolved by F2 Fix A.

### F4 — Dead `serverError` path in TraineeEmailSearch

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/trainer/TraineeEmailSearch.tsx:11, 54-59
- **Detail**: The only remaining caller is `FindTraineeDialog`, which never passes `serverError`, so `arrivedEmpty` is always false. The empty-email toast is now portaled: the server renders it inline, but the client renders it through a portal (PageErrorToasts.tsx:148). A future SSR caller that passes `serverError` would therefore get a hydration mismatch.
- **Fix**: Remove the `serverError` prop and the `arrivedEmpty` branch.
- **Decision**: FIXED — the `serverError` prop and the `arrivedEmpty` initial state are removed (`invalid` and `emptyToast` start false)

### F5 — POST /api/trainer-links has no explicit role check

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/trainer-links/index.ts:78-114
- **Detail**: GET returns 403 to non-trainers (`:44-47`). POST, in both its JSON and redirect branches, relies on the `request_trainee_link` RPC: it is security definer, granted to `authenticated` only, and answers `not_found` unless the caller is a trainer. Nothing is bypassed, and the redirect branch has always worked this way. A non-trainer simply gets 404 "No trainee with that email" instead of a clear 403.
- **Fix**: Optional. Call `readProfileRole` in POST and answer 403 for non-trainers, to match GET.
- **Decision**: FIXED (JSON branch only) — a JSON POST from a non-trainer answers 403 `{outcome:"failed", message:"Only trainers can request access to a trainee"}`. The redirect branch is unchanged, as the plan's guardrail and the existing smoke check require. New smoke check: "trainee JSON link is forbidden" (smoke not run yet).

### F6 — Smoke and e2e not re-run during this review

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: Re-run in this review: `npm test` (398/398 pass), `npm run lint` (clean), `npm run check:home-tokens` (clean), `npx astro check` (0 errors) and `npm run build` (passes into a scratch outDir). A running `astro preview` on 4321 held `dist/` with an EPERM lock, and stopping it was not permitted, so smoke (1.5, 3.5) and e2e (3.6) were not re-run. Those items are checked in Progress against commits cd8cc55 and 7aa8ac3. CI runs both on push.
- **Fix**: Stop the preview, then run `npm run build && npm run preview` followed by `npm run smoke` and `npx playwright test`, or rely on the CI `smoke` and `e2e` jobs for the PR.
- **Decision**: FIXED — the user stopped the old preview. After a rebuild on 4321, `npm run smoke` passed all 196 steps, twice. The first smoke run failed the step after the new F5 403 ("trainee hub redirects to collaborations" → 500, miniflare `fetch failed`): the 403 returned before the multipart body was read, which broke the next request on the kept-alive connection. The fix reads `formData()` before the role check. `npx playwright test --workers=1` (the CI setting) passed 35/35. With local parallel workers, `measurements-menus.spec.ts` (360×800, one click on Menu with no hydration wait) fails when it runs alongside `find-trainee.spec.ts`, and passes alone and serially. This is a load-dependent flake in a spec this branch did not touch, not a regression.
