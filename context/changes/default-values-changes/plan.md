# Default values for the measurement accordion and entries per page

## Overview

The measurements screen opens with the add form expanded and five entries per page when the signed-in account has not saved a choice. An explicit page size and a saved open or closed add form still win on the next visit.

## Current State Analysis

`c26d488` already sets the unset defaults this slice asks for. `defaultPageSize` in `src/lib/measurement-page.ts` is `5`, and `pageSizes` remains `[5, 10, 15]`. Before that commit the unset size was `10`, and the add form opened only when the journal had no entries (`addFormOpen ?? entries.length === 0`).

Both roles load `/measurements` through `src/pages/measurements.astro`. `preferredPageSize` reads the account cookie `tm.measurements.pageSize.<accountUserId>` and passes it to `readMeasurementPage` for the trainee and for a linked trainer. A missing or invalid cookie becomes `defaultPageSize` via `parsePageSize`. The Entries per page control in `src/components/measurements/MeasurementBrowser.tsx` writes an explicit `5`, `10`, or `15` to localStorage and the matching cookie.

The trainee add form is a `<details>` element in `src/components/journal/TraineeJournal.astro`. `measurements.astro` passes `preferredAddForm`, which is `parseAddFormOpen` of `tm.measurements.addForm.<accountUserId>`. The open flag is still the inline expression `serverError !== null || (addFormOpen ?? true)`. A saved `"open"` or `"closed"` is restored from the cookie on the server and from localStorage after paint, except when a server error is present: then `data-restore` is omitted and the form stays open. While an edit is in progress the accordion is not rendered; the screen shows the edit heading instead.

The trainer panel has no add form. It renders a read-only `MeasurementBrowser` with the same `pageSize`.

Unit tests in `src/lib/measurement-page.test.ts` already expect `defaultPageSize` of `5`, `parsePageSize("10")` of `10`, and `parseAddFormOpen("closed")` of `false`. Nothing yet names the rule “no preference opens the form, including when entries exist, and a server error forces it open.”

## Desired End State

A trainee who has never saved an add-form or page-size choice opens `/measurements` with **Add your next measurement** expanded and the list at five entries per page, including when the journal already has entries. A linked trainer with no saved page size sees that same list default and still has no add form.

A trainee or trainer who last chose 10 or 15 still sees that size. A trainee who collapsed the add form still sees it collapsed, and one who left it open still sees it open. A server error still forces the form open. An in-progress edit still replaces the accordion with the edit heading.

Verify the unset and saved cases with `npm test -- src/lib/measurement-page.test.ts`, then with the manual steps in Testing Strategy.

### Key Discoveries:

- `defaultPageSize` is already `5` at `src/lib/measurement-page.ts:8`. `parsePageSize` returns that default for anything other than the strings `"5"`, `"10"`, and `"15"` (`src/lib/measurement-page.ts:37`).
- Trainee and trainer lists both call `preferredPageSize(user.id)` (`src/pages/measurements.astro:105` and `src/pages/measurements.astro:154`).
- The add form opens from `serverError !== null || (addFormOpen ?? true)` (`src/components/journal/TraineeJournal.astro:46`). The entry count is no longer an input. `parseAddFormOpen` maps `"open"` and `"closed"` and returns `null` for anything else (`src/lib/measurement-page.ts:70`).
- `choosePageSize` persists the clicked size with `writePreference` (`src/components/measurements/MeasurementBrowser.tsx:1024`). The hydration effect copies localStorage onto the cookie and, when localStorage is empty, `parsePageSize(null)` supplies `5`.
- The narrow layout test already opens the form only when **Date and time** is hidden (`tests/e2e/measurements-narrow.spec.ts:30`). An initially open form does not need that click.

## What We're NOT Doing

- Resetting an explicit saved `10` or `15` back to five.
- Expanding the add form on every visit after the trainee collapsed it.
- Adding an add form to the trainer panel.
- Changing the `5` / `10` / `15` options, the month filter, the stored page index, or the `/measurements` URL.
- Changing measurement rows or how deltas are calculated.
- Clearing existing cookies or localStorage, including a one-time reopen of forms already saved as closed.

