const MISSING_ACCOUNT_CODE = "user_not_found";

export type ResetRequestResult = "sent" | "email-failed";

export const PASSWORD_RESET_NOTICE = "Your password was reset. Sign in with the new password.";
export const RESET_SENT_NOTICE = "Check your email for a password reset link.";
export const RESET_EMAIL_ERROR = "We could not send the reset email. Try again later.";
export const RESET_LINK_ERROR = "This reset link is no longer valid.";
export const PASSWORD_SHORT_ERROR = "Password must be at least 6 characters.";
export const PASSWORD_MISMATCH_ERROR = "Passwords do not match.";

export function isExpiredRecoveryHash(hash: string): boolean {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (value === "") {
    return false;
  }
  const params = new URLSearchParams(value);
  return params.get("error") === "access_denied" || params.get("error_code") === "otp_expired";
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
  return null;
}
