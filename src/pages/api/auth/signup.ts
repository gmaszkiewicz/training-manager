import type { APIRoute } from "astro";
import { authPage } from "@/lib/auth-response";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;
  const submittedRole = form.get("role");
  const role = submittedRole === "trainee" || submittedRole === "trainer" ? submittedRole : null;
  if (!role) {
    const message = "Choose Trainee or Trainer";
    return authPage(context, `/auth/signup?error=${encodeURIComponent(message)}`, message);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const message = "Supabase is not configured";
    return authPage(context, `/auth/signup?error=${encodeURIComponent(message)}`, message);
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } },
  });

  if (error) {
    return authPage(context, `/auth/signup?error=${encodeURIComponent(error.message)}`, error.message);
  }

  if (data.session) {
    return authPage(context, "/measurements");
  }

  return authPage(context, "/auth/confirm-email");
};
