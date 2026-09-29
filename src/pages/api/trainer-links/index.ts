import type { APIRoute } from "astro";

import { linkTraineeByEmail } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dashboardError(context: Parameters<APIRoute>[0], message: string, trainee?: string) {
  const error = encodeURIComponent(message);
  const query = trainee ? `error=${error}&trainee=${encodeURIComponent(trainee)}` : `error=${error}`;
  return context.redirect(`/dashboard?${query}`);
}

function preservedTrainee(value: FormDataEntryValue | null): string | undefined {
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return value;
  }

  return undefined;
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return dashboardError(context, "Supabase is not configured");
  }

  const form = await context.request.formData();
  const submitted = form.get("email");
  const email = typeof submitted === "string" ? submitted : "";
  if (email.trim().toLowerCase() === "") {
    return dashboardError(context, "Enter an email address");
  }

  const linked = await linkTraineeByEmail(supabase, email);
  if (!linked.ok) {
    return dashboardError(context, "No trainee with that email", preservedTrainee(form.get("trainee")));
  }

  return context.redirect(`/dashboard?trainee=${encodeURIComponent(linked.traineeId)}`);
};
