---
change_id: user-profile-rework
title: Avatar menu with Profile Details and Settings change-password tabs
status: implementing
created: 2026-10-26
updated: 2026-10-26
archived_at: null
---

## Notes

1) usunięcie z menu profile oraz signout, zastepienie ich awatarem na który gdy kilknę otwiera sie menu kontekstowe: Profile, Settings, Sign out.
Ikona awatara ma istnięc w widoku desktop obok Measurmenets, a w mobilnym obok harburgera
2) sekcja Profile ma zawierać poziomie menu Details, a w nim - formularz email (bez możliwości zmiany), imię oraz nazwisko które mogę zmienić
3) sekcja Settings ma zawierać poziome, wyśordkowane  menu z change password, a tam formularz dotychczasowej zmiany hasła
4) Sign out - pozostaje z tą samą funkcją wylogowania
5) rezygnacja z nagłówków Profile po kliknięciu w awatar, nie ma być również tego w Details, Settings.
6) sekcja Details oraz Settings mają mieć u góry poziomie menu z shadcn z dekorcją aktualnie wybranej opcji
