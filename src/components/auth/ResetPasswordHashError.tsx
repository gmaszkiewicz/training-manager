import { useEffect } from "react";
import { isExpiredRecoveryHash } from "@/lib/auth-reset";

export default function ResetPasswordHashError() {
  useEffect(() => {
    if (isExpiredRecoveryHash(window.location.hash)) {
      window.location.replace("/auth/reset-password?error=reset-link");
    }
  }, []);

  return null;
}
