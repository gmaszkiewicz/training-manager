import { describe, expect, it } from "vitest";

import { resetRequestResult } from "@/lib/auth-reset";

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
