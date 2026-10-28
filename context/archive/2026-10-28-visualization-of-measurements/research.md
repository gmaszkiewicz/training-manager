---
date: 2026-10-28T10:23:22+01:00
researcher: Claude (Opus 5.5) for gmaszkiewicz
git_commit: c19d9ba
branch: main
repository: gmaszkiewicz/training-manager
topic: "What the measurement charts (S-41 / MS-32) plug into: data, differences, list selection, accordion, storage, tokens, tests"
tags: [research, codebase, measurements, charts, MeasurementBrowser, TraineeJournal, measurement-page, measurement-deltas]
status: complete
last_updated: 2026-10-28
last_updated_by: Claude (Opus 5.5)
---

# Research: Visualization of measurements (S-41 / MS-32)

**Date**: 2026-10-28T10:23:22+01:00
**Researcher**: Claude (Opus 5.5) for gmaszkiewicz
**Git Commit**: c19d9ba (working tree: `context/foundation/roadmap.md` modified, this change folder untracked)
**Branch**: main
**Repository**: gmaszkiewicz/training-manager

## Research Question

From `change.md` and roadmap slice S-41 (`context/foundation/roadmap.md:630-639`): what in the current codebase does a Charts tile with eight line charts plug into? It covers week, month, year, and years periods, a collapsible tile above the add form, hover tooltips showing each entry and its difference versus the previous entry, Visualize and Clear for entries checked in the list, and choices remembered by the browser. Which existing contracts must it reuse, and what is missing?

## Summary

- **No chart, range data, or period beyond a month exists today.**
  - No charting library is installed (`package.json`), and there is no `src/components/ui/chart.tsx`.
  - Every measurement read is scoped to one month and one page of at most 15 rows (`src/pages/api/measurements/index.ts:52-112`).
  - The list period is a month only. There is no week, year, or years period anywhere in the list or the API.
  - The charts need a new period-range service and route.
- **The difference can be reused unchanged.**
  - `deltasForVisiblePage(visible, older)` (`src/lib/measurement-page.ts:224-231`) plus `selectOlderRow` (`src/lib/services/measurements.ts:195-214`) already produce the list's difference. That includes an entry whose predecessor is months or years earlier.
  - Calling them with "visible" = every entry in the chart period gives tooltip differences that match the list by construction.
- **Row checkboxes already exist** in `MeasurementBrowser.tsx`: per row at :510-518, "Select all" at :1196-1204, state at :782.
  - They are in-memory only and never persisted.
  - The Set keeps ids across page and month changes, but not the entry data.
  - Visualize therefore needs to fetch selected entries by id, or keep the entry data alongside the ids.
- **The accordion pattern to copy** is a native `<details>` plus an inline script in `TraineeJournal.astro:64-135`. It saves its state to localStorage and to a cookie under `tm.measurements.addForm.<account>`.
  - Storage keys follow `tm.measurements.<thing>.<account>[.<trainee>]` (`src/lib/measurement-page.ts:50-68`).
  - This already answers the roadmap risk of choices leaking between trainees.
- **Three requirement details conflict with current facts:**
  1. Steps of 5 up to the input maximum give 81 ticks for Weight from 0 (77 if it starts at the input minimum of 20) and 59–61 for the other fields (10–300 / 0–300). `measurementLimits` (`src/lib/measurement-input.ts:92-101`) is not exported.
  2. Only 5 chart colour tokens exist (`src/styles/global.css:29-33`) for 8 charts.
  3. The roadmap's "week of day buttons" journal is not rendered today. The `weekContaining`/`openingDay`/`listMonthChange` helpers are used only by tests.

## Detailed Findings

### Measurement data contract

- **Fields.** There are exactly 8 fields: `weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm` (`src/types.ts:9-10`).
  - Labels and display order come from `measurementFields` (`src/lib/measurement-input.ts:20-38`). `arms_cm` is labelled "Arm cm".
  - Icons: lucide `Scale` for weight and `Ruler` for the other seven (`MeasurementBrowser.tsx:149-158`).
- **Values.** All 8 fields are `numeric(5,1) not null`; only `note` is nullable (`supabase/migrations/20260928043200_trainee_measurements.sql:5-13`). A chart series never has gaps.
- **Ranges.**
  - Zod: weight 20–400, the other seven 10–300 (`src/lib/measurement-input.ts:92-101`).
  - DB CHECK constraints use the same values (`20260928043200_trainee_measurements.sql:15-22`). There is no mismatch.
  - Only the string helper `measurementFieldRange` is exported (`measurement-input.ts:114-117`). A numeric y-axis maximum needs a new export.
