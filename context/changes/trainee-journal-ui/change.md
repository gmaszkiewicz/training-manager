---
change_id: trainee-journal-ui
title: Trainee journal visual contract
status: impl_reviewed
created: 2026-09-29
updated: 2026-09-29
archived_at: null
---

## Notes

Roadmap **S-09** (MS-03). One view: the trainee journal on `/dashboard` when the profile role is trainee. Files: `src/pages/dashboard.astro` (the trainee branch and the shared shell that branch renders inside), `src/components/measurements/MeasurementForm.tsx`, `src/components/measurements/MeasurementList.astro`.

Token source: the existing system in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components live in `src/components/ui`. Extend that system. Do not add a second palette and do not run `shadcn init` again.

The trainer branch in the same page is a later change.
