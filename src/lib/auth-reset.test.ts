import { describe, expect, it } from "vitest";

import {
  isExpiredRecoveryHash,
  isRecoveryAccessToken,
  recoverySessionFromHash,
  resetRequestResult,
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

  it("treats a rate limit or any other send failure as email-failed", () => {
    expect(resetRequestResult({ code: "over_email_send_rate_limit" })).toBe("email-failed");
    expect(resetRequestResult({ code: "unexpected_failure" })).toBe("email-failed");
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
