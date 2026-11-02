import type { APIRoute } from "astro";
import { z } from "zod";

import { requestFailedMessage, requestOutcomeMessage } from "@/lib/collaborations";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { requestTraineeLink, searchUnlinkedTrainees } from "@/lib/services/trainer-links";
import { createClient } from "@/lib/supabase";
import type { LinkRequestOutcome } from "@/types";

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

type RequestAnswerOutcome = LinkRequestOutcome | "empty" | "failed";

const ANSWER_STATUS = {
  sent: 200,
  empty: 400,
  not_found: 404,
  pending: 409,
  granted: 409,
  failed: 500,
} as const satisfies Record<RequestAnswerOutcome, number>;

// The find dialog asks for JSON so the trainer stays on the current page; a plain form post still redirects.
function wantsJson(request: Request): boolean {
  return (request.headers.get("Accept") ?? "").includes("application/json");
}

function answer(outcome: RequestAnswerOutcome, message: string): Response {
  return json({ outcome, message }, ANSWER_STATUS[outcome]);
}

export const POST: APIRoute = async (context) => {
  const asJson = wantsJson(context.request);
  const user = context.locals.user;
  if (!user) {
    return asJson ? json({ outcome: "failed", message: "Sign in required" }, 401) : context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    const message = "Supabase is not configured";
    return asJson ? answer("failed", message) : measurementsError(context, message);
  }

  // The form may carry an optional `dashboards` field; only read access to measurements is requested for now.
  // Read it before any early answer: an unread body breaks the next request on a kept-alive connection.
  const form = await context.request.formData();

  // As GET does. The redirect branch keeps relying on the RPC, which answers not_found to anyone but a trainer.
  if (asJson && (await readProfileRole(supabase, user.id)) !== "trainer") {
    return json({ outcome: "failed", message: "Only trainers can request access to a trainee" }, 403);
  }
  const submitted = form.get("email");
  if (typeof submitted !== "string" || submitted.trim() === "") {
    const message = "Enter an email address";
    return asJson ? answer("empty", message) : measurementsError(context, message);
  }

  const trainee = preservedTrainee(form.get("trainee"));
  const parsed = emailSchema.safeParse(submitted);
  if (!parsed.success) {
    const message = requestOutcomeMessage("not_found", submitted.trim());
    return asJson ? answer("not_found", message) : measurementsError(context, message, trainee);
  }

  const email = parsed.data;
  const requested = await requestTraineeLink(supabase, email);
  if (!requested.ok) {
    return asJson ? answer("failed", requestFailedMessage) : measurementsError(context, requestFailedMessage, trainee);
  }

  if (asJson) {
    return answer(requested.outcome, requestOutcomeMessage(requested.outcome, email));
  }

  if (requested.outcome !== "sent") {
    return measurementsError(context, requestOutcomeMessage(requested.outcome, email), trainee);
  }

  const kept = trainee ? `&trainee=${encodeURIComponent(trainee)}` : "";
  return context.redirect(`/measurements?requested=${encodeURIComponent(email)}${kept}`);
};
