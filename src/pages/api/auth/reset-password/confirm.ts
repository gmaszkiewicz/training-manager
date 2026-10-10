import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function passwordRedirect(tokenHash: string, error: "password-short" | "password-mismatch"): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: "recovery",
    error,
  });
  return `/auth/reset-password?${params.toString()}`;
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const tokenHash = formField(form, "token_hash");
  const type = formField(form, "type");
  const password = formField(form, "password");
  const confirmPassword = formField(form, "confirmPassword");

  if (tokenHash === "" || type !== "recovery") {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return context.redirect(passwordRedirect(tokenHash, "password-short"));
  }

  if (password !== confirmPassword) {
    return context.redirect(passwordRedirect(tokenHash, "password-mismatch"));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (verified.error || !verified.data.session) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  const updated = await supabase.auth.updateUser({ password });
  await supabase.auth.signOut();
  if (updated.error) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  return context.redirect("/auth/signin?notice=password-reset");
};