- **Identity.**
  - `id uuid` (`20260928043200_trainee_measurements.sql:2`).
  - `measured_on` is `timestamp without time zone`, stored as local wall-clock time to the minute (`20261006220000_measured_on_timestamp.sql:1-3`).
  - `measured_on` is unique per trainee via `measurements_trainee_id_measured_on_key (trainee_id, measured_on)` (`:45-46`). This is the only index on `measurements` found in the migrations.
  - Edits keep `id` but may move `measured_on` (`services/measurements.ts:353-390`). Deletes are hard deletes (`:392-413`).
  - So a remembered selection of ids can go stale in two ways: an entry is deleted, or it moves to another period.

### Reads, the difference, and range limits

- **The month page** is built by `readMeasurementPage` (`src/lib/services/measurements.ts:216-312`):
  - The `measurement_months` RPC is security invoker (`supabase/migrations/20261010073600_measurement_months.sql:1-15`).
  - `selectPage` reads a half-open `monthWindow` (`measurement-page.ts:193-202`), ordered `measured_on desc, id desc`.
  - `selectOlderRow` reads one predecessor with no date bound (`services/measurements.ts:195-214`).
  - `deltasForVisiblePage` combines the page with that predecessor (`measurement-page.ts:224-231`).
- **Difference maths** lives in `src/lib/measurement-deltas.ts`:
  - `withDeltas` (:66-75) sorts by `measured_on` then `id`, and computes in integer tenths (`deltaBetween` :19-28).
  - `formatDelta` (:77-86) renders `↑ 1.5` / `↓ 1.5` / `0.0`.
  - Smoke checks a June entry whose predecessor is in January (`scripts/smoke.mjs:600`, `:993`, `:1135`).
- **API routes** under `src/pages/api/measurements/`:
  - GET `index.ts`: `month`, `size` ∈ {5,10,15}, `page`, `focus`, and `trainee` for trainers (:52-112).
  - POST create (`index.ts:114-163`), update (`[id].ts:39-94`), delete (`[id]/delete.ts:43-71`).
  - `previous.ts` and `occupied.ts` are trainee-only helpers.
  - None of the inspected routes returns an arbitrary date range or a set of entries by id.
- **Row cap.** `supabase/config.toml:18` sets `max_rows = 1000` for local PostgREST. A years range over a journal with more than 1000 entries would be truncated unless paged.
  - The hosted value was not inspected.
  - S-24 (`context/archive/2026-10-10-query-optimization/plan-brief.md`) removed a 1000-row walk. It ruled a new index and changes to the page queries out of scope for itself.
- **Trainer access.**
  - Row-level security: `measurements_select_linked_trainer` requires an accepted `trainer_links` row (`supabase/migrations/20261027120000_trainer_link_requests.sql:68-82`).
  - Read access is derived from link status, not stored per dashboard (`src/lib/collaborations.ts:35-42`, `src/lib/dashboards.ts:36-38`).
  - On the inspected GET path, an unlinked trainer receives empty entries rather than a 403 (`api/measurements/index.ts:80-86`).
  - A new range query should stay security-invoker / row-level-security-bound in the same way.

### /measurements composition and where the tile goes

- **The page.** `src/pages/measurements.astro` is SSR. It branches on role:
  - Trainee (:101-134) renders `TraineeJournal` (:185-202).
  - Trainer (:135-172) renders `TrainerPanel` (:204-220).
- **Trainee journal.** `TraineeJournal.astro` is an Astro card (`bg-card max-w-measurement rounded-xl border p-4`, :50-51). Its islands are all `client:load`:
  - `PageErrorToasts`
  - `MeasurementForm`: add form inside the accordion at :88, edit at :60
  - `MeasurementBrowser` (:138-153)
  - A Charts tile "above the add form and the list" goes before the accordion block (:64).
- **Trainer panel.** `TrainerPanel.astro` has no form. It renders `LinkedTraineeField` (:89) and then `MeasurementBrowser readOnly` (:94-107).
  - If trainers get charts, the slot is between those two.
  - Switching trainee is a full-page link `/measurements?trainee=<id>`, and the choice is kept in an httpOnly cookie (`measurements.astro:141-153`).
- **MeasurementBrowser props** (`MeasurementBrowser.tsx:44-58`) carry one page of `MeasurementWithDeltas`. There is no full-period data in the browser today.
  - It has two modes: `paged` (server data) and a local mode used by the kitchen sink when `dates` is absent (:769, :895-909).

### Period controls

- **Month only.** The list period is held in React state (`MeasurementBrowser.tsx:783-787`). Prev/next and a month popover step through months that have data (:663-681, :1076-1160).
  - The month is kept under `tm.measurements.day.<account>.<trainee>`, which holds a month value despite its name (`measurement-page.ts:54-56`).
- **No week strip is rendered.** `weekContaining` (Monday-first, `src/lib/journal-calendar.ts:48`), `openingDay` (:78) and `listMonthChange` (:88) have no callers outside `journal-calendar.test.ts` (grep of `src/`, excluding tests).
  - `monthGrid` (:53) drives only the form's date picker (`MeasurementForm.tsx:950`).
