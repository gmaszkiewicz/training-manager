import type { APIRoute } from "astro";
import { RESET_EMAIL_ERROR, resetLimitError, resetRequestResult, resetWaitSeconds } from "@/lib/auth-reset";
import { authPage } from "@/lib/auth-response";
import { createCookieFreeClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const emailValue = form.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";

  const supabase = createCookieFreeClient();
  if (!supabase) {
    return authPage(context, "/auth/reset-password?error=reset-email", RESET_EMAIL_ERROR);
  }

  const redirectTo = new URL("/auth/reset-password", context.url.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  const result = resetRequestResult(error);
  if (result === "sent") {
    return authPage(context, "/auth/reset-password?notice=reset-sent");
  }
  if (result === "rate-limited") {
    const wait = resetWaitSeconds(error?.message);
    const waitQuery = wait === null ? "" : `&wait=${String(wait)}`;
    return authPage(context, `/auth/reset-password?error=reset-limit${waitQuery}`, resetLimitError(wait));
  }
  return authPage(context, "/auth/reset-password?error=reset-email", RESET_EMAIL_ERROR);
};
