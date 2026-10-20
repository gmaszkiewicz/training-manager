# Manual checklist — phone-width menus (Safari iOS + Firefox)

CI proves these interactions on Desktop Chromium at 360×800 only. Complete this checklist on a real device or engine before treating Risk A as closed.

## Setup

1. Sign in as a trainee with at least one measurement (or add one).
2. Open `/measurements` at phone width (or a real phone).
3. Confirm the top bar shows the hamburger (Menu), not the inline Sign out.

## Safari iOS

- [ ] One tap on **Menu** opens the menu and shows **Sign out** (no second tap).
- [ ] One tap on a row’s **Actions** (⋯ under the date) opens the menu and shows **Edit** and **Delete**.
- [ ] Choosing **Edit** or **Delete** navigates as expected; **Sign out** signs out.

## Firefox (phone width or mobile)

- [ ] Same **Menu** → **Sign out** first-tap check.
- [ ] Same row **Actions** → **Edit** / **Delete** first-tap check.

## Out of scope for this checklist

- Kitchen-sink screens
- Screenshot or visual diffs
- Full multi-browser matrix of every page
