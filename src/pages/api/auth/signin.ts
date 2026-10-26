import type { APIRoute } from "astro";
import { authPage } from "@/lib/auth-response";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const message = "Supabase is not configured";
    return authPage(context, `/auth/signin?error=${encodeURIComponent(message)}`, message);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return authPage(context, `/auth/signin?error=${encodeURIComponent(error.message)}`, error.message);
  }

  return authPage(context, "/measurements");
};
