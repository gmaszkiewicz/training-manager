import { useCallback, useEffect, useSyncExternalStore } from "react";
import { writeStored } from "@/lib/browser-storage";
import { parseThemePreference, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const themeChangeEvent = "theme-change";

// Stands in for storage when it is unavailable (private mode, blocked site data), so the menu still shows the choice.
let memoryPreference: ThemePreference = "system";

function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return memoryPreference;
  }
}

function serverSnapshot(): ThemePreference | null {
  return null;
}

// Every switch on the page (the kitchen sink renders several) re-reads storage when one of them writes it.
function subscribe(onChange: () => void): () => void {
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function applyTheme(preference: ThemePreference): void {
  const systemDark = window.matchMedia(DARK_QUERY).matches;
  document.documentElement.classList.toggle("dark", resolveTheme(preference, systemDark) === "dark");
}

export interface ThemeControl {
  preference: ThemePreference | null;
  setPreference: (next: ThemePreference) => void;
}

/**
 * The stored theme preference and a setter that persists and applies it. `preference` is `null` on the server and
 * hydration renders, because the server cannot know it; storage is read right after. While on "system", follows OS
 * colour-scheme changes live.
 */
export function useTheme(): ThemeControl {
  const preference = useSyncExternalStore(subscribe, readStoredPreference, serverSnapshot);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    writeStored(THEME_STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  return { preference, setPreference };
}
