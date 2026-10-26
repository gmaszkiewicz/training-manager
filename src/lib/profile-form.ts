import { z } from "zod";

import type { ProfileNames } from "@/types";

export const PROFILE_NAME_MAX_LENGTH = 50;

export const FIRST_NAME_LONG_ERROR = "First name must be at most 50 characters.";
export const LAST_NAME_LONG_ERROR = "Last name must be at most 50 characters.";
export const PROFILE_UNAVAILABLE_ERROR = "We could not save your details. Try again later.";
export const PROFILE_SAVED_NOTICE = "Your details were saved.";

export type ProfileNamesErrorCode = "first-name-long" | "last-name-long";

function nameField(longError: string) {
  return z
    .string()
    .trim()
    .max(PROFILE_NAME_MAX_LENGTH, longError)
    .transform((value): string | null => (value === "" ? null : value));
}

export const profileNamesSchema = z.object({
  firstName: nameField(FIRST_NAME_LONG_ERROR),
  lastName: nameField(LAST_NAME_LONG_ERROR),
});

export function parseProfileNames(
  input: unknown,
): { ok: true; names: ProfileNames } | { ok: false; code: ProfileNamesErrorCode; error: string } {
  const parsed = profileNamesSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, names: parsed.data };
  }
  const firstNameFailed = parsed.error.issues.some((issue) => issue.path[0] === "firstName");
  if (!firstNameFailed) {
    return { ok: false, code: "last-name-long", error: LAST_NAME_LONG_ERROR };
  }
  return { ok: false, code: "first-name-long", error: FIRST_NAME_LONG_ERROR };
}

function firstLetter(value: string | null): string {
  const letters = Array.from(value?.trim() ?? "");
  return letters.length === 0 ? "" : letters[0].toUpperCase();
}

export function avatarInitials({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const initials = firstLetter(firstName) + firstLetter(lastName);
  return initials !== "" ? initials : firstLetter(email);
}

export function profilePageError(code: string | null): string | null {
  if (code === "first-name-long") {
    return FIRST_NAME_LONG_ERROR;
  }
  if (code === "last-name-long") {
    return LAST_NAME_LONG_ERROR;
  }
  if (code === "profile-unavailable") {
    return PROFILE_UNAVAILABLE_ERROR;
  }
  return null;
}
