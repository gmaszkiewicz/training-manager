---
change_id: block-merge-on-failed-ci
title: Block merge when CI fails
status: archived
created: 2026-10-05
updated: 2026-10-05
archived_at: 2026-10-05T13:27:41Z
---

## Notes

Separate from S-17 `ci-cd-workflow-updates`, which only aligns the deploy docs. This change makes `main` reject a pull request whose `ci` or `smoke` check fails, and reject a direct push. The repository becomes public so GitHub Free can enforce branch protection.
