---
project: Training Manager
version: 1
status: draft
created: 2026-09-26
updated: 2026-11-03
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: trainee-delta-trainer-preview
milestone_seq: 1
milestone_status: open
---

# Roadmap: Training Manager

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Trainee delta and trainer preview** — Status: open

- **Intent:** A trainee can record body measurements and see the up/down difference versus the previous entry, and a trainer who linked that trainee can preview the same list. A visitor opening the public home sees Training Manager and can go to sign-in or sign-up. Sign-in, registration, and email confirmation use that same visual contract instead of the starter glass card. The trainee journal on `/dashboard` uses that contract too, and the trainer panel on the same route uses the trainee journal's contract instead of the starter glass card. The same top bar appears on the public home, sign-in, sign-up, and both dashboards: a guest sees "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer sees "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email. A trainee enters the measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel. The comparison after an edit or a delete, measurement ownership, and refusal of a create dated after tomorrow are covered by the archived test rollout. A maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in. A measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied. One persisted weight edit changes the listed difference. A trainee records each measurement with a date and time; creation time stays separate and immutable; a second entry with the same date and time is refused. The measurement list shows one calendar month at a time, paged 5, 10, or 15, newest first, and a linked trainer sees that same page. The trainee and a linked trainer still see that same month page — the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page — while the list is built without walking the whole journal. A person at sign-in can request a password reminder, and a signed-in user can change their password from Profile in the menu between Measurements and Sign out. Profile only gains that password change here, so later Profile features can be added beside it. While filling in a new measurement, a trainee sees a preview of the difference versus the previous entry chosen from the date typed for that new entry. The journal shows a week of day buttons, and clicking the month name opens that month's grid. Date and time stay one field, and its popup shows the month grid and the time together. Each saved entry shows its values centered with the same icons as a new measurement. A trainer sees linked trainees as a centered email field under Body measurements, in the same control as the month and year above saved entries: clicking the email opens the list, left and right arrows move through it, and more than six trainees scroll. A trainer typing in the trainee search sees emails matching that character sequence, at most the first 10, and does not see trainees who are already linked. Find trainee by email is the placeholder in that field, not a heading above it. While adding a measurement, a field error appears above Weight kg, Chest cm, and the rest as soon as the value is invalid, in a reserved line that does not shift the form, and active buttons stand apart from inactive ones. A reader can follow the project's current information in the README under the current headings, and each roadmap slice issue carries the slice tag with information taken from this roadmap. The north-star label stays only on the slice this roadmap marks. A trainee and a linked trainer can use that same measurements screen on a phone. The add form on that screen starts open, and the list starts at five entries per page, for the trainee and for a linked trainer. A maintainer can follow a refreshed test plan and run expanded application tests, and a user on Safari for iOS can open the hamburger and row actions on the first tap. A signed-in user opens Profile, Settings, and Sign out from an avatar menu beside Measurements on desktop and beside the hamburger on a phone, edits their first and last name on Profile next to a read-only email, and changes their password on Settings. On an Avatar tab beside Details in Profile, a signed-in user uploads their own PNG, JPEG, or WebP image of at most 2 MB, sees it in the top-bar avatar instead of the initials, and can remove it to get the initials back; the top-bar greeting reads their name instead of their email when a name is saved. From the avatar menu, a signed-in user opens a Hub whose first section is Collaborations: a trainer sees linked and pending trainees, five per page, and can cancel a pending request or unlink a trainee; a trainee sees their trainers, five per page, and accepts or declines a link request. Finding a trainee by email sends a link request instead of linking at once. A signed-in user sees a bell between the menu and the avatar with the number of unread notifications; with none unread the bell stays without a badge. Clicking it lists the notifications and offers a way to all notifications in Hub → Notifications, and clicking one marks it read and opens the page it came from. Hub → Notifications, beside Collaborations, lists them in a table like the measurements list, paged 5, 10, or 15, with a checkbox per row and one for all, so the selected ones can be marked read or deleted for good. A trainer is notified when a link request is accepted or declined and when a trainee unlinks; a trainee is notified when a trainer sends a link request or unlinks. In Hub → Collaborations, an Access column split by dashboard (Measurements now; Nutrition, Training, and Planning later) replaces Status: finding a trainee asks for read access to measurements, the linked status reads Read, each dashboard has its own action button, and Revoke replaces Unlink and Remove, in notifications and toasts too. On the measurements screen, a Charts tile above the add form and the entries list shows eight line charts, one per measurement field, for the selected week, month, year, or years (the selected month by default); it collapses like the add form, hovering a line shows each entry's point with its values and the difference versus the previous entry, Visualize under the list charts only the entries checked there, Clear returns to the whole month, and the browser remembers those choices. The add form opens with weight and every circumference copied from the previous entry, and stays empty when there is no earlier entry. A signed-in page loads with fewer sequential calls to Supabase: the Worker runs near the database, the session is verified without a call to the auth server, and independent reads on the measurements screen run together, while every screen shows the same data as before. Profile → Details shows the user's app role, trainee or trainer, as a read-only field above the email, styled like the email field with a matching role icon. Icons across the app come from Lucide through the shadcn/ui components, and a user can switch the whole app to a dark theme. A separate Top changes tile beside the line charts shows four radial charts — top weight gain, top circumference gain, top weight loss, and top circumference loss — over a week, month, year, or the last 5 years, with a legend on each chart and a filter on the circumference charts. On a Components screen beside the password change in Settings, a signed-in user switches each module — Measurements, Nutrition, and Training and Planning not yet built — on or off, which shows or hides it in the menu, and picks off or a version for each of its components; a preview version stays off until chosen and carries a red badge on its tile with a tooltip warning that it may contain bugs. The add form and the entries list become two separate tiles, New measurements and Measurements.
- **Source materials:** `context/foundation/prd.md` (v1); `context/foundation/test-plan.md` (phases 1–4); user description for the public home (MS-01); user description for the auth entry screens (MS-02); user description for the trainee journal UI (MS-03); user description for the trainer panel UI (MS-04); user description for the shared top bar (MS-05); user description for horizontal measurement entry and display (MS-06); user description for measurement copy and the `/measurements` route (MS-07); user description for blocking merge when CI fails (MS-11); user description for end-to-end test configuration (MS-12); test plan phase 4 for a migration that preserves existing measurement rows (MS-13); test plan phase 5 for one persisted weight edit that changes the listed difference (MS-14); user description for measurement date and time (MS-15); user description for measurement-list query optimization (MS-16); user description for password reminder and Profile password change (MS-17); user description for the entry-delta preview (MS-18); user description for the journal calendar and saved entry display (MS-19); user description for the linked trainee picker (MS-20); user description for the reactive trainee search (MS-21); user description for measurement display (MS-22); user description for the README and slice-issue sync (MS-23); user description for the measurements screen on a phone (MS-24); user description for the default accordion and page size (MS-25); user description for the test-plan refresh, expanded application tests, and iOS Safari menu fix (MS-26); user description for the avatar menu with Profile details and Settings (MS-27); user description for the Avatar tab in Profile (MS-28); user description for the Hub with Collaborations (MS-29); user description for the notification system (MS-30); user description for per-dashboard access in Collaborations (MS-31); user description for measurement charts (MS-32); user description for prefilling a new measurement from the previous entry (MS-33); user description for fewer Supabase round trips per request (MS-34); user description for the read-only role in Profile details (MS-35); user description for the small redesign with Lucide icons and a dark theme (MS-36); user description for the top-changes radial charts (MS-37); user description for the component version system (MS-38); user description for the avatar menu reorganization (MS-39); user description for Find trainee in the top bar (MS-40); user description for finding a trainee by first and last name (MS-41)
- **Done when:** every S-NN below is `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, US-01, MS-01, MS-02, MS-03, MS-04, MS-05, MS-06, MS-07, MS-08, MS-09, MS-10, MS-11, MS-12, MS-13, MS-14, MS-15, MS-16, MS-17, MS-18, MS-19, MS-20, MS-21, MS-22, MS-23, MS-24, MS-25, MS-26, MS-27, MS-28, MS-29, MS-30, MS-31, MS-32, MS-33, MS-34, MS-35, MS-36, MS-37, MS-38, MS-39, MS-40
  - MS-01: Remove the starter welcome and replace the public home with Training Manager's own page. A reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off.
  - MS-02: Sign-in, registration, and email confirmation use the same visual contract as the public home, instead of the starter glass card.
  - MS-03: The trainee journal on `/dashboard` uses the same visual contract as the public home and auth entry screens, instead of the starter glass card.
  - MS-04: The trainer panel on `/dashboard` uses the same visual contract as the trainee journal, instead of the starter glass card.
  - MS-05: One top bar, the same as on the public home, on `/`, both dashboards, sign-in, and sign-up. A guest reads "Hello guest" with Home, Sign in, and Sign up. A signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out lives only in that bar. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email.
  - MS-06: The trainee enters measurement fields in a horizontal row, and both the trainee and a linked trainer read each entry's fields in a horizontal row instead of a column. Trainees linked by a trainer sit beside each other in one horizontal row on the trainer panel.
  - MS-07: The measurements screen and the redirects that open it use `/measurements`. The greeting has no role name. The trainer finds a trainee by email, and each field shows its unit beside the name with a clearer difference versus the previous entry.
  - MS-08: Prove the remaining chain, the oldest entry, and the trainer's copy of that chain.
  - MS-09: Prove ownership on read and write, and that an email link cannot open the wrong journal; confirm anonymous smoke still hits the current journal route.
  - MS-10: Prove an illegal entry is refused and not stored, on both entry paths.
  - MS-11: A pull request to `main` whose `ci` or `smoke` check fails cannot be merged, and a direct push to `main` is rejected. The repository is public so GitHub Free can enforce that rule. No second reviewer is required, and the branch does not have to contain the latest `main`.
  - MS-12: Add a change for end-to-end test configuration.
  - MS-13: Prove a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied.
  - MS-14: Prove one persisted weight edit changes the listed difference.
  - MS-15: A trainee records a measurement with date and time; `created_at` stays immutable as the entry creation time; a second measurement with the same date and time is refused.
  - MS-16: The trainee and a linked trainer still see the same calendar-month page — the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page — while the list is built without walking the whole journal.
  - MS-17: Password reminder from the sign-in screen, and password change for a signed-in user. Password change is available from Profile in the menu between Measurements and Sign out. Profile will gain more functionality later, so this anchor only adds the password-change option and leaves room for that.
  - MS-18: While a trainee fills in a new measurement entry, a preview shows the difference versus the previous entry chosen from the date typed for that new entry.
  - MS-19: The journal shows a week of day buttons. Clicking the month name opens that month's grid. Date and time stay one field, and its popup shows the month grid and the time together. Saved entries show centered values with the same icons used when adding a new measurement.
  - MS-20: Linked trainees sit in the center under Body measurements, in the same control as the month and year field above saved entries. The center shows the email. Clicking it opens the list of trainees. Left and right arrows move through that list. When more than six trainees are linked, the list scrolls.
  - MS-21: A trainee search shows trainee emails matching the character sequence typed into the search field. When more emails match that sequence, show only the first 10, and do not show trainees who are already linked. The text Find trainee by email is the placeholder in the search field, not a heading above it.
  - MS-22: When adding a new measurement, errors show immediately above the labels Weight kg, Chest cm, and the rest, instead of only after clicking Add. A light margin between "Add your next measurement" and those labels keeps each error on one line without shifting the layout. Active and inactive buttons stand out more from each other.
  - MS-23: Update readme.md with the project's current information, keeping the current structure. Update GitHub issues so each roadmap slice has the slice tag, and refresh each issue's information to match the current roadmap. Add north-star only when the roadmap marks that slice.
  - MS-24: Adapt the measurements screen for mobile devices. A trainee and a linked trainer still use that same web screen on a phone, with every field and the difference versus the previous entry. This is not a separate mobile app.
  - MS-25: The measurement accordion starts open, and the measurements list starts at five entries per page, for the trainee and for a linked trainer.
  - MS-26: Refresh the test plan, expand application tests, and fix Safari on iOS so the hamburger and row actions respond on the first tap.
  - MS-27: Profile and Sign out leave the top-bar menu, and an avatar replaces them. Clicking the avatar opens a menu with Profile, Settings, and Sign out. On desktop the avatar sits beside Measurements; on a phone it sits beside the hamburger. Profile has a horizontal menu with Details, where the email is shown read-only and the first and last name can be changed. Settings has a horizontal, centered menu with Change password, holding the existing password-change form. Sign out signs the user out as before. Opening Profile from the avatar shows no Profile heading, and Details and Settings show no heading either. Details and Settings each carry the shared shadcn horizontal menu at the top, which marks the selected option.
  - MS-28: Add an Avatar subpage in Profile, as the next tab beside Details, where the user can upload their own avatar. The top-bar greeting reads the user's name when one is saved.
  - MS-29: Add a Hub screen opened from the avatar menu, with a section menu like Settings whose first option is Collaborations. A trainer sees the trainees linked to them and those who have not yet accepted (status pending), can cancel a pending request, and can unlink a trainee, which ends the trainer's preview of that journal. A trainee sees the trainers they are linked to and accepts or declines a link request with a check or an X button. Finding a trainee by email no longer links them at once: it sends a link request and shows the toast "Your request has been sent to <email>". Both lists page like the measurements list, with a per-page choice that offers only 5.
  - MS-30: A notification system tells the trainee or trainer about events. A bell sits between the menu and the avatar and shows the number of active (unread) notifications; with no active notifications the bell stays without a badge. Clicking the bell lists the notifications and has a button to all notifications in Hub → Notifications. Clicking one notification marks it read and opens the page it came from, for example Collaborations. The Hub gets a Notifications option beside Collaborations, listing notifications in a table like the measurements list, with a checkbox per row and one for all, so the selected ones can be marked read or deleted for good; it pages 5, 10, or 15 per page. Events for now: a trainer is told that their link request was accepted or declined and that trainee X unlinked; a trainee is told that trainer X sent a link request and that trainer X unlinked.
  - MS-31: In Hub → Collaborations, a nested Access column replaces the Status column, split by dashboard: Measurements, Nutrition, Training, and Planning. Only Measurements works now; the other three are designed for later. Finding a trainee on the measurements screen sends them a request for read access to measurements. The linked status becomes Read, the trainer's Unlink becomes Revoke, and the trainee's Remove becomes Revoke too. Each access dashboard has its own action button. A dashboard's access types are listed when they fit; when they stop fitting, they collapse the way the measurement Note cell does, with an icon that stands for access instead of the note icon, opening them in a dialog. Notifications and toasts use the new names.
  - MS-32: Eight line charts show the progression of measurements across all entries in the selected week, month, year, or years, defaulting to the currently selected month. Each chart shows one value: weight, chest, and the rest. The x-axis is divided at least by the entries' dates; when there are very many, it is divided per day for a week, per week for a month, per month for a year, and per month for years. The y-axis is divided every 5, up to the maximum allowed by that measurement's input range. Hovering a line shows the points where entries were made, with a tooltip of the entry's values and the difference versus the previous entry. The charts sit in a separate tile above the add-measurement tile and the entries list, and collapse like an accordion, as Add your next measurements does, hiding every chart. A Visualize button under the measurements list charts only the entries checked there, up to a set limit; a Clear button beside it restores the charts of every measurement in the selected month. The browser remembers those choices.
  - MS-33: Entering a new measurement checks whether a previous measurement exists and, when it does, prefills weight and the circumferences with that entry's values. With no earlier measurement, the new entry's fields stay empty.
  - MS-34: Optimize database queries to relieve the free-tier Supabase, which answers in about 300 ms: a signed-in page makes fewer sequential round trips to Supabase.
  - MS-35: Profile → Details shows the user's app role above the email field. The role cannot be changed, is displayed the same way as the email, and carries a trainee or trainer icon in the style of the other Details icons.
  - MS-36: Small icon changes using shadcn/ui and Lucide icons, and a dark theme for the app.
  - MS-37: A separate tile, styled like the line charts tile, shows four shadcn radial charts of the largest and smallest changes within the selected week, month, year, or the last 5 years: top weight gain, top gain across all circumferences on one chart, top weight loss, and top loss across all circumferences on one chart. The circumference charts can be filtered, every chart has a legend, and the buttons and fields match the line charts tile.
  - MS-38: A Components screen in Settings, beside Change password, chooses which component versions the site shows, grouped by module: measurements, nutrition, training, and planning. A whole module can be switched off, and it then disappears from the menu. Every module except measurements is off by default because it is not implemented yet. Each module's table lists the component name and a choice box with off or a version: new measurement v.1.0, measurements v.1.0, progression v.1.0, and top changes v.0.1 (preview). A preview version is unselected by default, so that component is hidden. One Save button under the table saves every row, as on Details and Avatar, with a toast as everywhere. A preview version is also marked on its collapsible tile with a red badge and a tooltip saying it is a preview and may contain bugs. For this, the Add your next measurements tile and the measurements table become two separate collapsible tiles: New measurements and Measurements.
  - MS-39: The theme switch moves from the top bar into the menu under the user avatar, as an icon plus the word Theme, above Sign out and separated from it by a line. The Hello greeting on the left of the top bar is removed, and the user's name moves to the first item of the avatar menu, with a profile icon beside it, also followed by a separator line. The separate Profile item leaves the avatar menu: clicking the user's name opens Profile.
  - MS-40: Find trainee moves into the top bar, at the top left, as a search field with a magnifier icon and the label Find trainee. Clicking it opens a centered dialog like the Search documentation dialog on ui.shadcn.com; Esc or a click outside closes it. On a phone the field stays if it fits, otherwise only the magnifier shows. The dialog is titled Find trainee, with Request access to a trainee's dashboards below it, and a search field with the placeholder Find trainee by email, first name or last name (search by first and last name comes in a later task). Under it, Request for: four checkboxes — Measurements, Nutrition, Training, and Planning — all disabled except Measurements, and a Request access button at the end.
  - MS-41: Find trainee also searches trainees by first name and last name, not only by email. Each result reads like the Trainee column in Hub → Collaborations, except that a saved first name is shown in full. The trainee choice on the measurements screen presents trainees the same way. Tile headings no longer name the selected trainee, and the module checkboxes under Request for sit in two columns.
  - MS-42: Top progress ships as 0.9 (RC), on by default, with a yellow badge on its tile and the description "Release candidate - it may contain bugs"; the previous Top progress version stays selectable and unchanged. The Circumferences choice box becomes a filter on every Top progress chart, and the Week, Month, Year, and Years choice becomes an arrowed choice box on the right of the tile, like the picker on the left. Month view labels the weight and circumference axis with the days of the largest progress only, at least the first, middle, and last day of the month. In every measurements tile the week, month, year, and last-5-years choice boxes share the width of the longest value ("September 2026") and offer only periods with journal entries, grey with the no-measurements message when there are none. Visualize, Clear, and "x of 15 selected" sit under the measurements table on the left, with a divider line when pagination shows.
  - MS-43: The request header no longer carries `tm.*` cookies of other accounts used in the same browser, and `tm.*` preference cookies are not kept indefinitely.
  - MS-44: On every Top progress chart, bars of the same series keep the colour of their first occurrence when changes span more than one day, instead of turning faded. The legend shows only the colour and what the series describes (weight, a body part), without the gain or loss value and the date.

## Vision recap

A trainee reporting body measurements today sends links and works in generic sheets, so weight and circumferences have to be compared by hand. The product is that up/down difference versus the previous entry — an arrow and the numeric difference next to each measurement — not another list of numbers. A trainer should preview a linked trainee's entries instead of chasing those links.

## North star

The north star — the smallest end-to-end slice that proves the product works, placed as early as its prerequisites allow — is **S-02: user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison.** It sits immediately after a trainee account exists, because that comparison is the product and the sequencing goal is speed.

## At a glance

| ID   | Change ID                                       | Outcome (user can …)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Prerequisites          | PRD refs                             | Status   |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------ | -------- |
| S-01 | trainee-signup                                  | user can register with email and password as a trainee and open an empty journal                                                                                                                                                                                                                                                                                                                                                                                                                       | —                      | FR-001                               | done     |
| S-02 | trainee-measurement-delta                       | user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison                                                                                                                                                                                                                                                                                                                                             | S-01                   | US-01, FR-003, FR-006                | done     |
| S-03 | trainer-signup                                  | user can register with email and password and pick the trainer role                                                                                                                                                                                                                                                                                                                                                                                                                                    | S-01                   | FR-002                               | done     |
| S-04 | trainer-link-preview                            | user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry                                                                                                                                                                                                                                                                                                                                                   | S-02, S-03             | FR-007, FR-008                       | done     |
| S-05 | edit-measurement-entry                          | user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values                                                                                                                                                                                                                                                                                                                                                          | S-02                   | US-01, FR-004                        | done     |
| S-06 | delete-measurement-entry                        | user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry                                                                                                                                                                                                                                                                                                                                                                                    | S-02                   | US-01, FR-005                        | done     |
| S-07 | product-home                                    | user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome                                                                                                                                                                                                                                                                                                                                                                  | —                      | MS-01                                | done     |
| S-08 | auth-signin-form                                | user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card                                                                                                                                                                                                                                                                                                                                                          | —                      | MS-02                                | done     |
| S-09 | trainee-journal-ui                              | user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard`                                                                                                                                                                                                                                                                                                                          | S-02, S-08             | MS-03                                | done     |
| S-10 | trainer-panel-ui                                | user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`                                                                                                                                                                                                                                                                                                                                               | S-04, S-09             | MS-04                                | done     |
| S-11 | shared-topbar                                   | user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email                                                          | S-07, S-08, S-09, S-10 | MS-05                                | done     |
| S-12 | horizontal-measurements                         | user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel                                                                                                                                                                                                                                                               | S-09, S-10             | MS-06                                | done     |
| S-13 | measurement-copy-polish                         | user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry                                                                                                                                                                                                                                                                                                      | S-11, S-12             | MS-07                                | done     |
| S-14 | testing-delta-after-edit-delete                 | user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison                                                                                                                                                                                                                                                                                                                             | S-04, S-05, S-06       | MS-08, US-01, FR-004, FR-005, FR-008 | done     |
| S-15 | testing-measurement-access-boundaries           | user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person                                                                                                                                                                                                                                                                                                                                        | S-04                   | MS-09, FR-007, FR-008                | done     |
| S-16 | testing-reject-illegal-measurements             | user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged                                                                                                                                                                                                                                                                                                                                                                                                     | S-02                   | MS-10, FR-003                        | done     |
| S-17 | ci-cd-workflow-updates                          | a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off                                                                                                                                                                                                                                                                            | —                      | MS-01                                | done     |
| S-18 | block-merge-on-failed-ci                        | a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main`                                                                                                                                                                                                                                                                                                                                                                                | —                      | MS-11                                | done     |
| S-19 | e2e-setup                                       | a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in                                                                                                                                                                                                                                                                                                                                                                   | —                      | MS-12                                | done     |
| S-20 | testing-hosted-migration-preserves-measurements | a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied                                                                                                                                                                                                                                                                                                                                                                              | S-02, S-16             | MS-13                                | done     |
| S-21 | testing-saved-edit-reaches-the-arrow            | a persisted weight edit changes the listed difference                                                                                                                                                                                                                                                                                                                                                                                                                                                  | S-05, S-14             | MS-14, US-01, FR-004                 | done     |
| S-22 | measured-on-with-time                           | user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused                                                                                                                                                                                                                                                                                                                                                | S-02                   | MS-15                                | done     |
| S-23 | pagination-and-filter-measurements              | user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list                                                                                                                                                                                                                                                                                                                                                                   | S-13, S-22             | FR-009                               | done     |
| S-24 | query-optimization                              | user can open the same calendar-month page as today, with the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, and a linked trainer sees that same page, while the list is built without walking the whole journal                                                                                                                                                                                                     | S-23                   | MS-16, FR-009                        | done     |
| S-25 | handle-change-and-reset-pass                    | user can request a password reminder from sign-in, and a signed-in user can change their password from Profile in the menu between Measurements and Sign out                                                                                                                                                                                                                                                                                                                                           | S-08, S-11             | MS-17                                | done     |
| S-26 | preview-for-new-entry                           | user can see a preview of the difference versus the previous entry, chosen from the date typed for the new entry, while filling in that entry                                                                                                                                                                                                                                                                                                                                                          | S-02, S-13, S-22       | MS-18                                | done     |
| S-27 | calendar-upgrade-and-visual-fixes               | user can move through the journal on a week of day buttons, open the month grid from the month name, set date and time together in one field, and read each saved entry's values centered with the same icons as a new measurement                                                                                                                                                                                                                                                                     | S-23, S-26             | MS-19                                | done     |
| S-28 | visual-update-for-linked-trainee                | user can open a centered email field under Body measurements, click it to list linked trainees, and move through that list with left and right arrows; when more than six trainees are linked, the list scrolls                                                                                                                                                                                                                                                                                        | S-12, S-13, S-27       | MS-20                                | done     |
| S-29 | reactive-trainee-search                         | user can type a character sequence into the trainee search and see matching emails, at most the first 10, without trainees who are already linked, and read Find trainee by email as the field placeholder                                                                                                                                                                                                                                                                                             | S-04, S-13             | MS-21                                | done     |
| S-30 | some-display-changes                            | user can see a field error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and can tell active buttons from inactive ones                                                                                                                                                                                                                                                                                                     | S-27                   | MS-22                                | done     |
| S-31 | update-project-info                             | a reader can follow the project's current information in the README under the current headings, and each roadmap slice issue carries the slice tag with information taken from this roadmap; the north-star label stays only on the slice this roadmap marks                                                                                                                                                                                                                                           | —                      | MS-23                                | done     |
| S-32 | mobile-devices-ui-measurements                  | user can open the measurements screen on a phone and still read and enter every field, the difference versus the previous entry, and the trainer controls on that screen                                                                                                                                                                                                                                                                                                                               | S-28, S-29, S-30       | MS-24                                | done     |
| S-33 | default-values-changes                          | user can open the measurements screen with the add form already open and five entries per page, and a linked trainer sees that same default                                                                                                                                                                                                                                                                                                                                                            | S-23, S-32             | MS-25                                | done     |
| S-34 | test-app-refresh-and-fixes                      | a maintainer can follow a refreshed test plan and run expanded application tests, and a user on Safari for iOS can open the hamburger and row actions on the first tap                                                                                                                                                                                                                                                                                                                                 | S-19, S-32             | MS-26                                | done     |
| S-35 | user-profile-rework                             | user can open Profile, Settings, and Sign out from an avatar menu beside Measurements on desktop and beside the hamburger on a phone, change their first and last name on Profile next to a read-only email, and change their password on Settings                                                                                                                                                                                                                                                     | S-25, S-32             | MS-27                                | done     |
| S-36 | avatar-select                                   | user can upload their own avatar image on an Avatar tab beside Details in Profile, see it in the top-bar avatar instead of the initials, remove it to get the initials back, and read their name in the top-bar greeting                                                                                                                                                                                                                                                                               | S-35                   | MS-28                                | done     |
| S-37 | hub-collaborations-handle                       | user can open a Hub from the avatar menu with a Collaborations section: a trainer sees linked and pending trainees, five per page, and can cancel a pending request or unlink a trainee; a trainee sees their trainers, five per page, and accepts or declines a link request; finding a trainee by email sends a link request instead of linking at once                                                                                                                                              | S-04, S-29, S-35       | MS-29                                | done     |
| S-38 | drop-link-trainee-by-email                      | a maintainer can rely on the request flow as the only way to create a trainer link: the legacy instant-link database function is gone, and a declined request can be sent again at once with no block                                                                                                                                                                                                                                                                                                  | S-37                   | MS-29                                | done     |
| S-39 | notification-system                             | user can see a bell between the menu and the avatar with the number of unread notifications (no badge when there are none), open it to read the latest notifications and go to the page each one came from, and manage every notification on a Hub Notifications table paged 5, 10, or 15, marking selected ones read or deleting them; a trainer is told when a link request is accepted or declined and when a trainee unlinks, and a trainee is told when a trainer sends a link request or unlinks | S-37, S-38             | MS-30                                | done     |
| S-40 | improvment-for-status-collaborations            | user can see each collaboration's access per dashboard in an Access column of Hub → Collaborations — Measurements now, with Nutrition, Training, and Planning laid out for later — where finding a trainee asks for read access to measurements, a linked trainee reads Read, each dashboard has its own action button, access types that do not fit collapse to an access icon that opens a dialog, and Revoke replaces Unlink and Remove in the panel, notifications, and toasts                     | S-37, S-39             | MS-31                                | done     |
| S-41 | visualization-of-measurements                   | user can open a collapsible Charts tile above the add form with eight line charts, one per measurement field, for the selected week, month, year, or years, hover a line to read each entry and its difference versus the previous entry, chart only the entries checked in the list with Visualize, return to the whole month with Clear, and find those choices kept by the browser                                                                                                                  | S-23, S-27, S-33       | MS-32                                | done     |
| S-42 | prev-values-for-new-measurement                 | user can open the add form with weight and every circumference already filled from their previous entry, and find the fields empty when there is no earlier entry                                                                                                                                                                                                                                                                                                                                      | S-02, S-26, S-33       | MS-33                                | done     |
| S-43 | reduce-supabase-round-trips                     | user can open a signed-in page, the measurements screen above all, noticeably faster because the request makes fewer sequential round trips to Supabase, and sees the same data as before                                                                                                                                                                                                                                                                                                              | S-24, S-42             | MS-34                                | done     |
| S-44 | role-view-in-profile                            | user can read their app role, trainee or trainer, in a read-only field above the email in Profile → Details, with a role icon that matches the other Details icons                                                                                                                                                                                                                                                                                                                                     | S-35                   | MS-35                                | done     |
| S-45 | app-small-redesign                              | user can see icons across the app drawn from Lucide through the shadcn/ui components, and switch the whole app to a dark theme                                                                                                                                                                                                                                                                                                                                                                         | S-11, S-35             | MS-36                                | done     |
| S-46 | top-progress-charts                             | user can open a separate Top changes tile with four radial charts — top weight gain, top circumference gain, top weight loss, top circumference loss — for the selected week, month, year, or last 5 years, read each chart's legend, and filter which circumferences the circumference charts show                                                                                                                                                                                                    | S-41, S-45             | MS-37                                | done     |
| S-47 | component-version-system                        | user can open a Components screen beside Change password in Settings, switch each module — Measurements now, Nutrition, Training, and Planning off until built — on or off to show or hide it in the menu, pick off or a version for each component in one table saved with one button and a toast, and see a red preview badge with a warning tooltip on a preview tile; the add form and the entries list are separate New measurements and Measurements tiles                                       | S-35, S-41, S-46       | MS-38                                | done     |
| S-48 | reorganization-of-component-placement           | user can open the avatar menu, read their name with a profile icon as its first item above a separator and click it to open Profile, which replaces the separate Profile item, switch the theme from a Theme item with an icon above Sign out, set off by a separator, and no longer sees a Hello greeting on the left of the top bar                                                                                                                                                                  | S-35, S-45             | MS-39                                | done     |
| S-49 | find-trainne-on-top-bar                         | user can open Find trainee from a search field with a magnifier at the top left of the top bar (only the magnifier on a phone when the field does not fit), search trainees by email in a centered dialog that Esc or a click outside closes, tick Measurements under Request for (Nutrition, Training, and Planning disabled), and send the request with Request access                                                                                                                               | S-29, S-40, S-48       | MS-40                                | done     |
| S-50 | find-tranne-by-first-and-lastname               | user can find a trainee in Find trainee by first name or last name as well as by email, and read each match, and each trainee in the linked trainee choice, as in the Trainee column of Hub → Collaborations but with the full first name ("Ada Lovelace (ada@example.com)"), read tile headings without the selected trainee's name, and see the Request for checkboxes in two columns                                                                                                                | S-49                   | MS-41                                | done     |
| S-51 | changes-to-measurments-and-progressions         | user can open Top progress 0.9 (RC), on by default with a yellow release-candidate badge, filter every chart by circumference, pick the period with an arrowed choice box on the right of the tile, read Month charts labelled by the days of top progress, and still choose the previous Top progress version; every measurements tile uses same-width period choice boxes that offer only periods with entries, and Visualize, Clear, and the selection count sit on the left under the table        | S-41, S-46, S-47       | MS-42                                | done        |
| S-52 | cookie-cleanup                                  | user can sign in on a browser where another account was used, and the request header no longer carries that account's `tm.*` cookies; `tm.*` preference cookies expire instead of living a year after each write                                                                                                                                                                                                                                                                                       | —                      | MS-43                                | in-progress |
| S-53 | fixes-for-top-progression                       | user can read every Top progress chart with each series' bars in the colour of its first occurrence even when changes span more than one day, and a legend that shows only the colour and what the series describes, without the gain or loss value and the date                                                                                                                                                                                                                                       | S-51                   | MS-44                                | ready       |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                     | Chain                                                                                                     | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | Measurement journal       | `S-01` → `S-02` → `S-05` → `S-06` → `S-22` → `S-23` → `S-24` → `S-26` → `S-27` → `S-30` → `S-41` → `S-42` | Speed puts the comparison (S-02) immediately after the trainee account. S-05 and S-06 can run side by side once S-02 is done. S-22 adds date and time on the same journal after S-02. S-23 pages that journal one month at a time. S-24 keeps that page and builds it without walking the whole journal. S-26 shows that difference while a new entry is being typed; it joins Stream E at S-13 for the measurements screen and does not depend on paging. S-27 replaces the month dropdown with a week strip and puts date and time in one popup; saved values are centered with the same icons. It does not change the difference. S-30 shows field errors above the measurement labels without shifting that row, and makes active and inactive buttons easier to tell apart. S-41 adds a collapsible Charts tile above the add form, with one line chart per measurement field over the selected period and a Visualize/Clear pair under the list; it joins Stream E at S-33 for the accordion default and does not change measurement data. S-42 prefills the add form with weight and circumferences from the previous entry; it joins Stream E at S-33 for the form that starts open. |
| B      | Trainer preview           | `S-03` → `S-04` → `S-37` → `S-38` → `S-39` → `S-40`                                                       | Joins Stream A at S-01 for the trainee account and at S-02 for the list being previewed. S-37 turns the instant link into a request the trainee accepts or declines, and adds a Hub with Collaborations; it joins Stream E at S-29 for the trainee search and Stream F at S-35 for the avatar menu. S-38 drops the legacy instant-link function once S-37 is live. S-39 adds notifications for those link events, a bell in the top bar, and a Notifications section in the Hub; it joins Stream F at S-36 for the bar around the avatar. S-40 replaces the single link status with per-dashboard access in Collaborations and renames Unlink and Remove to Revoke, in notifications and toasts too.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| C      | Public home               | `S-07` → `S-17` → `S-31`                                                                                  | S-17 is the deploy-path task on the same anchor, MS-01. It does not change the public home. S-31 refreshes the README under its current headings and copies each slice issue from this roadmap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D      | Auth entry screens        | `S-08`                                                                                                    | Stands alone: sign-in, registration, and email confirmation do not change measurement data, so this can run beside the remaining journal edits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| E      | Dashboard visual contract | `S-09` → `S-10` → `S-12` → `S-13` → `S-28` → `S-29` → `S-32` → `S-33`                                     | Restyles the measurements screen without changing measurement data. S-10 joins Stream B at S-04: the trainer panel uses the contract S-09 already applied to the trainee journal. S-12 turns the measurement fields on that journal and on the trainer list from a column into a horizontal row. S-13 polishes the copy and moves the screen to `/measurements`. S-28 replaces that horizontal linked-trainee row with a centered email field and joins Stream A at S-27 for the month-field control. S-29 is the trainee search on that screen and joins Stream B at S-04 for who is already linked. S-32 fits that same screen on a phone and joins Stream A at S-30. S-33 opens the add form and starts the list at five entries per page, and joins Stream A at S-23 for the page-size control. Can run beside S-05 and S-06.                                                                                                                                                                                                                                                                                                                                                            |
| F      | Shared top bar            | `S-11` → `S-25` → `S-35` → `S-36` → `S-44` → `S-48` → `S-49` → `S-50`                                     | Joins streams C, D, and E: one bar on the public home, auth entry, and both dashboards. S-25 joins here for the Profile item between Measurements and Sign out, and joins Stream D at S-08 for the sign-in reminder. S-35 replaces Profile and Sign out in that bar with an avatar menu, and joins Stream E at S-32 for the hamburger on a phone. S-36 adds an Avatar tab in Profile whose image replaces the initials in that avatar. S-44 shows the read-only app role above the email in Profile → Details. S-48 moves the theme switch and the user's name into the avatar menu and drops the Hello greeting; it joins Stream J at S-45 for the theme switch. S-49 moves Find trainee into a top-left search field that opens a centered dialog; it joins Stream E at S-29 for the trainee search and Stream B at S-40 for the per-dashboard access request. S-50 lets that dialog search by first and last name and names trainees there and in the trainee choice with the full first name; tile headings drop the trainee's name, and Request for shows its checkboxes in two columns. Does not change measurement data.                                                              |
| G      | Measurement tests         | `S-14` → `S-15` → `S-16` → `S-20` → `S-21`; `S-19` → `S-34`                                               | Rollout order from the test plan. S-20 is phase 4 on MS-13: a seeded measurement row survives the migration under test. S-21 is phase 5 on MS-14: one saved weight edit changes the listed difference. S-19 is the end-to-end test configuration on MS-12 and does not depend on this chain. S-34 refreshes that plan, expands application tests, and restores first-tap menus on Safari for iOS; it joins Stream E at S-32 for the phone measurements screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| H      | Merge gate                | `S-18`                                                                                                    | On MS-11. Blocks merge to `main` when `ci` or `smoke` fails, and rejects a direct push. Parallel with S-17. Does not change the workflow file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| I      | Request latency           | `S-43`                                                                                                    | On MS-34. Cuts sequential Supabase round trips: Worker placement near the database, local session verification in the middleware, and parallel reads on the measurements screen. Follows S-24, which made each list query lean, and joins Stream A at S-42 for the reads the measurements screen makes today. Does not change measurement data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| J      | App theme                 | `S-45`                                                                                                    | On MS-36. Swaps remaining icons for Lucide through the shadcn/ui components and adds a dark theme on the existing `.dark` tokens. Joins Stream F at S-11 and S-35 for where a theme switch sits. Does not change measurement data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| K      | Top changes charts        | `S-46`                                                                                                    | On MS-37. Adds a Top changes tile with four shadcn radial charts beside the S-41 line charts tile, reusing its period controls and styling. Joins Stream A at S-41 and Stream J at S-45 for dark-theme tokens. Does not change measurement data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| L      | Component versions        | `S-47`                                                                                                    | On MS-38. Adds a Settings → Components screen that stores per-user module and component-version choices and gates the menu and the measurements tiles on them. Joins Stream F at S-35 for Settings, Stream A at S-41 for the tiles it splits and gates, and Stream K at S-46 for the first preview component.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Baseline

