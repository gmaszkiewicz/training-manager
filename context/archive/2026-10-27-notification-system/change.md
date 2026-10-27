---
change_id: notification-system
title: Notification system with topbar bell and hub notifications table
status: archived
created: 2026-10-27
updated: 2026-10-27
archived_at: 2026-10-27T16:46:54Z
---

## Notes

A notification system that notifies the trainee/trainer about events.
It is shown as a bell between the menu and the avatar, with the number of active (unread) notifications.
Clicking the bell shows a list of notifications, with a button that goes to all notifications in hub -> notifications. When there are no active notifications, the bell stays visible without a badge (amended in the implementation review; originally hidden).

1. Clicking a specific notification marks it as read and navigates to the page it came from, e.g. collaborations.
2. The hub gets another button next to collaborations that lists these notifications as a table, like measurements: a checkbox to select a single row as well as all rows, so the selected ones can be marked as read or permanently deleted. It must be paginated, with 5, 10 or 15 notifications per page.
3. Events for now, for the trainer: your link request was accepted/rejected; trainee X removed the link.
4. For the trainee: trainer X sent a link request; trainer X removed the link.
