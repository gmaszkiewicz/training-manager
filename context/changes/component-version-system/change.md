---
change_id: component-version-system
title: Settings screen to toggle modules and pick component versions
status: impl_reviewed
created: 2026-11-01
updated: 2026-11-01
archived_at: null
---

## Notes

1) Add another screen in Settings, next to Change password: **Components**.
It controls which component versions are shown on the site.
- Split by module: measurements, nutrition, training, planning.
- A whole module can be switched off; it then disappears from the menu.
- Preview versions are unselected by default, so a preview component stays hidden until chosen.
- All modules except measurements are off by default for now, because they are not implemented yet.
- Each module's table lists the component name and a choice box with "off" or the component version to use:
  - new measurement v.1.0
  - measurements v.1.0
  - progression v.1.0
  - top changes v.0.1 (preview)
- Below the table, one Save button for all rows, like on Details and Avatar.
- A preview version is also marked on the collapsible tile itself: a red badge with a tooltip saying it is a preview version and may contain bugs.
- Toast on save, as everywhere else.

2) For this feature, split the "Add your next measurements" tile and the measurements table into two separate tiles (rule: a tile is a separate collapsible element, like the charts):
- "Add your next measurements" is renamed to **New measurements**.
- The measurements table tile is named simply **Measurements**.