What's already in place in the codebase as of 2026-09-26 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — per tech-stack.md: Astro + React + TypeScript + Tailwind; scaffold is in the tree (`src/pages`, `src/components`)
- **Backend / API:** partial — per tech-stack.md: Astro SSR; auth routes exist (`src/pages/api/auth/`); no measurement API yet
- **Data:** partial — per tech-stack.md: Supabase Postgres; client is wired; no migrations in the repo
- **Auth:** partial — per tech-stack.md: Supabase email/password; session middleware is present (`src/middleware.ts`); sign-up does not pick trainee vs trainer
- **Deploy / infra:** present — per tech-stack.md: Cloudflare Workers + GitHub Actions as a quality gate (`.github/workflows/ci.yml`)
- **Observability:** absent — no logging library, error tracking, or metrics

## Foundations

No foundation items. The app shell, sign-in, and deployment are already in place (see Baseline). The trainee role, private measurement storage, and the trainer link are introduced in the first slice that uses each of them: S-01, S-02, and S-04.

## Slices

### S-01: Trainee registers

- **Outcome:** user can register with email and password as a trainee and open an empty journal
- **Change ID:** trainee-signup
- **PRD refs:** FR-001
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sign-up already accepts email and password; this slice records the trainee role so later slices can attach a journal to that account.
- **Status:** done

