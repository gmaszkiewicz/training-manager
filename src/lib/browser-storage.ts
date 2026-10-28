// localStorage and cookie writes that never throw: storage can be blocked, and the controls still update on screen.

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice still applies on screen for this visit.
  }
}

export function writeCookie(name: string, value: string): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // The next document request then renders the default.
  }
}

/** Remember a preference in storage and in the cookie the next document request renders from. */
export function writePreference(key: string, value: string): void {
  writeStored(key, value);
  writeCookie(key, value);
}
