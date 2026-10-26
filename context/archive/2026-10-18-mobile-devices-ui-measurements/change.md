---
change_id: mobile-devices-ui-measurements
title: Adapt the measurements screen for mobile devices
status: archived
created: 2026-10-18
updated: 2026-10-20
archived_at: 2026-10-20T04:39:00Z
---

## Notes

Adapt the measurements screen for mobile devices.

**Slice:** S-32 · **MS-24** — user can open the measurements screen on a phone and still read and enter every field, the difference versus the previous entry, and the trainer controls on that screen.

https://github.com/gmaszkiewicz/training-manager/issues/110

The shipped screen is the Accepted layout and Accepted chrome in `plan.md`. The original stack, the `calc(80rem + 4px + 15px)` cutoff, and the `w-56` / `w-28` columns are history.

- The breakpoint is `77.5rem` (1240px). The card is `w-full max-w-[74rem] p-4` at every width. There is no wide `w-max` floor.
- Below that width the date is full width and the eight metrics sit in a sideways strip. Weight stays in the viewport; the rest are reached by scrolling the strip. At `77.5rem` the date is `9.75rem`, each metric is `5.5rem`, and they share one row that does not scroll.
- Saved entries are a table. The checkbox and the date stay put while the metrics scroll. Below the breakpoint the date is the day and the time on two lines, and Edit and Delete sit in a menu under the date. At the breakpoint the date is one line and Edit and Delete are their own column. The note is an icon; its text opens in a dialog. No delta is an em dash. An unchanged value is `0.0`.
- The add form is a disclosure titled "Add your next measurement". Open or closed is remembered. A server error leaves it open. A value outside the existing limit shows that limit under the field.
- A trainer email truncates at every width, and the wide in-flow sizer is not restored. An empty search shows "Enter an email address".
- Home, measurements, profile, sign-in, sign-up, confirm-email, and reset-password use the canvas background and a `74rem` column. Below `77.5rem` the top-bar links sit in a Menu button.
- The journal toasts "Could not load your measurements" when it has no measurements. The trainer panel toasts "Could not load trainees", "Could not load measurements", and "No trainee with that email". A later month or page fetch that fails leaves the current page in place with no toast.
- The footer libraries control opens a dialog with a transparent backdrop. It closes on the dialog itself or Close, and stays open when the click is inside the list.
- Commit `71d4e14` refreshes `package-lock.json` only. `package.json` is unchanged. The refresh is transitive and is not part of the screen contract.
