// The `tm.*` preference cookie policy: how long they live and which ones on a request belong to another account.

/** 30 days, in seconds. */
export const PREFERENCE_COOKIE_MAX_AGE = 2592000;

const PREFERENCE_PREFIX = "tm.";

/**
 * Index of the account id in a dot-split preference name: `tm.measurements.<name>.<accountId>[.<traineeId>]`.
 */
const ACCOUNT_SEGMENT_INDEX = 3;

/**
 * Names (as they appear in the header) of `tm.*` cookies that do not belong to `accountUserId`. A `tm.` name without
 * an account segment also counts as stale. Other cookies (`sb-*`, `theme`, …) are never returned.
 */
export function staleAccountCookieNames(cookieHeader: string | null, accountUserId: string): string[] {
  if (!cookieHeader) {
    return [];
  }
  const stale: string[] = [];
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    const name = (separator === -1 ? pair : pair.slice(0, separator)).trim();
    if (!name.startsWith(PREFERENCE_PREFIX)) {
      continue;
    }
    if (name.split(".")[ACCOUNT_SEGMENT_INDEX] !== accountUserId) {
      stale.push(name);
    }
  }
  return stale;
}
