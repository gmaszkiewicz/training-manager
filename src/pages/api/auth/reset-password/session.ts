import type { APIRoute } from "astro";
import { isRecoveryAccessToken } from "@/lib/auth-reset";
import { createClient } from "@/lib/supabase";

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const accessToken = formField(form, "access_token");
  const refreshToken = formField(form, "refresh_token");
  if (accessToken === "" || refreshToken === "" || !isRecoveryAccessToken(accessToken)) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !isRecoveryAccessToken(data.session?.access_token ?? "")) {
    await supabase.auth.signOut();
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  return context.redirect("/auth/reset-password?recovery=1");
};
