import type { APIRoute } from "astro";
import { z } from "zod";

import { requestOutcomeMessage } from "@/lib/collaborations";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { requestTraineeLink, searchUnlinkedTrainees } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const emailSchema = z.string().trim().min(1).max(320);
const traineeSchema = z.uuid();

function measurementsError(context: Parameters<APIRoute>[0], message: string, trainee?: string) {
  const error = encodeURIComponent(message);
  const query = trainee ? `error=${error}&trainee=${encodeURIComponent(trainee)}` : `error=${error}`;
  return context.redirect(`/measurements?${query}`);
}

function preservedTrainee(value: FormDataEntryValue | null): string | undefined {
  const parsed = traineeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
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
  if (typeof submitted !== "string" || submitted.trim() === "") {
    return measurementsError(context, "Enter an email address");
  }

  const trainee = preservedTrainee(form.get("trainee"));
  const parsed = emailSchema.safeParse(submitted);
  if (!parsed.success) {
    return measurementsError(context, requestOutcomeMessage("not_found", submitted.trim()), trainee);
  }

  const email = parsed.data;
  const requested = await requestTraineeLink(supabase, email);
  if (!requested.ok) {
    return measurementsError(context, requestOutcomeMessage("not_found", email), trainee);
  }

  if (requested.outcome !== "sent") {
    return measurementsError(context, requestOutcomeMessage(requested.outcome, email), trainee);
  }

  const kept = trainee ? `&trainee=${encodeURIComponent(trainee)}` : "";
  return context.redirect(`/measurements?requested=${encodeURIComponent(email)}${kept}`);
};
