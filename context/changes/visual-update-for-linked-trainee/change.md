---
change_id: visual-update-for-linked-trainee
title: Style the linked trainee list like the month field
status: implementing
created: 2026-10-12
updated: 2026-10-12
archived_at: null
---

## Notes

Lista podlinkowanych trainne przez trenera poiwnna wizualnie wyglądać jak pole z miesiącem oraz rokiem nad zapisanymi wpisami - na środku pole z emailem, kliknięcie w niego rozwija listę podopiecznych - jeśli jest więcej niż 6 podopiecznych to m być suwak, strzelki lewo prawo. Lista powinna znajdować sie na srodku pod napisem Body measurments.

**View:** the linked-trainee list on the trainer measurements screen (`/measurements`), markup in `src/components/trainer/TrainerPanel.astro` under the "Body measurements" heading.

**Token source:** existing design system. Values live in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components live in `src/components/ui`.

**Motif:** the month field above saved entries in `src/components/measurements/MeasurementBrowser.tsx` (centered label, left/right arrows, list that scrolls past six items).

**Slice:** S-28 · **MS-20**

https://github.com/gmaszkiewicz/training-manager/issues/92
