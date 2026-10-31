/** The stored theme choice; "system" follows the operating system. */
export type ThemePreference = "light" | "dark" | "system";

// Duplicated in the inline head script in src/layouts/Layout.astro; keep the key and values in sync.
export const THEME_STORAGE_KEY = "theme";

/** Narrows a raw stored value to a theme preference; anything else is "system". */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/** Resolves a preference to the theme to apply, using the OS setting for "system". */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}
