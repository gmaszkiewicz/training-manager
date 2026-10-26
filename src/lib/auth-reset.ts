const MISSING_ACCOUNT_CODE = "user_not_found";

export type ResetRequestResult = "sent" | "email-failed";

export const PASSWORD_RESET_NOTICE = "Your password was reset. Sign in with the new password.";
export const RESET_SENT_NOTICE = "Check your email for a password reset link.";
export const RESET_EMAIL_ERROR = "We could not send the reset email. Try again later.";
export const RESET_LINK_ERROR = "This reset link is no longer valid.";
export const PASSWORD_SHORT_ERROR = "Password must be at least 6 characters.";
export const PASSWORD_MISMATCH_ERROR = "Passwords do not match.";
export const PASSWORD_SAME_ERROR = "New password must be different from the current password.";
export const RESET_SIGNOUT_ERROR = "Your password was reset. We could not sign you out.";
export const PASSWORD_CHANGED_NOTICE = "Your password was changed.";
export const CURRENT_PASSWORD_ERROR = "Current password is incorrect.";
export const PASSWORD_UNCHANGED_ERROR = "Your password was not changed.";
export const PASSWORD_UNAVAILABLE_ERROR = "We could not change the password. Try again later.";
export const OTHER_SESSIONS_ERROR = "Your password was changed. We could not sign out your other sessions.";

export function isExpiredRecoveryHash(hash: string): boolean {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (value === "") {
    return false;
  }
  const params = new URLSearchParams(value);
  return params.get("error") === "access_denied" || params.get("error_code") === "otp_expired";
}

export function recoverySessionFromHash(hash: string): { accessToken: string; refreshToken: string } | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (value === "") {
    return null;
  }
  const params = new URLSearchParams(value);
  if (params.get("type") !== "recovery") {
    return null;
  }
  const accessToken = params.get("access_token") ?? "";
  const refreshToken = params.get("refresh_token") ?? "";
  if (accessToken === "" || refreshToken === "" || !isRecoveryAccessToken(accessToken)) {
    return null;
  }
  return { accessToken, refreshToken };
}

export function isRecoveryAccessToken(accessToken: string): boolean {
  const segment = accessToken.split(".")[1];
  if (!segment) {
    return false;
  }
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (segment.length % 4)) % 4);
    const payload = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))),
    ) as {
      amr?: { method?: string }[];
    };
    const methods = Array.isArray(payload.amr) ? payload.amr.map((entry) => entry.method) : [];
    return methods.includes("otp") && !methods.includes("password");
  } catch {
    return false;
  }
}

export function resetRequestResult(error: { code?: string | null } | null): ResetRequestResult {
  if (error === null || error.code === MISSING_ACCOUNT_CODE) {
    return "sent";
  }
  return "email-failed";
}

export function resetPageError(code: string | null): string | null {
  if (code === "reset-email") {
    return RESET_EMAIL_ERROR;
  }
  if (code === "reset-link") {
    return RESET_LINK_ERROR;
  }
  if (code === "password-short") {
    return PASSWORD_SHORT_ERROR;
  }
  if (code === "password-mismatch") {
    return PASSWORD_MISMATCH_ERROR;
  }
  if (code === "password-same") {
    return PASSWORD_SAME_ERROR;
  }
  if (code === "sign-out") {
    return RESET_SIGNOUT_ERROR;
  }
  return null;
}

export function profilePageError(code: string | null): string | null {
  if (code === "current-password") {
    return CURRENT_PASSWORD_ERROR;
  }
  if (code === "password-same") {
    return PASSWORD_SAME_ERROR;
  }
  if (code === "password-unchanged") {
    return PASSWORD_UNCHANGED_ERROR;
  }
  if (code === "password-unavailable") {
    return PASSWORD_UNAVAILABLE_ERROR;
  }
  if (code === "other-sessions") {
    return OTHER_SESSIONS_ERROR;
  }
  if (code === "password-short") {
    return PASSWORD_SHORT_ERROR;
  }
  if (code === "password-mismatch") {
    return PASSWORD_MISMATCH_ERROR;
  }
  return null;
}