- **Week, year and years would be new controls.** Today's month is the natural default, which matches "default: the currently selected month".

### Selection, Visualize and Clear

- **Selection state.** `selectedIds: ReadonlySet<string>` (`MeasurementBrowser.tsx:782`).
  - Tri-state header over the visible rows (:910-926); per-row toggle (:928-938).
  - Selected rows get `data-state="selected"` (:509).
- **Slot for the buttons.** Below the pager (ends :1278), before the toasts (:1281).
- **Precedent for bulk actions.** `NotificationsTable.tsx`:
  - Buttons are `variant="outline" size="sm"` and disabled when `selectedCount === 0` (:216-231).
  - `initialSelectedIds` is a kitchen-sink seed prop (:17).
- **The charts and the list are separate islands.** If they stay that way, selection must cross island boundaries. Options are a shared store, a custom event, or browser storage; any of them would be new here.
  - The one inspected precedent for cross-component state is the inline-script plus cookie pattern.
  - The alternative is to put the charts inside `MeasurementBrowser`, or a new parent island.

### Browser storage pattern

- **Helpers.** `readStored` / `writeStored` (try/catch), `writeCookie` (`Path=/; Max-Age=31536000; SameSite=Lax`) and `writePreference` (`MeasurementBrowser.tsx:626-653`).
  - After hydration, an effect copies localStorage onto the cookie (:815-835).
  - The server reads cookies so the first render already uses the preference (`measurements.astro:75-93`).
- **Keys.**
  - `pageSize.<acct>`, `day.<acct>.<trainee>`, `trainee.<acct>`, `page.<acct>.<trainee>`, `addForm.<acct>` (`measurement-page.ts:50-68`).
  - Tested at `measurement-page.test.ts:75-77`.
- **Remembering selected ids.** A list of up to "x" UUIDs costs about 37 bytes per id in a cookie. The current preferences are all short scalars, so a cookie mirror for the selection is a size and design choice.
- **No shared hook.** There is no `src/components/hooks/` directory, though CLAUDE.md requires hooks to be extracted there.

### Tokens, UI components, token check

- **Chart tokens.** `--chart-1..5` are defined in light (`global.css:29-33`) and dark (:66-70), and exposed as `--color-chart-1..5` (:118-122). That is 5 tokens for 8 charts.
- **UI components.** `src/components/ui/` has avatar, button, checkbox, dropdown-menu, input, label, table, tabs, textarea and LibBadge. There is no accordion, collapsible, tooltip or chart component.
- **Token check.** `scripts/check-home-tokens.mjs` bans hex, `rgb(`, `hsl(`, `oklch(`, `-[Npx|rem]` arbitrary sizes and palette utilities (:55-56).
  - It checks only its hard-coded `FILES` list (:7-53). New chart files must be added to that list to be enforced.
- **Copy and colouring.** UI copy is English. PRD non-goals exclude good/bad colouring of differences (`context/foundation/prd.md:114-122`). That rules out red/green tooltip deltas.

### Tests and kitchen sink

- **Unit tests.** Vitest runs `src/**/*.test.ts` on pure functions in `src/lib` (`context/foundation/test-plan.md:93-99`). `measurement-page.test.ts:367-405` already covers `deltasForVisiblePage` with an off-page predecessor.
- **E2E.**
  - Config: `playwright.config.ts`, `tests/e2e`, Desktop Chromium, build + preview on port 4321.
  - Selectors are role and accessible-name based. The accordion is opened by its summary button "Add your next measurement" (`tests/e2e/measurements-narrow.spec.ts:29-36`).
  - Test plan: no broad browser suite; targeted interactions only (`test-plan.md:196`).
- **Kitchen sink.** `/kitchen-sink/journal` (`src/pages/kitchen-sink/journal.astro:46-145`) renders `TraineeJournal` in Default, Hover, Focus-visible, Disabled, Error, Empty, Empty month and Loading states. It passes no `dates`, so the browser runs in local mode.

## Code References

