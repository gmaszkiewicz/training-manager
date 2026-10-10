import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const form = await context.request.formData();
  const currentPassword = formField(form, "currentPassword");
  const newPassword = formField(form, "password");
  const confirmPassword = formField(form, "confirmPassword");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return context.redirect("/profile?error=password-short");
  }

  if (newPassword !== confirmPassword) {
    return context.redirect("/profile?error=password-mismatch");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/profile?error=password-unchanged");
  }

  const proved = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });
  if (proved.error) {
    return context.redirect("/profile?error=current-password");
  }

  const updated = await supabase.auth.updateUser({ password: newPassword });
  if (updated.error) {
    return context.redirect("/profile?error=password-unchanged");
  }

  await supabase.auth.signOut({ scope: "others" });
  return context.redirect("/profile?notice=password-changed");
};
