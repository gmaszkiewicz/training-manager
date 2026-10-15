import type { APIRoute } from "astro";

import { readProfileRole } from "@/lib/services/ensure-profile";
import { linkTraineeByEmail, searchUnlinkedTrainees } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function measurementsError(context: Parameters<APIRoute>[0], message: string, trainee?: string) {
  const error = encodeURIComponent(message);
  const query = trainee ? `error=${error}&trainee=${encodeURIComponent(trainee)}` : `error=${error}`;
  return context.redirect(`/measurements?${query}`);
}

function preservedTrainee(value: FormDataEntryValue | null): string | undefined {
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return value;
  }

  return undefined;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return json({ error: "Sign in required" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured" }, 500);
  }

  const role = await readProfileRole(supabase, user.id);
  if (role !== "trainer") {
    return json({ error: "Could not search trainees" }, 403);
  }

  const query = new URL(context.request.url).searchParams.get("q") ?? "";
  const searched = await searchUnlinkedTrainees(supabase, query);
  if (!searched.ok) {
    return json({ error: "Could not search trainees" }, 500);
  }

  return json({ emails: searched.emails }, 200);
};

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return measurementsError(context, "Supabase is not configured");
  }

  const form = await context.request.formData();
  const submitted = form.get("email");
  const email = typeof submitted === "string" ? submitted : "";
  if (email.trim().toLowerCase() === "") {
    return measurementsError(context, "Enter an email address");
  }

  const linked = await linkTraineeByEmail(supabase, email);
  if (!linked.ok) {
    return measurementsError(context, "No trainee with that email", preservedTrainee(form.get("trainee")));
  }

  return context.redirect(`/measurements?trainee=${encodeURIComponent(linked.traineeId)}`);
};
