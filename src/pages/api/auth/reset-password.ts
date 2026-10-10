import type { APIRoute } from "astro";
import { resetRequestResult } from "@/lib/auth-reset";
import { createCookieFreeClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const emailValue = form.get("email");
  const email = typeof emailValue === "string" ? emailValue : "";

  const supabase = createCookieFreeClient();
  if (!supabase) {
    return context.redirect("/auth/reset-password?error=reset-email");
  }

  const registered = await supabase.rpc("email_is_registered", { p_email: email });
  if (registered.error) {
    return context.redirect("/auth/reset-password?error=reset-email");
  }
  if (!registered.data) {
    return context.redirect("/auth/reset-password?error=unknown-email");
  }

  const redirectTo = new URL("/auth/reset-password", context.url.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  const result = resetRequestResult(error);
  if (result === "sent") {
    return context.redirect("/auth/reset-password?notice=reset-sent");
  }
  if (result === "unknown") {
    return context.redirect("/auth/reset-password?error=unknown-email");
  }
  return context.redirect("/auth/reset-password?error=reset-email");
};
