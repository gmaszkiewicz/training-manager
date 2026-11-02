# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Show every error as a toast, also inside dialogs

- **Context**: Any form, dialog, sheet or React island that shows a user-facing error — server answers, request outcomes and validation (e.g. src/components/trainer/FindTraineeDialog.tsx, auth forms via useFormErrors).
- **Problem**: The find-trainne-on-top-bar plan asked for an inline aria-live error message inside the Find trainee dialog, and the impl review pushed the code to match it, while every other error in the app is a toast. The result was two error surfaces and a rework back to toasts.
- **Rule**: Always show user-facing error text as a toast via PageErrorToasts (or useFormErrors for forms), also inside modal dialogs; mark the offending field aria-invalid instead of writing the message under it. Inside a Radix dialog render the toast with `portal` and keep the dialog open by preventing onPointerDownOutside/onInteractOutside for targets inside [data-error-toast-stack]. Never plan inline error messages.
- **Applies to**: plan, plan-review, implement, impl-review
