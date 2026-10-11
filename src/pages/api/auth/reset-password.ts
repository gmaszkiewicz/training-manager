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

  const redirectTo = new URL("/auth/reset-password", context.url.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (resetRequestResult(error) === "sent") {
    return context.redirect("/auth/reset-password?notice=reset-sent");
  }
  return context.redirect("/auth/reset-password?error=reset-email");
};
