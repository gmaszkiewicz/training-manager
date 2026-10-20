import type { APIRoute } from "astro";
import {
  CURRENT_PASSWORD_ERROR,
  OTHER_SESSIONS_ERROR,
  PASSWORD_MISMATCH_ERROR,
  PASSWORD_SAME_ERROR,
  PASSWORD_SHORT_ERROR,
  PASSWORD_UNAVAILABLE_ERROR,
  PASSWORD_UNCHANGED_ERROR,
} from "@/lib/auth-reset";
import { authPage } from "@/lib/auth-response";
import { createClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return authPage(context, "/auth/signin");
  }

  const form = await context.request.formData();
  const currentPassword = formField(form, "currentPassword");
  const newPassword = formField(form, "password");
  const confirmPassword = formField(form, "confirmPassword");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return authPage(context, "/profile?error=password-short", PASSWORD_SHORT_ERROR);
  }

  if (newPassword !== confirmPassword) {
    return authPage(context, "/profile?error=password-mismatch", PASSWORD_MISMATCH_ERROR);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return authPage(context, "/profile?error=password-unavailable", PASSWORD_UNAVAILABLE_ERROR);
  }

  const proved = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });
  if (proved.error) {
    return authPage(context, "/profile?error=current-password", CURRENT_PASSWORD_ERROR);
  }

  const updated = await supabase.auth.updateUser({ password: newPassword });
  if (updated.error?.code === "same_password") {
    return authPage(context, "/profile?error=password-same", PASSWORD_SAME_ERROR);
  }
  if (updated.error) {
    return authPage(context, "/profile?error=password-unchanged", PASSWORD_UNCHANGED_ERROR);
  }

  const signedOut = await supabase.auth.signOut({ scope: "others" });
  if (signedOut.error) {
    return authPage(context, "/profile?error=other-sessions", OTHER_SESSIONS_ERROR);
  }
  return authPage(context, "/profile?notice=password-changed");
};