### S-02: Trainee sees the delta versus the previous entry

- **Outcome:** user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison
- **Change ID:** trainee-measurement-delta
- **PRD refs:** US-01, FR-003, FR-006
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** This is the comparison the vision calls the product, placed immediately after a trainee account exists. The slice also stores entries so only that trainee can see them.
- **Status:** done

### S-03: Trainer registers

- **Outcome:** user can register with email and password and pick the trainer role
- **Change ID:** trainer-signup
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Trainer registration extends the role added in S-01. It does not need measurement entries, so it can run beside S-02.
- **Status:** done

### S-04: Trainer links a trainee and previews the list

- **Outcome:** user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry
- **Change ID:** trainer-link-preview
- **PRD refs:** FR-007, FR-008
- **Prerequisites:** S-02, S-03
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Preview reads the list S-02 already shows, including notes, and stays read-only: the trainer cannot create, edit, or delete entries. Linking is by email with no accept step.
- **Status:** done

### S-05: Trainee edits an entry

- **Outcome:** user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values
- **Change ID:** edit-measurement-entry
- **PRD refs:** US-01, FR-004
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Editing changes the values the comparison uses, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** done

### S-06: Trainee deletes an entry

- **Outcome:** user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry
- **Change ID:** delete-measurement-entry
- **PRD refs:** US-01, FR-005
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-05, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** After a delete, the comparison uses the previous entry that is still there, so this follows the list in S-02. The action stays on the trainee who created the entry.
- **Status:** done

