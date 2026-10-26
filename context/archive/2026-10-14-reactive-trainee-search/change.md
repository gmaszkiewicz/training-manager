---
change_id: reactive-trainee-search
title: Show matching unlinked trainee emails as the trainer types
status: archived
created: 2026-10-14
updated: 2026-10-15
archived_at: 2026-10-15T05:23:12Z
---

## Notes

1) A trainee search that shows trainee emails matching the character sequence typed into the search field. When more emails match that sequence, show only the first 10, and do not show trainees who are already linked.
2) Remove the "Find trainee by email" text above the search and use it as the placeholder in the search field.

**View:** the trainee email finder on `/measurements`, markup in `src/components/trainer/TrainerPanel.astro` (the "Find trainee by email" heading and the email input). One view.

**Token source:** existing design system. Values live in `src/styles/global.css` (`:root` / `.dark`, published through `@theme inline`). Shared components live in `src/components/ui`.

**Slice:** S-29 · **MS-21** — user can type a character sequence into the trainee search and see matching emails, at most the first 10, without trainees who are already linked, and read Find trainee by email as the field placeholder.

https://github.com/gmaszkiewicz/training-manager/issues/95
