import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isRecoveryAccessToken } from "@/lib/auth-reset";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/db/database.types";

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

function isSamePassword(error: { code?: string } | null): boolean {
  return error?.code === "same_password";
}

async function commitPassword(context: Parameters<APIRoute>[0], supabase: SupabaseClient<Database>, password: string) {
  const updated = await supabase.auth.updateUser({ password });
  if (isSamePassword(updated.error)) {
    return context.redirect("/auth/reset-password?error=password-same");
  }
  await supabase.auth.signOut();
  if (updated.error) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }
  return context.redirect("/auth/signin?notice=password-reset");
}

async function updateRecoverySession(
  context: Parameters<APIRoute>[0],
  supabase: SupabaseClient<Database>,
  password: string,
  confirmPassword: string,
) {
  const { data } = await supabase.auth.getSession();
  if (!isRecoveryAccessToken(data.session?.access_token ?? "")) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return context.redirect("/auth/reset-password?error=password-short");
  }
  if (password !== confirmPassword) {
    return context.redirect("/auth/reset-password?error=password-mismatch");
  }
  return commitPassword(context, supabase, password);
}

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const tokenHash = formField(form, "token_hash");
  const type = formField(form, "type");
  const password = formField(form, "password");
  const confirmPassword = formField(form, "confirmPassword");

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  if (tokenHash === "" || type !== "recovery") {
    return updateRecoverySession(context, supabase, password, confirmPassword);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return context.redirect(passwordRedirect(tokenHash, "password-short"));
  }

  if (password !== confirmPassword) {
    return context.redirect(passwordRedirect(tokenHash, "password-mismatch"));
  }

  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  if (verified.error || !verified.data.session) {
    return context.redirect("/auth/reset-password?error=reset-link");
  }

  return commitPassword(context, supabase, password);
};