- `src/types.ts:9-12` - `MeasurementField` union, `MeasurementEntry`
- `src/lib/measurement-input.ts:20-38` - field labels and units, in order
- `src/lib/measurement-input.ts:92-101` - `measurementLimits` (not exported)
- `src/lib/measurement-input.ts:114-117` - `measurementFieldRange` (string)
- `src/lib/measurement-deltas.ts:66-86` - `withDeltas`, `formatDelta`
- `src/lib/measurement-page.ts:50-68` - storage key helpers
- `src/lib/measurement-page.ts:193-202` - `monthWindow`
- `src/lib/measurement-page.ts:224-231` - `deltasForVisiblePage`
- `src/lib/services/measurements.ts:195-214` - `selectOlderRow`
- `src/lib/services/measurements.ts:216-312` - `readMeasurementPage`
- `src/pages/api/measurements/index.ts:52-112` - paged month GET
- `src/components/measurements/MeasurementBrowser.tsx:626-653` - storage and cookie helpers
- `src/components/measurements/MeasurementBrowser.tsx:782` - `selectedIds`
- `src/components/measurements/MeasurementBrowser.tsx:1196-1204` - Select all
- `src/components/measurements/MeasurementBrowser.tsx:1278` - end of the pager
- `src/components/journal/TraineeJournal.astro:64-135` - `<details>` accordion and its persistence script
- `src/components/trainer/TrainerPanel.astro:89-107` - trainer slot
- `src/lib/journal-calendar.ts:48-88` - week helpers (test-only callers)
- `src/styles/global.css:29-33,66-70,118-122` - chart tokens
- `scripts/check-home-tokens.mjs:7-56` - file list and banned patterns
- `supabase/migrations/20261006220000_measured_on_timestamp.sql:45-46` - unique `(trainee_id, measured_on)` index
- `supabase/config.toml:18` - `max_rows = 1000`

## Architecture Insights

- **Rules live in `src/lib`.** Pure rules there are unit tested, services in `src/lib/services` are smoke-tested, and the islands consume the results. Period bucketing, axis ticks, the selection limit and stale-selection reconciliation fit as pure functions in `src/lib` (for example a new `measurement-chart.ts`).
- **Preferences** are saved to localStorage plus a mirrored cookie, so the server's first render matches. Keys are scoped by account, and by trainee where the choice is per trainee.
- **Collapsible tiles** are server-rendered `<details>` with an inline script, not React.
- **Reads stay row-level-security-bound** (security-invoker RPC, trainee id from the server for trainees, `trainee` param for trainers).

## Historical Context (from prior changes)

- `context/archive/2026-09-27-trainee-measurement-delta/plan.md:43`: kept charts and trend summaries out of scope at the time. Still true: nothing was built since.
- `context/archive/2026-10-10-query-optimization/plan-brief.md`:
  - Added `measurement_months` and removed the 1000-row walk. Supported by `services/measurements.ts:239` and the migration.
  - Put a new index out of scope. Still no index beyond the unique one.
- `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/plan-brief.md`:
  - Introduced a Monday-first week strip and kept one-month paging. The one-month paging is still supported.
  - The rendered week strip is **contradicted** by current code: its helpers survive only in tests.
  - Not storing the highlighted day and adding no new date library were explicit decisions there.
- `context/archive/2026-10-20-default-values-changes/plan-brief.md`:
  - The add form starts open, a saved choice wins, and a server error forces it open. Supported by `measurement-page.ts:80-88` and `TraineeJournal.astro:68,114`.
  - Known quirk: localStorage wins over the cookie after paint.
- **Roadmap intent sentence** (`roadmap.md:25`), "The journal shows a week of day buttons": **partial**. The month grid exists in the form's date picker; the week of day buttons is not rendered on the list.

## Related Research

None found in sibling change folders. The archived plan-briefs above were read; their full research.md files were not read.

## Open Questions

These are product choices for `/10x-plan`, mostly also listed in `roadmap.md:638`:

1. **Chart library.**
   - recharts via `npx shadcn@latest add chart` brings in a new dependency. `context/foundation/infrastructure.md:74` records production-only breakage from a CommonJS package and from Cloudflare Auto Minify on island hydration, so it would need smoke and e2e verification on the preview.
   - Hand-drawn SVG adds no dependency.
2. **Y-axis.** Labelling every 5 up to 300/400 gives 59–81 ticks. Options: grid lines every 5 with sparser labels, an axis fitted to the data rounded to multiples of 5, or the full input range. Also decide where the axis starts (0 or the input minimum).
3. **Colour.** 5 chart tokens for 8 charts: one shared colour, reusing tokens across charts, or adding `--chart-6..8` in light and dark.
4. **The "x" limit** on checked entries, and what happens when a selection spans months or periods.
5. **Period controls.** Are week, year and years new controls on the tile, independent of the list's month? Must the default follow the list month when it changes?
6. **Trainer.** Does a linked trainer see the charts? Row-level security already permits the read.
7. **Remembered choices.** What is stored (period, collapsed state, selected ids)? localStorage only, or with a cookie mirror for the first server render? Keys follow `tm.measurements.charts.*.<account>.<trainee>`.
   - A stale selection must drop deleted or missing ids when it is reconciled against fetched entries.
8. **X-axis density.** What does "very many" mean as a threshold for switching to day/week/month buckets?
9. **Row cap.** Does a years range need paging past `max_rows = 1000`, or a server-side cap or aggregation? The hosted `max_rows` value was not inspected.
