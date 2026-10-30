import { describe, expect, it } from "vitest";

import { parseProfileRole, profileRoleLabel } from "@/lib/profile-role";

describe("parseProfileRole", () => {
  it("keeps both app roles", () => {
    expect(parseProfileRole("trainee")).toBe("trainee");
    expect(parseProfileRole("trainer")).toBe("trainer");
  });

  it("narrows anything else to null", () => {
    expect(parseProfileRole(null)).toBeNull();
    expect(parseProfileRole(undefined)).toBeNull();
    expect(parseProfileRole("")).toBeNull();
    expect(parseProfileRole("admin")).toBeNull();
  });
});

describe("profileRoleLabel", () => {
  it("maps each role to its display copy", () => {
    expect(profileRoleLabel("trainee")).toBe("Trainee");
    expect(profileRoleLabel("trainer")).toBe("Trainer");
  });
});
