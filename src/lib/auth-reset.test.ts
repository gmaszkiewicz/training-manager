import { describe, expect, it } from "vitest";

import { isExpiredRecoveryHash, resetRequestResult } from "@/lib/auth-reset";

describe("resetRequestResult", () => {
  it("treats no error as sent", () => {
    expect(resetRequestResult(null)).toBe("sent");
  });

  it("treats a missing account as unknown", () => {
    expect(resetRequestResult({ code: "user_not_found" })).toBe("unknown");
  });

  it("treats a rate limit or any other send failure as email-failed", () => {
    expect(resetRequestResult({ code: "over_email_send_rate_limit" })).toBe("email-failed");
    expect(resetRequestResult({ code: "unexpected_failure" })).toBe("email-failed");
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