### S-07: Public home replaces the starter welcome

- **Outcome:** user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome
- **Change ID:** product-home
- **PRD refs:** MS-01
- **Prerequisites:** —
- **Parallel with:** S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The public home still describes the starter, so a visitor cannot tell this is Training Manager until they sign in. It does not change measurement data, so it can run beside the remaining journal edits.
- **Status:** done

### S-08: Auth entry screens leave the starter glass card

- **Outcome:** user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card
- **Change ID:** auth-signin-form
- **PRD refs:** MS-02
- **Prerequisites:** —
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The three screens still use the starter glass card, so a visitor who leaves the public home hits a different visual. Field styles are shared with the journal form; this slice must keep that form readable and must not restyle the dashboard shell. It does not change measurement data, so it can run beside the remaining journal edits.
- **Status:** done

### S-09: Trainee journal leaves the starter glass card

- **Outcome:** user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard`
- **Change ID:** trainee-journal-ui
- **PRD refs:** MS-03
- **Prerequisites:** S-02, S-08
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** `/dashboard` still wraps the trainee journal in `bg-cosmic` and glass utilities, so a trainee who signs in hits a different visual than on `/` or `/auth/signin`. The measurement form already reads role tokens; the shell, list rows, empty and error copy, and Sign out still use starter literals. The trainer branch on the same route stays on the old shell until S-10. It does not change measurement data, so it can run beside S-05 and S-06.
- **Status:** done

### S-10: Trainer panel leaves the starter glass card

- **Outcome:** user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`
- **Change ID:** trainer-panel-ui
- **PRD refs:** MS-04
- **Prerequisites:** S-04, S-09
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A trainer who signs in still sees the starter glass card on `/dashboard`, while the trainee on the same route already uses the shared visual contract. Preview stays read-only and does not change measurement data, so this can run beside S-05 and S-06.
- **Status:** done

### S-11: Shared top bar on home, auth, and both dashboards

- **Outcome:** user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email
- **Change ID:** shared-topbar
- **PRD refs:** MS-05
- **Prerequisites:** S-07, S-08, S-09, S-10
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The home bar exists only on `/`. Sign-in, sign-up, and both dashboards omit it, and Sign out still sits under the measurement card on the journal and the trainer panel. The bar does not change measurement data, so this can run beside S-05 and S-06.
- **Status:** done

### S-12: Measurements enter and display in a row

- **Outcome:** user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel
- **Change ID:** horizontal-measurements
- **PRD refs:** MS-06
- **Prerequisites:** S-09, S-10
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The trainee form and the shared measurement list stack each field in a column, and the trainer's linked-trainee list stacks each email under the previous one, so both stay vertical until this slice. A horizontal row must stay readable on a narrow screen and must not change stored values, the delta, or who is linked. It can run beside S-05 and S-06.
- **Status:** done

### S-13: Measurement copy and the measurements route

- **Outcome:** user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry
- **Change ID:** measurement-copy-polish
- **PRD refs:** MS-07
- **Prerequisites:** S-11, S-12
- **Parallel with:** S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** `/dashboard` no longer opens the screen, so an old address 404s. Copy and the route change do not change stored measurements, who is linked, or how the difference is calculated. It can run beside S-05 and S-06.
- **Status:** done

### S-14: Delta after edit and delete

- **Outcome:** user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison
- **Change ID:** testing-delta-after-edit-delete
- **PRD refs:** MS-08, US-01, FR-004, FR-005, FR-008
- **Prerequisites:** S-04, S-05, S-06
- **Parallel with:** S-15, S-16
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The comparison is the product. This slice locks that chain after an edit or a delete, including the trainer's copy, and was archived with the phase-1 tests.
- **Status:** done

### S-15: Measurement access boundaries

- **Outcome:** user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person
- **Change ID:** testing-measurement-access-boundaries
- **PRD refs:** MS-09, FR-007, FR-008
- **Prerequisites:** S-04
- **Parallel with:** S-14, S-16
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Privacy of body measurements is the next risk in the test plan. This slice locks ownership and the email link, and was archived with the phase-2 smoke steps.
- **Status:** done

### S-16: Reject illegal measurements

- **Outcome:** user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged
- **Change ID:** testing-reject-illegal-measurements
- **PRD refs:** MS-10, FR-003
- **Prerequisites:** S-02
- **Parallel with:** S-14, S-15
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A future-dated create must not land on the list. This slice locks that refusal on an empty journal, and was archived with the phase-3 smoke steps. The edit path is outside what that phase shipped.
- **Status:** done

### S-17: Docs and the live worker describe one deploy path

- **Outcome:** a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off
- **Change ID:** ci-cd-workflow-updates
- **PRD refs:** MS-01
- **Prerequisites:** —
- **Parallel with:** S-18
- **Blockers:** —
- **Unknowns:**
  - Does the live worker build setting already match the migration-aware production build? — Owner: user. Block: no.
- **Risk:** The quality gate already matches. A broad edit could erase the manual deploy path, which does not apply hosted migrations.
- **Status:** done

### S-18: Block merge when CI fails