## Implementation Approach

Keep the page-size default and the existing cookie and localStorage path. Name the add-form start rule beside `parseAddFormOpen` so the unit tests can lock “nothing stored opens the form” and “a saved closed form stays closed” without rendering the page. `TraineeJournal.astro` uses that function for the `<details open>` attribute. The trainer list needs no new default; it already reads `preferredPageSize`.

## Critical Implementation Details

The previous open rule consulted the entry count. This slice does not. A journal that already has entries, with no stored add-form value, still opens.

A server error forces the form open, and the inline script must keep skipping localStorage restore in that case (`data-restore` omitted). The named rule returns open when an error is present even if the stored preference is closed.

A missing localStorage page size is not a saved choice. `parsePageSize(null)` is `5`, and the existing hydration effect copies that onto the cookie. An explicit choice is the string `"5"`, `"10"`, or `"15"` written by the Entries per page control. Leave that effect and `choosePageSize` as they are.

## Phase 1: First-visit defaults

### Overview

When nothing is stored, the list uses five entries per page for the trainee and a linked trainer, and the trainee add form starts open even if the journal already has entries.

### Changes Required:

#### 1. Shared page-size default

**File**: `src/lib/measurement-page.ts`

**Intent**: The unset page size stays five for every account that has not saved a choice. Trainee and trainer already share this constant through `preferredPageSize`.

**Contract**: `defaultPageSize` is `5`. `pageSizes` stays `[5, 10, 15]`. `parsePageSize` of a missing or invalid value returns `defaultPageSize`. `src/pages/measurements.astro` keeps passing `preferredPageSize(user.id)` into both `readMeasurementPage` calls.

#### 2. Add form opens when nothing is stored

**File**: `src/lib/measurement-page.ts`, `src/components/journal/TraineeJournal.astro`

**Intent**: Name the open rule so a test can require the form to start open for a non-empty journal, and so a server error still forces it open.

**Contract**: Export this function beside `parseAddFormOpen`. `TraineeJournal.astro` sets `<details open>` from it and stops using the entry count. When a server error is present, `data-restore` stays omitted.

```ts
export function addFormStartsOpen(hasServerError: boolean, preference: boolean | null): boolean
```

`hasServerError === true` returns `true`. Otherwise `preference === false` returns `false`, and `null` or `true` returns `true`.

### Success Criteria:

#### Automated Verification:

- `npm test -- src/lib/measurement-page.test.ts` passes with `defaultPageSize` of 5 and `pageSizes` of 5, 10, and 15
- The same run passes with `addFormStartsOpen(false, null)` true and `addFormStartsOpen(true, false)` true

#### Manual Verification:

- A trainee whose journal already has an entry, and who has no saved add-form or page-size preference, sees the add form open and five entries per page
- A linked trainer with no saved page-size preference sees five entries per page and no add form

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Saved choices

### Overview

An explicit page size is restored on the next visit. A collapsed add form stays collapsed, and a form left open stays open, unless a server error forces it open.

### Changes Required:

#### 1. Saved page size

**File**: `src/lib/measurement-page.test.ts`

**Intent**: Lock the rule that an explicit 5, 10, or 15 survives, and that a missing value is five. Do not teach `parsePageSize` to ignore a stored `"10"`.

**Contract**: `parsePageSize("5")` is `5`, `parsePageSize("10")` is `10`, `parsePageSize("15")` is `15`, and `parsePageSize(null)` is `5`. `preferredPageSize` keeps reading the account cookie for the trainee and the trainer. `choosePageSize` keeps writing that choice.

#### 2. Saved add-form state

**File**: `src/lib/measurement-page.test.ts`

**Intent**: Lock the rule that a saved closed form stays closed when there is no server error, and a saved open form stays open.

