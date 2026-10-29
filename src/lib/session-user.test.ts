import { describe, expect, it } from "vitest";

import { sessionUserFromClaims } from "@/lib/session-user";

describe("sessionUserFromClaims", () => {
  it("maps valid claims to a session user", () => {
    expect(
      sessionUserFromClaims({
        sub: "user-1",
        email: "ada@example.com",
        user_metadata: { first_name: "Ada", last_name: "Lovelace" },
        role: "authenticated",
      }),
    ).toEqual({
      id: "user-1",
      email: "ada@example.com",
      user_metadata: { first_name: "Ada", last_name: "Lovelace" },
    });
  });

  it("returns null for null or undefined claims", () => {
    expect(sessionUserFromClaims(null)).toBeNull();
    expect(sessionUserFromClaims(undefined)).toBeNull();
  });

  it("returns null when sub is missing, empty or not a string", () => {
    expect(sessionUserFromClaims({ email: "ada@example.com" })).toBeNull();
    expect(sessionUserFromClaims({ sub: "" })).toBeNull();
    expect(sessionUserFromClaims({ sub: 42 })).toBeNull();
  });

  it("omits a non-string email", () => {
    const user = sessionUserFromClaims({ sub: "user-1", email: 42, user_metadata: {} });
    expect(user).toEqual({ id: "user-1", user_metadata: {} });
    expect(user).not.toHaveProperty("email");
  });

  it("falls back to empty user_metadata when it is missing or not an object", () => {
    expect(sessionUserFromClaims({ sub: "user-1" })?.user_metadata).toEqual({});
    expect(sessionUserFromClaims({ sub: "user-1", user_metadata: null })?.user_metadata).toEqual({});
    expect(sessionUserFromClaims({ sub: "user-1", user_metadata: ["a"] })?.user_metadata).toEqual({});
    expect(sessionUserFromClaims({ sub: "user-1", user_metadata: "Ada" })?.user_metadata).toEqual({});
  });
});
