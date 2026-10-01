---
change_id: measurement-copy-polish
title: Polish measurement screen copy and layout
status: implemented
created: 2026-09-30
updated: 2026-10-01
archived_at: null
---

## Notes

S-13. Outcome: user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry. PRD refs: MS-07.

Kosmetyka ekranu pomiarów (dziennik trenującego, panel trenera, wspólny pasek). Tokeny: `src/styles/global.css`. Komponenty: `src/components/ui`.

1. Powitanie bez roli: "Hello, guest" oraz "Hello," i email.
2. U trenera nagłówek "Find trainee by email", bez etykiety Email; "Body measurements" nad powiązanymi emailami.
3. Link trainee na całą szerokość pola, jak Add measurement (`w-full`).
4. Widoczny napis Dashboard i adres `/dashboard` → `/measurements`, także przekierowania z API.
5. Nagłówek trenującego: "Add your next measurement" (angielski, jak reszta UI).
6. Delta pod wartością, `font-semibold`.
7. Jednostka przy nazwie pola, wartość bez jednostki.
8. Data w szerszej kolumnie, ikona kalendarza nie nachodzi na dzień.
