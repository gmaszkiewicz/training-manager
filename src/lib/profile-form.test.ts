import { describe, expect, it } from "vitest";

import {
  avatarInitials,
  FIRST_NAME_LONG_ERROR,
  LAST_NAME_LONG_ERROR,
  parseProfileNames,
  PROFILE_UNAVAILABLE_ERROR,
  profilePageError,
  profileNamesSchema,
} from "@/lib/profile-form";

describe("profileNamesSchema", () => {
  it("trims both names", () => {
    expect(profileNamesSchema.parse({ firstName: "  Anna ", lastName: "\tNowak\n" })).toEqual({
      firstName: "Anna",
      lastName: "Nowak",
    });
  });

  it("accepts 50 characters", () => {
    const name = "a".repeat(50);
    expect(profileNamesSchema.parse({ firstName: name, lastName: name })).toEqual({ firstName: name, lastName: name });
  });

  it("rejects a 51-character first name", () => {
    expect(parseProfileNames({ firstName: "a".repeat(51), lastName: "Nowak" })).toEqual({
      ok: false,
      code: "first-name-long",
      error: FIRST_NAME_LONG_ERROR,
    });
  });

  it("rejects a 51-character last name", () => {
    expect(parseProfileNames({ firstName: "Anna", lastName: "a".repeat(51) })).toEqual({
      ok: false,
      code: "last-name-long",
      error: LAST_NAME_LONG_ERROR,
    });
  });

  it("measures length after trimming", () => {
    const name = ` ${"a".repeat(50)} `;
    expect(parseProfileNames({ firstName: name, lastName: "" })).toEqual({
      ok: true,
      names: { firstName: "a".repeat(50), lastName: null },
    });
  });

  it("stores empty and blank names as null", () => {
    expect(parseProfileNames({ firstName: "", lastName: "   " })).toEqual({
      ok: true,
      names: { firstName: null, lastName: null },
    });
  });
});

describe("avatarInitials", () => {
  it("uses both initials when both names exist", () => {
    expect(avatarInitials({ firstName: "Anna", lastName: "Nowak", email: "x@example.com" })).toBe("AN");
  });

  it("uses one initial when only the first name exists", () => {
    expect(avatarInitials({ firstName: "Anna", lastName: null, email: "x@example.com" })).toBe("A");
  });

  it("uses one initial when only the last name exists", () => {
    expect(avatarInitials({ firstName: null, lastName: "Nowak", email: "x@example.com" })).toBe("N");
  });

  it("falls back to the first letter of the email", () => {
    expect(avatarInitials({ firstName: null, lastName: null, email: "jan@example.com" })).toBe("J");
  });

  it("uppercases lowercase input", () => {
    expect(avatarInitials({ firstName: "anna", lastName: "nowak", email: "x@example.com" })).toBe("AN");
  });
});

describe("profilePageError", () => {
  it("maps each profile error code to its copy", () => {
    expect(profilePageError("first-name-long")).toBe(FIRST_NAME_LONG_ERROR);
    expect(profilePageError("last-name-long")).toBe(LAST_NAME_LONG_ERROR);
    expect(profilePageError("profile-unavailable")).toBe(PROFILE_UNAVAILABLE_ERROR);
  });

  it("ignores unknown and missing codes", () => {
    expect(profilePageError("current-password")).toBeNull();
    expect(profilePageError(null)).toBeNull();
  });
});
