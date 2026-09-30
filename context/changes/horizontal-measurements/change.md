---
change_id: horizontal-measurements
title: Measurements and linked trainees display in a row
status: implementing
created: 2026-09-30
updated: 2026-09-30
archived_at: null
---

## Notes

S-12. user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row. PRD refs: MS-06.

Widok: dziennik trenującego na `/dashboard` (`src/components/journal/TraineeJournal.astro`). Formularz to `src/components/measurements/MeasurementForm.tsx`, lista to `src/components/measurements/MeasurementList.astro`. Lista jest współdzielona z panelem trenera (`src/components/trainer/TrainerPanel.astro`); orientacja wyświetlania zmienia się w tym jednym komponencie, więc obejmuje oba miejsca. Wpis pomiaru jest tylko u trenującego.

Źródło tokenów: `src/styles/global.css` (`:root` / `.dark`, publikowane przez `@theme inline`). Komponenty: `src/components/ui`. Istniejący design system — bez drugiej palety.

główna zmiana to zmiana orientacji wpisywania oraz wyświetlania pomiarów u trenujacego oraz trenera.
Pomiary wprowadzane oraz wyświetlane są w kolumnie, chce aby to było w poziomie.

Podlinkowani trenujący na panelu trenera (`src/components/trainer/TrainerPanel.astro`, lista `trainerLinks`) są dziś jeden pod drugim. Mają być obok siebie, w jednym poziomym rzędzie przewijanym w bok, wewnątrz tej samej karty. Formularz linkowania (email i Link trainee) zostaje nad tym rzędem. Kolejność, wybór i adresy się nie zmieniają.
