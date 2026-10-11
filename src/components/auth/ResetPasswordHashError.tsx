import { useEffect } from "react";
import { isExpiredRecoveryHash, recoverySessionFromHash } from "@/lib/auth-reset";

export default function ResetPasswordHashError() {
  useEffect(() => {
    const hash = window.location.hash;
    if (isExpiredRecoveryHash(hash)) {
      window.location.replace("/auth/reset-password?error=reset-link");
      return;
    }
    const session = recoverySessionFromHash(hash);
    if (!session) {
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/reset-password/session";
    for (const [name, value] of [
      ["access_token", session.accessToken],
      ["refresh_token", session.refreshToken],
    ] as const) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }, []);

  return null;
}
