import { describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY, parseThemePreference, resolveTheme } from "@/lib/theme";

describe("THEME_STORAGE_KEY", () => {
  it("matches the key the head script reads", () => {
    expect(THEME_STORAGE_KEY).toBe("theme");
  });
});

describe("parseThemePreference", () => {
  it("keeps each stored value", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("falls back to system for anything else", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("Dark")).toBe("system");
    expect(parseThemePreference("purple")).toBe("system");
    expect(parseThemePreference(1)).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("applies an explicit choice whatever the OS says", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the OS on system", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
  });
});