**Contract**: `addFormStartsOpen(false, false)` is `false`. `addFormStartsOpen(false, true)` is `true`. `parseAddFormOpen("closed")` stays `false` and `parseAddFormOpen("open")` stays `true`. The inline toggle script keeps writing `"open"` or `"closed"` and restoring that value when `data-restore` is set.

### Success Criteria:

#### Automated Verification:

- `npm test -- src/lib/measurement-page.test.ts` passes with `parsePageSize("10")` equal to 10, `parsePageSize("15")` equal to 15, and `parsePageSize(null)` equal to 5
- The same run passes with `addFormStartsOpen(false, false)` false and `addFormStartsOpen(false, true)` true

#### Manual Verification:

- A trainee who chose 10 and collapsed the add form still sees 10 and a collapsed form after reload
- A linked trainer who chose 15 still sees 15 after reload

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `defaultPageSize` is `5` and `pageSizes` is `[5, 10, 15]`.
- `parsePageSize` keeps `"5"`, `"10"`, and `"15"` and falls back to `5` for `null`, `"7"`, and other invalid values.
- `addFormStartsOpen(false, null)` is `true` (non-empty journals included; the entry count is not an argument).
- `addFormStartsOpen(false, false)` is `false` and `addFormStartsOpen(false, true)` is `true`.
- `addFormStartsOpen(true, false)` is `true`.

### Integration Tests:

- No new end-to-end spec. `tests/e2e/measurements-narrow.spec.ts` already reveals the form when it is closed and leaves it alone when **Date and time** is visible.

### Manual Testing Steps:

1. As a trainee with at least one measurement and no `tm.measurements.pageSize` or `tm.measurements.addForm` cookie, open `/measurements`. The add form is expanded and Entries per page is 5.
2. Choose 10, collapse **Add your next measurement**, and reload. The list is 10 and the form stays collapsed.
3. As a linked trainer with no page-size cookie, open the same trainee. The list is five entries per page and there is no add form.
4. Choose 15, reload, and confirm the list is still 15.

## Performance Considerations

The defaults do not add queries, storage keys, or work on the measurement read. Page size still limits the list the way S-23 already does.

## Migration Notes

There is no schema change. Do not rewrite stored `"10"` or `"15"` values to `"5"`, and do not delete add-form cookies. An account that never clicked Entries per page, and whose localStorage key is empty, follows `parsePageSize(null)` and gets five through the existing hydration effect.

## References

- Slice outcome and risk: `context/foundation/roadmap.md` (S-33, MS-25)
- Issue: https://github.com/gmaszkiewicz/training-manager/issues/115
- Page-size rules: `src/lib/measurement-page.ts`
- Add form: `src/components/journal/TraineeJournal.astro`
- Trainee and trainer wiring: `src/pages/measurements.astro`
- Entries per page control: `src/components/measurements/MeasurementBrowser.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: First-visit defaults

#### Automated

- [x] 1.1 `npm test -- src/lib/measurement-page.test.ts` passes with `defaultPageSize` of 5 and `pageSizes` of 5, 10, and 15 — 5675dc0
- [x] 1.2 The same run passes with `addFormStartsOpen(false, null)` true and `addFormStartsOpen(true, false)` true — 5675dc0

#### Manual

- [x] 1.3 A trainee whose journal already has an entry, and who has no saved add-form or page-size preference, sees the add form open and five entries per page — 5675dc0
- [x] 1.4 A linked trainer with no saved page-size preference sees five entries per page and no add form — 5675dc0

### Phase 2: Saved choices

#### Automated

- [x] 2.1 `npm test -- src/lib/measurement-page.test.ts` passes with `parsePageSize("10")` equal to 10, `parsePageSize("15")` equal to 15, and `parsePageSize(null)` equal to 5
- [x] 2.2 The same run passes with `addFormStartsOpen(false, false)` false and `addFormStartsOpen(false, true)` true

#### Manual

- [x] 2.3 A trainee who chose 10 and collapsed the add form still sees 10 and a collapsed form after reload
- [x] 2.4 A linked trainer who chose 15 still sees 15 after reload
