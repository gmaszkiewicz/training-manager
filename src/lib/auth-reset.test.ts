import { describe, expect, it } from "vitest";

import {
  isExpiredRecoveryHash,
  isRecoveryAccessToken,
  recoverySessionFromHash,
  resetLimitError,
  resetRequestResult,
  resetWaitSeconds,
} from "@/lib/auth-reset";

function accessToken(payload: unknown): string {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.sig`;
}

describe("resetRequestResult", () => {
  it("treats no error as sent", () => {
    expect(resetRequestResult(null)).toBe("sent");
  });

  it("treats a missing account as sent", () => {
    expect(resetRequestResult({ code: "user_not_found" })).toBe("sent");
  });

  it("treats a send limit as rate-limited", () => {
    expect(resetRequestResult({ code: "over_email_send_rate_limit" })).toBe("rate-limited");
    expect(resetRequestResult({ code: "over_request_rate_limit" })).toBe("rate-limited");
  });

  it("treats any other send failure as email-failed", () => {
    expect(resetRequestResult({ code: "unexpected_failure" })).toBe("email-failed");
  });
});

describe("resetWaitSeconds", () => {
  it("reads the cooldown seconds from the Supabase message", () => {
    expect(resetWaitSeconds("For security purposes, you can only request this after 52 seconds.")).toBe(52);
    expect(resetWaitSeconds("For security purposes, you can only request this after 1 second.")).toBe(1);
  });

  it("returns null without a wait in the message", () => {
    expect(resetWaitSeconds("Email rate limit exceeded")).toBe(null);
    expect(resetWaitSeconds(null)).toBe(null);
  });
});

describe("resetLimitError", () => {
  it("names the wait when there is one", () => {
    expect(resetLimitError(1)).toBe("Too many reset emails were requested. Wait 1 second and try again.");
    expect(resetLimitError(52)).toBe("Too many reset emails were requested. Wait 52 seconds and try again.");
  });

  it("falls back to a few minutes without a wait", () => {
    expect(resetLimitError(null)).toBe("Too many reset emails were sent. Try again in a few minutes.");
  });
});

describe("isRecoveryAccessToken", () => {
  it("accepts a recovery session and rejects a password session", () => {
    expect(isRecoveryAccessToken(accessToken({ amr: [{ method: "otp" }] }))).toBe(true);
    expect(isRecoveryAccessToken(accessToken({ amr: [{ method: "password" }] }))).toBe(false);
    expect(isRecoveryAccessToken(accessToken({ amr: [{ method: "otp" }, { method: "password" }] }))).toBe(false);
    expect(isRecoveryAccessToken("not-a-token")).toBe(false);
  });
});

describe("recoverySessionFromHash", () => {
  it("reads a recovery session from the redirect hash and ignores other hashes", () => {
    const token = accessToken({ amr: [{ method: "otp" }] });
    const session = recoverySessionFromHash(`#access_token=${token}&refresh_token=refresh&type=recovery`);
    expect(session).toEqual({ accessToken: token, refreshToken: "refresh" });
    expect(recoverySessionFromHash(`#access_token=${token}&refresh_token=refresh&type=signup`)).toBe(null);
    expect(recoverySessionFromHash("")).toBe(null);
  });
});

describe("isExpiredRecoveryHash", () => {
  it("recognises the auth redirect for a used or expired recovery link", () => {
    expect(
      isExpiredRecoveryHash(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toBe(true);
  });

  it("ignores an empty hash and a recovery token in the query", () => {
    expect(isExpiredRecoveryHash("")).toBe(false);
    expect(isExpiredRecoveryHash("#access_token=abc&type=recovery")).toBe(false);
  });
});