- **Outcome:** a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main`
- **Change ID:** block-merge-on-failed-ci
- **PRD refs:** MS-11
- **Prerequisites:** —
- **Parallel with:** S-17
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The repository is already public, so branch protection on GitHub Free can enforce the rule. A null pull-request requirement, or a required check name other than `ci` and `smoke`, would leave a direct push or a red check able to reach `main`. Fork pull requests from outside this repository do not receive Actions secrets, so their build check can fail. The workflow file stays as it is.
- **Status:** done

### S-19: End-to-end test configuration

- **Outcome:** a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in
- **Change ID:** e2e-setup
- **PRD refs:** MS-12
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The measurement risks already have cheaper checks. This slice only stands up the browser-level runner and one signed-out gate, so later tests do not retread those checks.
- **Status:** done

### S-20: Hosted migration preserves measurements

- **Outcome:** a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied
- **Change ID:** testing-hosted-migration-preserves-measurements
- **PRD refs:** MS-13
- **Prerequisites:** S-02, S-16
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A migration applies on a database that already has measurement rows and then changes their numbers, drops rows, or leaves them owned by the wrong trainee. A successful `db push` is not proof the rows survived.
- **Status:** done

### S-21: Saved edit reaches the arrow

- **Outcome:** a persisted weight edit changes the listed difference
- **Change ID:** testing-saved-edit-reaches-the-arrow
- **PRD refs:** MS-14, US-01, FR-004
- **Prerequisites:** S-05, S-14
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The comparison rule is already locked by S-14. This slice proves one saved weight edit changes the listed difference, so a unit that builds the edited row in memory does not count.
- **Status:** done

### S-22: Measurement date and time

- **Outcome:** user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused
- **Change ID:** measured-on-with-time
- **PRD refs:** MS-15
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Existing same-day rows and edits that rewrite `created_at` can collide with a unique date-and-time rule or blur creation time versus measurement time.
- **Status:** done

### S-23: Pagination and filter measurements

- **Outcome:** user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list
- **Change ID:** pagination-and-filter-measurements
- **PRD refs:** FR-009
- **Prerequisites:** S-13, S-22
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Paging or filtering the journal could hide entries, show another trainee's measurements, or change the difference versus the previous entry.
- **Status:** done

### S-24: Measurement list reads less of the journal

- **Outcome:** user can open the same calendar-month page as today, with the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, and a linked trainer sees that same page, while the list is built without walking the whole journal
- **Change ID:** query-optimization
- **PRD refs:** MS-16, FR-009
- **Prerequisites:** S-23
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A shorter read can drop a row from the month page, show another trainee's measurements, or change the difference when the previous entry sits outside the page.
- **Status:** done

### S-25: Forgot password and password change on Profile

- **Outcome:** user can request a password reminder from sign-in, and a signed-in user can change their password from Profile in the menu between Measurements and Sign out
- **Change ID:** handle-change-and-reset-pass
- **PRD refs:** MS-17
- **Prerequisites:** S-08, S-11
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A reminder or a password change could lock the account or update the wrong user. Profile is new in the menu; this slice only adds password change, so later Profile features stay out.
- **Status:** done

### S-26: Preview the delta versus the previous entry from the new entry date

- **Outcome:** user can see a preview of the difference versus the previous entry, chosen from the date typed for the new entry, while filling in that entry
- **Change ID:** preview-for-new-entry
- **PRD refs:** MS-18
- **Prerequisites:** S-02, S-13, S-22
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The preview or the copied values could come from the wrong earlier entry when the typed date sits between existing rows.
- **Status:** done

### S-27: Journal calendar and saved entry display

- **Outcome:** user can move through the journal on a week of day buttons, open the month grid from the month name, set date and time together in one field, and read each saved entry's values centered with the same icons as a new measurement
- **Change ID:** calendar-upgrade-and-visual-fixes
- **PRD refs:** MS-19
- **Prerequisites:** S-23, S-26
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The linked trainer reads the same list, so a visual change on the trainee journal can change that preview. The difference versus the previous entry stays as it is.
- **Status:** done

### S-28: Linked trainee list matches the month field

- **Outcome:** user can open a centered email field under Body measurements, click it to list linked trainees, and move through that list with left and right arrows; when more than six trainees are linked, the list scrolls
- **Change ID:** visual-update-for-linked-trainee
- **PRD refs:** MS-20
- **Prerequisites:** S-12, S-13, S-27
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Replacing the row of email links can hide a trainee or open the wrong journal when more than six are linked.
- **Status:** done

### S-29: Reactive trainee search

- **Outcome:** user can type a character sequence into the trainee search and see matching emails, at most the first 10, without trainees who are already linked, and read Find trainee by email as the field placeholder
- **Change ID:** reactive-trainee-search
- **PRD refs:** MS-21
- **Prerequisites:** S-04, S-13
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A typed sequence can show trainee emails this trainer has not linked.
- **Status:** done

### S-30: Inline measurement errors and clearer button states

- **Outcome:** user can see a field error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and can tell active buttons from inactive ones
- **Change ID:** some-display-changes
- **PRD refs:** MS-22
- **Prerequisites:** S-27
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Showing an error before Add can block a measurement the trainee has not finished typing, and a stronger active or inactive button style is shared, so other screens change with it.
- **Status:** done

### S-31: Update the README and sync slice issues to the roadmap

- **Outcome:** a reader can follow the project's current information in the README under the current headings, and each roadmap slice issue carries the slice tag with information taken from this roadmap; the north-star label stays only on the slice this roadmap marks
- **Change ID:** update-project-info
- **PRD refs:** MS-23
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rewriting the README can drop commands contributors still rely on, and retagging slice issues can mislabel work that is not a slice or drop a prerequisite this roadmap still lists.
- **Status:** done

### S-32: Measurements screen on a phone

- **Outcome:** user can open the measurements screen on a phone and still read and enter every field, the difference versus the previous entry, and the trainer controls on that screen
- **Change ID:** mobile-devices-ui-measurements
- **PRD refs:** MS-24
- **Prerequisites:** S-28, S-29, S-30
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A narrower layout can clip the horizontal measurement row or hide a field the trainee and a linked trainer already read on a wide screen.
- **Status:** done

### S-33: Default values for the measurement accordion and entries per page

- **Outcome:** user can open the measurements screen with the add form already open and five entries per page, and a linked trainer sees that same default
- **Change ID:** default-values-changes
- **PRD refs:** MS-25
- **Prerequisites:** S-23, S-32
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** A stored page size still overrides five, and an add form that starts open can cover the list the trainee or trainer came to read.
- **Status:** done

### S-34: Refresh the test plan, expand app tests, and fix iOS Safari menus

- **Outcome:** a maintainer can follow a refreshed test plan and run expanded application tests, and a user on Safari for iOS can open the hamburger and row actions on the first tap
- **Change ID:** test-app-refresh-and-fixes
- **PRD refs:** MS-26
- **Prerequisites:** S-19, S-32
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Broader e2e or a Safari pointer workaround can add flaky browser runs or miss a device-only regression that desktop WebKit does not show.
- **Status:** done

### S-35: Avatar menu with Profile details and Settings

- **Outcome:** user can open Profile, Settings, and Sign out from an avatar menu beside Measurements on desktop and beside the hamburger on a phone, change their first and last name on Profile next to a read-only email, and change their password on Settings
- **Change ID:** user-profile-rework
- **PRD refs:** MS-27
- **Prerequisites:** S-25, S-32
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Moving Sign out and the password form behind the avatar can strand a phone user without a way to sign out, and a name edit can update the wrong user, let the email change, or let a user rewrite their own role.
- **Status:** done

### S-36: Avatar tab in Profile

- **Outcome:** user can upload their own avatar image on an Avatar tab beside Details in Profile, see it in the top-bar avatar instead of the initials, remove it to get the initials back, and read their name in the top-bar greeting
- **Change ID:** avatar-select
- **PRD refs:** MS-28
- **Prerequisites:** S-35
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The first use of file storage in this product: a wrong storage rule can let a user overwrite or delete another user's avatar, and a renamed non-image file can be stored as an avatar.
- **Status:** done

### S-37: Hub with Collaborations for trainer and trainee links

- **Outcome:** user can open a Hub from the avatar menu with a Collaborations section: a trainer sees linked and pending trainees, five per page, and can cancel a pending request or unlink a trainee; a trainee sees their trainers, five per page, and accepts or declines a link request; finding a trainee by email sends a link request instead of linking at once
- **Change ID:** hub-collaborations-handle
- **PRD refs:** MS-29
- **Prerequisites:** S-04, S-29, S-35
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether a declined or cancelled request is kept as a record or removed; whether the trainee search still hides trainees with a pending request.
- **Risk:** Changing a link from instant to request-and-accept touches the rule that lets a trainer read a trainee's journal: a pending or declined request must not open that journal, and unlinking must close it at once. Existing links must stay accepted after the migration.
- **Status:** done

### S-38: Drop the legacy instant-link function after the Hub release

- **Outcome:** a maintainer can rely on the request flow as the only way to create a trainer link: the legacy instant-link database function is gone, and a declined request can be sent again at once with no block
- **Change ID:** drop-link-trainee-by-email
- **PRD refs:** MS-29
- **Prerequisites:** S-37
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The drop must ship only after the S-37 Worker is live in production; an older Worker that still calls the function would fail on the link POST. Follow-up to the S-37 implementation review (F4, F5).
- **Status:** done

### S-39: Notifications with a top-bar bell and a Hub Notifications table

- **Outcome:** user can see a bell between the menu and the avatar with the number of unread notifications (no badge when there are none), open it to read the latest notifications and go to the page each one came from, and manage every notification on a Hub Notifications table paged 5, 10, or 15, marking selected ones read or deleting them; a trainer is told when a link request is accepted or declined and when a trainee unlinks, and a trainee is told when a trainer sends a link request or unlinks
- **Change ID:** notification-system
- **PRD refs:** MS-30
- **Prerequisites:** S-37, S-38
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether a notification is written by the database (trigger) or by the API route that changes the link; whether the bell count refreshes live or on page load; where a notification whose source page is gone should lead.
- **Risk:** A notification names the other person, so row-level security must let each user read, mark, and delete only their own notifications, and no user may create one for someone else. The new table must reach hosted Supabase before the new Worker without breaking the previous Worker's link flow. Known open risk (impl review F2): a trainer can repeat request → withdraw to flood a trainee with notifications; there is no rate limit or dedupe yet — follow-up queued.
- **Status:** done

### S-40: Per-dashboard access in Collaborations

- **Outcome:** user can see each collaboration's access per dashboard in an Access column of Hub → Collaborations — Measurements now, with Nutrition, Training, and Planning laid out for later — where finding a trainee asks for read access to measurements, a linked trainee reads Read, each dashboard has its own action button, access types that do not fit collapse to an access icon that opens a dialog, and Revoke replaces Unlink and Remove in the panel, notifications, and toasts
- **Change ID:** improvment-for-status-collaborations
- **PRD refs:** MS-31
- **Prerequisites:** S-37, S-39
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether access is stored per dashboard in the database now or only shaped in the UI on top of today's link; how a pending request shows per dashboard; whether Nutrition, Training, and Planning render as disabled cells or stay hidden until built; which icon stands for access.
- **Risk:** Renaming link statuses or notification kinds in the database must stay backward compatible, because the migration reaches hosted Supabase before the new Worker and the previous Worker still reads "linked" and "unlinked". Notifications already stored with the old wording must still read correctly. The trainer's preview of measurements must keep keying on read access to measurements, so row-level security does not widen or break.
- **Status:** done

### S-41: Measurement charts with Visualize and Clear

- **Outcome:** user can open a collapsible Charts tile above the add form with eight line charts, one per measurement field, for the selected week, month, year, or years, hover a line to read each entry and its difference versus the previous entry, chart only the entries checked in the list with Visualize, return to the whole month with Clear, and find those choices kept by the browser
- **Change ID:** visualization-of-measurements
- **PRD refs:** MS-32
- **Prerequisites:** S-23, S-27, S-33
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** which chart library fits React 19 islands and the design tokens, or hand-drawn SVG; the limit on checked entries ("up to x"); whether week, year, and years are new period controls on the Charts tile or follow the journal's month and week strip; whether a linked trainer sees the same charts; whether remembered choices are kept per trainee in browser storage; where the y-axis starts when steps of 5 meet a small field.
- **Risk:** The charts read every entry in the period, not one page, so a years range must not walk the whole journal on each render (S-24 kept the list query lean). The tooltip's difference must match the list's difference versus the previous entry, including when that previous entry sits before the period. Remembered choices must not leak between trainees on a shared browser, and a stale remembered selection must not break when entries are edited or deleted.
- **Status:** done

### S-42: Prefill a new measurement from the previous entry

- **Outcome:** user can open the add form with weight and every circumference already filled from their previous entry, and find the fields empty when there is no earlier entry
- **Change ID:** prev-values-for-new-measurement
- **PRD refs:** MS-33
- **Prerequisites:** S-02, S-26, S-33
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether "previous" is the latest entry in the journal or the entry before the date typed for the new entry (S-26 already picks that one for the delta preview); whether the note and date/time are prefilled too (assumed not); whether the form returns to the new latest values after Add; whether a field the previous entry left empty stays empty.
- **Risk:** A prefilled value that is saved unchanged must still go through the same validation and must not be mistaken for a typed value; the delta preview must read zero for untouched fields rather than break. Prefill must read only the trainee's own journal, not a linked trainee's.
- **Status:** done

### S-43: Fewer Supabase round trips per request

- **Outcome:** user can open a signed-in page, the measurements screen above all, noticeably faster because the request makes fewer sequential round trips to Supabase, and sees the same data as before
- **Change ID:** reduce-supabase-round-trips
- **PRD refs:** MS-34
- **Prerequisites:** S-24, S-42
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether the hosted Supabase project already signs JWTs with asymmetric keys (`getClaims()` verifies locally only then; otherwise it still calls the auth server); how much Cloudflare Smart Placement saves for this Supabase region; whether the profile read shared by the page and the top bar is worth deduplicating here or later.
- **Risk:** `getClaims()` trusts a token until it expires, so a session revoked on the server stays valid for up to `jwt_expiry` (1 hour); protected routes and API routes must still refuse a missing or invalid token. Running reads in parallel must keep each read's error handling and the page's current output, including the edit and delete views.
- **Status:** done

### S-44: Read-only role in Profile details

- **Outcome:** user can read their app role, trainee or trainer, in a read-only field above the email in Profile → Details, with a role icon that matches the other Details icons
- **Change ID:** role-view-in-profile
- **PRD refs:** MS-35
- **Prerequisites:** S-35
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** the role's display copy ("Trainee"/"Trainer" or another wording); which lucide icon stands for each role beside the existing `Mail` and `User` icons.
- **Risk:** The role must come from the server-side profile, not a form value, and the field must not be submitted with the Details form, so it cannot become a way to change the role.
- **Status:** done

### S-45: Small redesign with Lucide icons and a dark theme

- **Outcome:** user can see icons across the app drawn from Lucide through the shadcn/ui components, and switch the whole app to a dark theme
- **Change ID:** app-small-redesign
- **PRD refs:** MS-36
- **Prerequisites:** S-11, S-35
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** which icons change; where the theme switch sits (avatar menu, Settings, or the top bar); whether the default follows the system preference; whether the choice is saved per browser or on the profile.
- **Risk:** `src/styles/global.css` already defines `.dark` tokens, but views that use literal colours or arbitrary values will not follow them, and the theme must be applied before first paint so a server-rendered page does not flash light.
- **Status:** done

### S-46: Top changes radial charts

- **Outcome:** user can open a separate Top changes tile with four radial charts — top weight gain, top circumference gain, top weight loss, top circumference loss — for the selected week, month, year, or last 5 years, read each chart's legend, and filter which circumferences the circumference charts show
- **Change ID:** top-progress-charts
- **PRD refs:** MS-37
- **Prerequisites:** S-41, S-45
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether a "change" is between consecutive entries or first-to-last within the period; what "largest and smallest" means for a gain chart (top N gains, or the largest and smallest gain); how many items each radial chart shows; whether the period follows the line charts tile's choice or has its own control; whether a linked trainer sees the same tile; whether the tile collapses like the line charts tile and remembers its state.
- **Risk:** A 5-year range reads many entries, so the top changes must be computed without walking the whole journal on each render (S-24 kept the list query lean). Gains and losses must use the same difference as the list's delta versus the previous entry. Radial chart colours must come from chart tokens so they follow the dark theme.
- **Status:** done

### S-47: Component version system

- **Outcome:** user can open a Components screen beside Change password in Settings, switch each module — Measurements now, Nutrition, Training, and Planning off until built — on or off to show or hide it in the menu, pick off or a version for each component in one table saved with one button and a toast, and see a red preview badge with a warning tooltip on a preview tile; the add form and the entries list are separate New measurements and Measurements tiles
- **Change ID:** component-version-system
- **PRD refs:** MS-38
- **Prerequisites:** S-35, S-41, S-46
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** where the choices are stored (a per-user table, or profile columns) and whether a linked trainer's view follows the trainee's choices or the trainer's own; whether a module switched off is also refused by its route or only hidden from the menu; whether a version choice only shows or hides a component today, since every component has one version; which component the "progression" entry names — the line charts tile, presumably; what the off module rows for Nutrition, Training, and Planning list while they have no components.
- **Risk:** Hiding the Measurements module must not leave a signed-in user on a dead landing page or redirect loop, since `/measurements` is where sign-in lands. Splitting the add form and the list into two tiles must keep the S-33 default (add form open, five per page) and the Visualize/Clear pair under the list. The new table needs RLS with per-operation policies, and the migration must be backward compatible with the Worker it reaches first.
- **Status:** done

### S-48: Reorganize the avatar menu

- **Outcome:** user can open the avatar menu, read their name with a profile icon as its first item above a separator and click it to open Profile, which replaces the separate Profile item, switch the theme from a Theme item with an icon above Sign out, set off by a separator, and no longer sees a Hello greeting on the left of the top bar
- **Change ID:** reorganization-of-component-placement
- **PRD refs:** MS-39
- **Prerequisites:** S-35, S-45
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether the Theme item toggles in place or opens a light/dark/system choice; whether the first menu item shows the same name format as today's greeting (first initial and last name, the one saved name, otherwise the email) and also the email or role; what a guest sees in place of the greeting, since a guest has no avatar menu; how the phone hamburger menu carries the same order; whether the profile icon is a Lucide user icon or the avatar image itself.
- **Risk:** CLAUDE.md and `src/lib/topbar.ts` define the greeting copy, so both must change together, and e2e or smoke checks that read "Hello" must be updated. The menu must keep the S-34 first-tap open fix on iOS Safari, and the theme choice must persist as it does today. Tests and e2e steps that open Profile through the Profile menu item must click the name instead, and the name item must stay reachable and labelled for keyboard and screen-reader users.
- **Status:** done

### S-49: Find trainee in the top bar

- **Outcome:** user can open Find trainee from a search field with a magnifier at the top left of the top bar (only the magnifier on a phone when the field does not fit), search trainees by email in a centered dialog that Esc or a click outside closes, tick Measurements under Request for (Nutrition, Training, and Planning disabled), and send the request with Request access
- **Change ID:** find-trainne-on-top-bar
- **PRD refs:** MS-40
- **Prerequisites:** S-29, S-40, S-48
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether the top-bar field shows for trainers only or also for trainees and guests; whether the old Find trainee field on the measurements screen and in Hub → Collaborations is removed or kept; whether a keyboard shortcut (as on ui.shadcn.com, Ctrl/⌘ K) opens the dialog; at what width the field collapses to the magnifier; whether the dialog closes and toasts after Request access or stays open for the next trainee; whether the placeholder mentions first and last name before that search exists.
- **Risk:** The dialog must keep the S-29 search rules (at most the first 10 matches, no trainees already linked) and send the S-37/S-40 request for read access to measurements, not an instant link. The top bar must still fit on a phone beside the hamburger, the bell, and the avatar, and keep the S-34 first-tap fix on iOS Safari. E2E steps that find a trainee on the measurements screen or in the Hub must follow the new entry point, and the dialog must trap focus and restore it on close for keyboard and screen-reader users.
- **Status:** done

### S-50: Find trainee by first and last name

- **Outcome:** user can find a trainee in Find trainee by first name or last name as well as by email, and read each match, and each trainee in the linked trainee choice, as in the Trainee column of Hub → Collaborations but with the full first name ("Ada Lovelace (ada@example.com)"), read tile headings without the selected trainee's name, and see the Request for checkboxes in two columns
- **Change ID:** find-tranne-by-first-and-lastname
- **PRD refs:** MS-41
- **Prerequisites:** S-49
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether a query of two words ("Ada Love") matches first and last name together; whether the match is case- and diacritic-insensitive; whether the Collaborations Trainee column itself changes to the full first name or keeps the initial; how a trainee with no saved name reads (email alone, as today).
- **Risk:** The search must keep the S-29 rules (at most the first 10 matches, no trainees already linked) and must not reveal names of users who are not trainees. Searching by name reads profile names the trainer could not read before, so RLS or the search function must expose only what the result needs. E2E and unit tests that assert the email-only label or a heading with the trainee's name must follow the new format. Without the name in the headings, the trainee choice is the only place a trainer sees whose measurements are shown, so it must stay visible on every tile's screen, a phone included.
- **Status:** done

### S-51: Top progress 0.9 release candidate and unified period pickers

- **Outcome:** user can open Top progress 0.9 (RC), on by default with a yellow release-candidate badge, filter every chart by circumference, pick the period with an arrowed choice box on the right of the tile, read Month charts labelled by the days of top progress, and still choose the previous Top progress version; every measurements tile uses same-width period choice boxes that offer only periods with entries, and Visualize, Clear, and the selection count sit on the left under the table
- **Change ID:** changes-to-measurments-and-progressions
- **PRD refs:** MS-42
- **Prerequisites:** S-41, S-46, S-47
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** whether the filter is one per chart or one shared across charts, and what it filters on the weight charts; whether the arrows skip periods with no entries; whether "on by default" overrides a choice a user already saved; how Month labels read when progress spans many days; whether the fixed width holds on a phone.
- **Risk:** Turning the RC on by default must not override saved component choices without a decision, and any migration must be backward compatible. Lists of periods with entries must not walk the whole journal on each render (S-24). The yellow badge needs a role token for light and dark, not a literal colour. E2E and unit tests that assert the old period toggle, the Circumferences choice box, or the Visualize/Clear placement must follow the new layout.
- **Status:** done

### S-52: Clear other accounts' tm.* cookies and stop keeping them indefinitely

- **Outcome:** user can sign in on a browser where another account was used, and the request header no longer carries that account's `tm.*` cookies; `tm.*` preference cookies expire instead of living a year after each write
- **Change ID:** cookie-cleanup
- **PRD refs:** MS-43
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** when the cleanup runs (sign-in, sign-out, or any request); what lifetime replaces the one-year `Max-Age`; whether cookies keyed by a trainee id for the current trainer count as the current account's; whether `localStorage` copies are cleared too.
- **Risk:** Clearing must never drop the current account's choices or Supabase auth cookies (`sb-*`). Per-trainee cookies multiply with linked trainees, so the header can grow past limits on a shared device. E2E and unit tests that assert remembered choices must still pass.
- **Status:** in-progress

### S-53: Top progress charts keep series colours across days and show a simpler legend

- **Outcome:** user can read every Top progress chart with each series' bars in the colour of its first occurrence even when changes span more than one day, and a legend that shows only the colour and what the series describes, without the gain or loss value and the date
- **Change ID:** fixes-for-top-progression
- **PRD refs:** MS-44
- **Prerequisites:** S-51
- **Parallel with:** S-52
- **Blockers:** —
- **Unknowns:** whether the fading was meant to tell days apart, and if so what replaces it (tooltip only?); whether the previous Top progress version changes too or only 0.9 (RC); whether the legend lists each series once after the dates are dropped.
- **Risk:** Same-coloured bars from different days must still be distinguishable through the tooltip or axis labels. Colours must stay role tokens. Unit and E2E tests that assert the legend text or bar opacity must follow.
- **Status:** ready

## Backlog Handoff

| Roadmap ID | Change ID                                       | Suggested issue title                                                                                            | Ready for `/10x-plan` | Notes                                                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01       | trainee-signup                                  | Trainee can register and open an empty journal                                                                   | yes                   | Run `/10x-plan trainee-signup`                                                                                                                                                                                                                     |
| S-02       | trainee-measurement-delta                       | Trainee can log a measurement and see the delta versus the previous entry                                        | no                    | Prerequisites not done                                                                                                                                                                                                                             |
| S-03       | trainer-signup                                  | Trainer can register                                                                                             | no                    | Prerequisites not done. Can run beside S-02                                                                                                                                                                                                        |
| S-04       | trainer-link-preview                            | Trainer can link a trainee by email and preview their measurements                                               | no                    | Prerequisites not done                                                                                                                                                                                                                             |
| S-05       | edit-measurement-entry                          | Trainee can edit a measurement entry                                                                             | no                    | Prerequisites not done. Can run beside S-06                                                                                                                                                                                                        |
| S-06       | delete-measurement-entry                        | Trainee can delete a measurement entry                                                                           | no                    | Prerequisites not done. Can run beside S-05                                                                                                                                                                                                        |
| S-07       | product-home                                    | Visitor sees Training Manager on the public home instead of the starter welcome                                  | yes                   | Run `/10x-plan product-home`. Can run beside S-05 and S-06                                                                                                                                                                                         |
| S-08       | auth-signin-form                                | Sign-in, registration, and email confirmation leave the starter glass card                                       | yes                   | Run `/10x-plan auth-signin-form`. Can run beside S-05 and S-06                                                                                                                                                                                     |
| S-09       | trainee-journal-ui                              | Trainee journal on `/dashboard` leaves the starter glass card                                                    | yes                   | Research in `context/changes/trainee-journal-ui/`. Run `/10x-plan trainee-journal-ui`. Can run beside S-05 and S-06                                                                                                                                |
| S-10       | trainer-panel-ui                                | Trainer panel on `/dashboard` leaves the starter glass card                                                      | yes                   | Run `/10x-plan trainer-panel-ui`. Can run beside S-05 and S-06                                                                                                                                                                                     |
| S-11       | shared-topbar                                   | Shared top bar on the public home, sign-in, sign-up, and both dashboards                                         | yes                   | Run `/10x-new shared-topbar`. Can run beside S-05 and S-06                                                                                                                                                                                         |
| S-12       | horizontal-measurements                         | Trainee enters measurements in a row; trainee and trainer read each entry in a row; linked trainees sit in a row | yes                   | Change folder exists. Plan in `context/changes/horizontal-measurements/`. Can run beside S-05 and S-06                                                                                                                                             |
| S-13       | measurement-copy-polish                         | Measurements screen, greeting, and field units                                                                   | no                    | [#41](https://github.com/gmaszkiewicz/training-manager/issues/41). Change folder exists. Work is on `cursor/measurement-copy-polish`. Can run beside S-05 and S-06                                                                                 |
| S-14       | testing-delta-after-edit-delete                 | Prove the comparison chain after edit and delete, including the trainer preview                                  | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-delta-after-edit-delete/`                                                                                                                                                                |
| S-15       | testing-measurement-access-boundaries           | Prove ownership, the email link, and that a trainer cannot change entries                                        | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-measurement-access-boundaries/`                                                                                                                                                          |
| S-16       | testing-reject-illegal-measurements             | Prove a create dated after tomorrow is refused and stays off the empty journal                                   | no                    | Archived 2026-10-05 → `context/archive/2026-10-04-testing-reject-illegal-measurements/`                                                                                                                                                            |
| S-17       | ci-cd-workflow-updates                          | Align the written deploy path with the live worker                                                               | yes                   | On MS-01. Plan already exists in the change folder. Implementation can start.                                                                                                                                                                      |
| S-18       | block-merge-on-failed-ci                        | Block merge to main when ci or smoke fails                                                                       | yes                   | On MS-11. Plan in `context/changes/block-merge-on-failed-ci/`. Repository is already public. Phase 2 sets branch protection.                                                                                                                       |
| S-19       | e2e-setup                                       | End-to-end test configuration                                                                                    | yes                   | [#61](https://github.com/gmaszkiewicz/training-manager/issues/61). On MS-12. Change folder exists. Run `/10x-plan e2e-setup`.                                                                                                                      |
| S-20       | testing-hosted-migration-preserves-measurements | Hosted migration preserves measurements                                                                          | yes                   | [#65](https://github.com/gmaszkiewicz/training-manager/issues/65). On MS-13. Change folder exists. Run `/10x-plan testing-hosted-migration-preserves-measurements`.                                                                                |
| S-21       | testing-saved-edit-reaches-the-arrow            | Saved edit reaches the arrow                                                                                     | yes                   | [#68](https://github.com/gmaszkiewicz/training-manager/issues/68). On MS-14. Change folder exists. Run `/10x-research testing-saved-edit-reaches-the-arrow`.                                                                                       |
| S-22       | measured-on-with-time                           | Add time of day to measured_on                                                                                   | yes                   | [#71](https://github.com/gmaszkiewicz/training-manager/issues/71). On MS-15. Change folder exists. Run `/10x-research measured-on-with-time`.                                                                                                      |
| S-23       | pagination-and-filter-measurements              | Pagination and filter measurements                                                                               | no                    | [#74](https://github.com/gmaszkiewicz/training-manager/issues/74). On FR-009. Archived 2026-10-09 → `context/archive/2026-10-08-pagination-and-filter-measurements/`                                                                               |
| S-24       | query-optimization                              | Measurement list reads less of the journal                                                                       | yes                   | [#77](https://github.com/gmaszkiewicz/training-manager/issues/77). On MS-16. Change folder exists. Run `/10x-plan query-optimization`.                                                                                                             |
| S-25       | handle-change-and-reset-pass                    | Forgot password and password change on Profile                                                                   | yes                   | [#80](https://github.com/gmaszkiewicz/training-manager/issues/80). On MS-17. Change folder exists. Run `/10x-plan handle-change-and-reset-pass`.                                                                                                   |
| S-26       | preview-for-new-entry                           | Preview the delta versus the previous entry from the new entry date                                              | yes                   | [#85](https://github.com/gmaszkiewicz/training-manager/issues/85). On MS-18. Change folder exists. Run `/10x-plan preview-for-new-entry`.                                                                                                          |
| S-27       | calendar-upgrade-and-visual-fixes               | Journal calendar and saved entry display                                                                         | no                    | [#88](https://github.com/gmaszkiewicz/training-manager/issues/88). On MS-19. Plan exists. Run `/10x-implement calendar-upgrade-and-visual-fixes`.                                                                                                  |
| S-28       | visual-update-for-linked-trainee                | Linked trainee list matches the month field                                                                      | yes                   | [#92](https://github.com/gmaszkiewicz/training-manager/issues/92). On MS-20. Change folder exists. Research is complete. Run `/10x-plan visual-update-for-linked-trainee`.                                                                         |
| S-29       | reactive-trainee-search                         | Trainer sees matching unlinked trainee emails while typing                                                       | yes                   | [#95](https://github.com/gmaszkiewicz/training-manager/issues/95). On MS-21. Change folder exists. Run `/10x-plan reactive-trainee-search`.                                                                                                        |
| S-30       | some-display-changes                            | Inline measurement errors and clearer button states                                                              | yes                   | [#99](https://github.com/gmaszkiewicz/training-manager/issues/99). On MS-22. Change folder exists. Run `/10x-research some-display-changes`.                                                                                                       |
| S-31       | update-project-info                             | Update the README and sync slice issues to the roadmap                                                           | no                    | [#105](https://github.com/gmaszkiewicz/training-manager/issues/105). On MS-23. Plan exists. Run `/10x-implement update-project-info`.                                                                                                              |
| S-32       | mobile-devices-ui-measurements                  | Measurements screen on a phone                                                                                   | yes                   | [#110](https://github.com/gmaszkiewicz/training-manager/issues/110). On MS-24. Change folder exists. Run `/10x-plan mobile-devices-ui-measurements`.                                                                                               |
| S-33       | default-values-changes                          | Default accordion and five entries per page                                                                      | no                    | [#115](https://github.com/gmaszkiewicz/training-manager/issues/115). On MS-25. Change folder exists. Work is on `cursor/default-values-changes`.                                                                                                   |
| S-34       | test-app-refresh-and-fixes                      | Refresh the test plan, expand app tests, and fix iOS Safari menus                                                | yes                   | [#118](https://github.com/gmaszkiewicz/training-manager/issues/118). On MS-26. Implemented: phone-width menu e2e + DropdownMenu click-open fix; test-plan refresh. Manual Safari/Firefox checklist remains.                                        |
| S-35       | user-profile-rework                             | Avatar menu with Profile details and Settings                                                                    | yes                   | [#129](https://github.com/gmaszkiewicz/training-manager/issues/129). On MS-27. Change folder exists. Run `/10x-plan user-profile-rework`.                                                                                                          |
| S-36       | avatar-select                                   | Avatar tab in Profile                                                                                            | no                    | [#133](https://github.com/gmaszkiewicz/training-manager/issues/133). On MS-28. Implemented and reviewed on `claude/avatar-select`. Run `/10x-archive avatar-select` after merge.                                                                   |
| S-37       | hub-collaborations-handle                       | Hub with Collaborations for trainer and trainee links                                                            | yes                   | [#138](https://github.com/gmaszkiewicz/training-manager/issues/138). On MS-29. Change folder exists. Run `/10x-plan hub-collaborations-handle`.                                                                                                    |
| S-38       | drop-link-trainee-by-email                      | Drop the legacy instant-link function after the Hub release                                                      | yes                   | [#142](https://github.com/gmaszkiewicz/training-manager/issues/142). Follow-up to [#138](https://github.com/gmaszkiewicz/training-manager/issues/138) (review F4, F5). On MS-29. Change folder exists. Run `/10x-plan drop-link-trainee-by-email`. |
| S-39       | notification-system                             | Notifications with a top-bar bell and a Hub Notifications table                                                  | yes                   | [#146](https://github.com/gmaszkiewicz/training-manager/issues/146). On MS-30. Change folder exists. Run `/10x-research notification-system`.                                                                                                      |
| S-40       | improvment-for-status-collaborations            | Per-dashboard access in Collaborations                                                                           | yes                   | [#149](https://github.com/gmaszkiewicz/training-manager/issues/149). On MS-31. Change folder exists. Run `/10x-plan improvment-for-status-collaborations`.                                                                                         |
| S-41       | visualization-of-measurements                   | Measurement charts with Visualize and Clear                                                                      | yes                   | [#152](https://github.com/gmaszkiewicz/training-manager/issues/152). On MS-32. Change folder exists. Run `/10x-plan visualization-of-measurements`.                                                                                                |
| S-42       | prev-values-for-new-measurement                 | Prefill a new measurement from the previous entry                                                                | yes                   | [#155](https://github.com/gmaszkiewicz/training-manager/issues/155). On MS-33. Change folder exists. Run `/10x-plan prev-values-for-new-measurement`.                                                                                              |
| S-43       | reduce-supabase-round-trips                     | Fewer Supabase round trips per request                                                                           | yes                   | [#158](https://github.com/gmaszkiewicz/training-manager/issues/158). On MS-34. Change folder exists. Run `/10x-plan reduce-supabase-round-trips`.                                                                                                  |
| S-44       | role-view-in-profile                            | Read-only role in Profile details                                                                                | yes                   | [#165](https://github.com/gmaszkiewicz/training-manager/issues/165). On MS-35. Change folder exists. Run `/10x-plan role-view-in-profile`.                                                                                                         |
| S-45       | app-small-redesign                              | Small redesign with Lucide icons and a dark theme                                                                | yes                   | [#168](https://github.com/gmaszkiewicz/training-manager/issues/168). On MS-36. Change folder exists. Run `/10x-plan app-small-redesign`.                                                                                                           |
| S-46       | top-progress-charts                             | Top changes radial charts                                                                                        | yes                   | [#171](https://github.com/gmaszkiewicz/training-manager/issues/171). On MS-37. Change folder exists. Run `/10x-plan top-progress-charts`.                                                                                                          |
| S-47       | component-version-system                        | Component version system in Settings                                                                             | yes                   | [#174](https://github.com/gmaszkiewicz/training-manager/issues/174). On MS-38. Change folder exists. Run `/10x-plan component-version-system`.                                                                                                     |
| S-48       | reorganization-of-component-placement           | Reorganize the avatar menu                                                                                       | yes                   | [#177](https://github.com/gmaszkiewicz/training-manager/issues/177). On MS-39. Change folder exists. Run `/10x-plan reorganization-of-component-placement`.                                                                                        |
| S-49       | find-trainne-on-top-bar                         | Find trainee in the top bar                                                                                      | yes                   | [#181](https://github.com/gmaszkiewicz/training-manager/issues/181). On MS-40. Change folder exists. Run `/10x-plan find-trainne-on-top-bar`.                                                                                                      |
| S-51       | changes-to-measurments-and-progressions         | Top progress 0.9 release candidate and unified period pickers                                                    | yes                   | [#187](https://github.com/gmaszkiewicz/training-manager/issues/187). On MS-42. Change folder exists. Run `/10x-plan changes-to-measurments-and-progressions`.                                                                                      |
| S-52       | cookie-cleanup                                  | Clear other accounts' tm.* cookies and stop keeping them indefinitely                                            | yes                   | [#192](https://github.com/gmaszkiewicz/training-manager/issues/192). On MS-43. Change folder exists. Run `/10x-plan cookie-cleanup`.                                                                                                               |
| S-53       | fixes-for-top-progression                       | Top progress charts keep series colours across days and show a simpler legend                                    | yes                   | [#193](https://github.com/gmaszkiewicz/training-manager/issues/193). On MS-44. Change folder exists. Run `/10x-plan fixes-for-top-progression`.                                                                                                    |

## Open Roadmap Questions

1. **What is the expected request volume (qps ballpark)?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; qps was not captured.
2. **What is the expected data volume?** — Owner: user. Block: no (does not gate a slice). `target_scale.users` is `small`; data_volume was not captured.

## Parked

- **Trainer replies to trainee notes** — Why parked: PRD §Non-Goals. Trainer preview is read-only on notes.
- **Personalized trainer questions on an entry** — Why parked: PRD §Non-Goals. Logging a measurement is not a trainer questionnaire.
- **Nutrition journal (module 2)** — Why parked: PRD §Non-Goals. This milestone is body measurements only.
- **Training-results journal (module 3)** — Why parked: PRD §Non-Goals. This milestone is body measurements only.
- **Mobile app** — Why parked: PRD §Non-Goals. Web only.
- **Good/bad coloring of deltas** — Why parked: PRD §Non-Goals. Arrow and numeric difference versus the previous entry only.

## Milestone History

- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — closed 2026-10-05. A trainee can record measurements and see the difference versus the previous entry, and a linked trainer can preview that list. The archived test rollout is recorded on this milestone as S-14, S-15, and S-16.
- **M-1: Trainee delta and trainer preview** (`trainee-delta-trainer-preview`) — reopened 2026-10-05. The deploy-path task is on MS-01, not a new milestone.

## Done

- **S-01: user can register with email and password as a trainee and open an empty journal** — Archived 2026-09-27 → `context/archive/2026-09-26-trainee-signup/`. Lesson: —.
- **S-02: user can add a body-measurement entry with an optional note and see the up/down difference versus the previous entry; the earliest entry has no comparison** — Archived 2026-09-28 → `context/archive/2026-09-27-trainee-measurement-delta/`. Lesson: —.
- **S-03: user can register with email and password and pick the trainer role** — Archived 2026-09-28 → `context/archive/2026-09-28-trainer-signup/`. Lesson: —.
- **S-04: user can link an existing trainee by email and preview that trainee's measurement list, including the arrow and difference versus the previous entry** — Archived 2026-09-29 → `context/archive/2026-09-28-trainer-link-preview/`. Lesson: —.
- **S-07: user can open the public home and see Training Manager — what it does and how to sign in or sign up — in place of the starter welcome** — Archived 2026-09-29 → `context/archive/2026-09-29-product-home/`. Lesson: —.
- **S-08: user can sign in, register, and read the email confirmation on the same visual contract as the public home, instead of the starter glass card** — Archived 2026-09-29 → `context/archive/2026-09-29-auth-signin-form/`. Lesson: —.
- **S-09: user can open the trainee journal after sign-in and see the same visual contract as the public home and auth entry screens, instead of the starter glass card on `/dashboard`** — Archived 2026-09-30 → `context/archive/2026-09-29-trainee-journal-ui/`. Lesson: —.
- **S-10: user can open the trainer panel after sign-in and see the same visual contract as the trainee journal, instead of the starter glass card on `/dashboard`** — Archived 2026-09-30 → `context/archive/2026-09-30-trainer-panel-ui/`. Lesson: —.
- **S-11: user can use the same top bar on the public home, sign-in, sign-up, and both dashboards: a guest reads "Hello guest" with Home, Sign in, and Sign up; a signed-in trainee or trainer reads "Hello trainee" or "Hello trainer" and their email as one phrase, with Home, Measurements, and Sign out, and the current page is marked. Sign out is not repeated under the measurements. The journal and the trainer panel are titled Body measurements and do not repeat the welcome or the email** — Archived 2026-09-30 → `context/archive/2026-09-30-shared-topbar/`. Lesson: —.
- **S-12: user can enter the measurement fields in a horizontal row on the trainee journal, and both the trainee and a linked trainer can read each entry's fields in a horizontal row; linked trainees sit beside each other on the trainer panel** — Archived 2026-09-30 → `context/archive/2026-09-30-horizontal-measurements/`. Lesson: —.
- **S-13: user can open measurements at `/measurements`, greet without a role name, find a trainee by email, and read each field's unit beside its name with a clearer difference versus the previous entry** — Archived 2026-10-01 → `context/archive/2026-09-30-measurement-copy-polish/`. Lesson: —.
- **S-05: user can edit a measurement entry they created, and the list shows the arrow and difference versus the previous entry using the edited values** — Archived 2026-10-02 → `context/archive/2026-10-02-edit-measurement-entry/`. Lesson: —.
- **S-06: user can delete a measurement entry they created, and each remaining entry compares to the previous remaining entry** — Archived 2026-10-02 → `context/archive/2026-10-02-delete-measurement-entry/`. Lesson: —.
- **S-14: user can edit or delete an entry and still see each remaining entry's arrow and difference versus the previous remaining entry; a linked trainer sees that same comparison** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-delta-after-edit-delete/`. Lesson: —.
- **S-15: user cannot read another trainee's journal, preview a trainee they did not link, or change entries as a trainer, and an email link cannot open the wrong person** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-measurement-access-boundaries/`. Lesson: —.
- **S-16: user can submit a create dated after tomorrow and see it refused, with the empty journal unchanged** — Archived 2026-10-05 → `context/archive/2026-10-04-testing-reject-illegal-measurements/`. Lesson: —.
- **S-18: a maintainer cannot merge a pull request to `main` while `ci` or `smoke` is failing, and cannot push straight to `main`** — Archived 2026-10-05 → `context/archive/2026-10-05-block-merge-on-failed-ci/`. Lesson: —.
- **S-17: a reader can follow one deploy path in the project docs, and the live worker settings match it: the quality gate stays as it already runs, a production build applies hosted migrations, and non-production builds stay off** — Archived 2026-10-05 → `context/archive/2026-10-05-ci-cd-workflow-updates/`. Lesson: —.
- **S-19: a maintainer can run browser-level tests against a production-like preview, and a signed-out visit to the journal is sent to sign-in** — Archived 2026-10-06 → `context/archive/2026-10-05-e2e-setup/`. Lesson: —.
- **S-20: a measurement row inserted before a migration keeps its numbers, its count, and its owner after that migration is applied** — Archived 2026-10-06 → `context/archive/2026-10-06-testing-hosted-migration-preserves-measurements/`. Lesson: —.
- **S-21: a persisted weight edit changes the listed difference** — Archived 2026-10-06 → `context/archive/2026-10-06-testing-saved-edit-reaches-the-arrow/`. Lesson: —.
- **S-22: user can record a measurement with date and time; `created_at` stays the immutable creation time; a second entry with the same date and time is refused** — Archived 2026-10-08 → `context/archive/2026-10-06-measured-on-with-time/`. Lesson: —.
- **S-23: user can see one calendar month of measurements at a time, paged 5, 10, or 15, newest first, and a linked trainer sees the same list** — Archived 2026-10-09 → `context/archive/2026-10-08-pagination-and-filter-measurements/`. Lesson: —.
- **S-24: user can open the same calendar-month page as today, with the same rows, order, page size, and difference versus the previous entry, including when that previous entry sits outside the page, and a linked trainer sees that same page, while the list is built without walking the whole journal** — Archived 2026-10-10 → `context/archive/2026-10-10-query-optimization/`. Lesson: —.
- **S-25: user can request a password reminder from sign-in, and a signed-in user can change their password from Profile in the menu between Measurements and Sign out** — Archived 2026-10-11 → `context/archive/2026-10-10-handle-change-and-reset-pass/`. Lesson: —.
- **S-26: user can see a preview of the difference versus the previous entry, chosen from the date typed for the new entry, while filling in that entry** — Archived 2026-10-11 → `context/archive/2026-10-11-preview-for-new-entry/`. Lesson: —.
- **S-27: user can move through the journal on a week of day buttons, open the month grid from the month name, set date and time together in one field, and read each saved entry's values centered with the same icons as a new measurement** — Archived 2026-10-12 → `context/archive/2026-10-11-calendar-upgrade-and-visual-fixes/`. Lesson: —.
- **S-28: user can open a centered email field under Body measurements, click it to list linked trainees, and move through that list with left and right arrows; when more than six trainees are linked, the list scrolls** — Archived 2026-10-13 → `context/archive/2026-10-12-visual-update-for-linked-trainee/`. Lesson: —.
- **S-29: user can type a character sequence into the trainee search and see matching emails, at most the first 10, without trainees who are already linked, and read Find trainee by email as the field placeholder** — Archived 2026-10-15 → `context/archive/2026-10-14-reactive-trainee-search/`. Lesson: —.
- **S-30: user can see a field error above Weight kg, Chest cm, and the rest as soon as the value is invalid, with room so that line does not shift the form, and can tell active buttons from inactive ones** — Archived 2026-10-16 → `context/archive/2026-10-15-some-display-changes/`. Lesson: —.
- **S-31: a reader can follow the project's current information in the README under the current headings, and each roadmap slice issue carries the slice tag with information taken from this roadmap; the north-star label stays only on the slice this roadmap marks** — Archived 2026-10-16 → `context/archive/2026-10-16-update-project-info/`. Lesson: —.
- **S-32: user can open the measurements screen on a phone and still read and enter every field, the difference versus the previous entry, and the trainer controls on that screen** — Archived 2026-10-20 → `context/archive/2026-10-18-mobile-devices-ui-measurements/`. Lesson: —.
- **S-33: user can open the measurements screen with the add form already open and five entries per page, and a linked trainer sees that same default** — Archived 2026-10-20 → `context/archive/2026-10-20-default-values-changes/`. Lesson: —.
- **S-34: a maintainer can follow a refreshed test plan and run expanded application tests, and a user on Safari for iOS can open the hamburger and row actions on the first tap** — Archived 2026-10-21 → `context/archive/2026-10-20-test-app-refresh-and-fixes/`. Lesson: —.
- **S-35: user can open Profile, Settings, and Sign out from an avatar menu beside Measurements on desktop and beside the hamburger on a phone, change their first and last name on Profile next to a read-only email, and change their password on Settings** — Archived 2026-10-26 → `context/archive/2026-10-26-user-profile-rework/`. Lesson: —.
- **S-36: user can upload their own avatar image on an Avatar tab beside Details in Profile, see it in the top-bar avatar instead of the initials, remove it to get the initials back, and read their name in the top-bar greeting** — Archived 2026-10-26 → `context/archive/2026-10-26-avatar-select/`. Lesson: —.
- **S-37: user can open a Hub from the avatar menu with a Collaborations section: a trainer sees linked and pending trainees, five per page, and can cancel a pending request or unlink a trainee; a trainee sees their trainers, five per page, and accepts or declines a link request; finding a trainee by email sends a link request instead of linking at once** — Archived 2026-10-27 → `context/archive/2026-10-27-hub-collaborations-handle/`. Lesson: —.
- **S-38: a maintainer can rely on the request flow as the only way to create a trainer link: the legacy instant-link database function is gone, and a declined request can be sent again at once with no block** — Archived 2026-10-27 → `context/archive/2026-10-27-drop-link-trainee-by-email/`. Lesson: —.
- **S-39: user can see a bell between the menu and the avatar with the number of unread notifications (no badge when there are none), open it to read the latest notifications and go to the page each one came from, and manage every notification on a Hub Notifications table paged 5, 10, or 15, marking selected ones read or deleting them; a trainer is told when a link request is accepted or declined and when a trainee unlinks, and a trainee is told when a trainer sends a link request or unlinks** — Archived 2026-10-27 → `context/archive/2026-10-27-notification-system/`. Lesson: —.
- **S-40: user can see each collaboration's access per dashboard in an Access column of Hub → Collaborations — Measurements now, with Nutrition, Training, and Planning laid out for later — where finding a trainee asks for read access to measurements, a linked trainee reads Read, each dashboard has its own action button, access types that do not fit collapse to an access icon that opens a dialog, and Revoke replaces Unlink and Remove in the panel, notifications, and toasts** — Archived 2026-10-28 → `context/archive/2026-10-28-improvment-for-status-collaborations/`. Lesson: —.
- **S-41: user can open a collapsible Charts tile above the add form with eight line charts, one per measurement field, for the selected week, month, year, or years, hover a line to read each entry and its difference versus the previous entry, chart only the entries checked in the list with Visualize, return to the whole month with Clear, and find those choices kept by the browser** — Archived 2026-10-28 → `context/archive/2026-10-28-visualization-of-measurements/`. Lesson: —.
- **S-42: user can open the add form with weight and every circumference already filled from their previous entry, and find the fields empty when there is no earlier entry** — Archived 2026-10-29 → `context/archive/2026-10-29-prev-values-for-new-measurement/`. Lesson: —.
- **S-43: user can open a signed-in page, the measurements screen above all, noticeably faster because the request makes fewer sequential round trips to Supabase, and sees the same data as before** — Archived 2026-10-29 → `context/archive/2026-10-29-reduce-supabase-round-trips/`. Lesson: —.
- **S-44: user can read their app role, trainee or trainer, in a read-only field above the email in Profile → Details, with a role icon that matches the other Details icons** — Archived 2026-10-30 → `context/archive/2026-10-30-role-view-in-profile/`. Lesson: —.
- **S-45: user can see icons across the app drawn from Lucide through the shadcn/ui components, and switch the whole app to a dark theme** — Archived 2026-10-31 → `context/archive/2026-10-30-app-small-redesign/`. Lesson: —.
- **S-46: user can open a separate Top changes tile with four radial charts — top weight gain, top circumference gain, top weight loss, top circumference loss — for the selected week, month, year, or last 5 years, read each chart's legend, and filter which circumferences the circumference charts show** — Archived 2026-11-01 → `context/archive/2026-11-01-top-progress-charts/`. Lesson: —.
- **S-47: user can open a Components screen beside Change password in Settings, switch each module — Measurements now, Nutrition, Training, and Planning off until built — on or off to show or hide it in the menu, pick off or a version for each component in one table saved with one button and a toast, and see a red preview badge with a warning tooltip on a preview tile; the add form and the entries list are separate New measurements and Measurements tiles** — Archived 2026-11-02 → `context/archive/2026-11-01-component-version-system/`. Lesson: —.
- **S-48: user can open the avatar menu, read their name with a profile icon as its first item above a separator and click it to open Profile, which replaces the separate Profile item, switch the theme from a Theme item with an icon above Sign out, set off by a separator, and no longer sees a Hello greeting on the left of the top bar** — Archived 2026-11-02 → `context/archive/2026-11-02-reorganization-of-component-placement/`. Lesson: —.
- **S-49: user can open Find trainee from a search field with a magnifier at the top left of the top bar (only the magnifier on a phone when the field does not fit), search trainees by email in a centered dialog that Esc or a click outside closes, tick Measurements under Request for (Nutrition, Training, and Planning disabled), and send the request with Request access** — Archived 2026-11-02 → `context/archive/2026-11-02-find-trainne-on-top-bar/`. Lesson: —.
- **S-50: user can find a trainee in Find trainee by first name or last name as well as by email, and read each match, and each trainee in the linked trainee choice, as in the Trainee column of Hub → Collaborations but with the full first name ("Ada Lovelace (ada@example.com)"), read tile headings without the selected trainee's name, and see the Request for checkboxes in two columns** — Archived 2026-11-02 → `context/archive/2026-11-02-find-tranne-by-first-and-lastname/`. Lesson: —.
- **S-51: user can open Top progress 0.9 (RC), on by default with a yellow release-candidate badge, filter every chart by circumference, pick the period with an arrowed choice box on the right of the tile, read Month charts labelled by the days of top progress, and still choose the previous Top progress version; every measurements tile uses same-width period choice boxes that offer only periods with entries, and Visualize, Clear, and the selection count sit on the left under the table** — Archived 2026-11-03 → `context/archive/2026-11-02-changes-to-measurments-and-progressions/`. Lesson: —.
