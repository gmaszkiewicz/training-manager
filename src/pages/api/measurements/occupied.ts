import type { APIRoute } from "astro";

import { parseMeasuredOn } from "@/lib/measurement-input";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { readMinuteTaken } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

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
  if (role !== "trainee") {
    return json({ error: "Could not open your journal" }, 403);
  }

  const measuredOn = parseMeasuredOn(new URL(context.request.url).searchParams.get("measured_on"), new Date());
  if (measuredOn === null) {
    return json({ error: "Invalid date and time" }, 400);
  }

  const read = await readMinuteTaken(supabase, user.id, measuredOn);
  if (!read.ok) {
    return json({ error: "Could not load measurements" }, 500);
  }

  return json({ taken: read.taken }, 200);
};
