import type { APIRoute } from "astro";

import { parseMeasuredOn } from "@/lib/measurement-input";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { readPreviousMeasurement } from "@/lib/services/measurements";
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

  const read = await readPreviousMeasurement(supabase, user.id, measuredOn);
  if (!read.ok) {
    return json({ error: "Could not load measurements" }, 500);
  }

  if (read.entry === null) {
    return json({ entry: null }, 200);
  }

  return json(
    {
      entry: {
        id: read.entry.id,
        measured_on: read.entry.measured_on,
        weight_kg: read.entry.weight_kg,
        chest_cm: read.entry.chest_cm,
        waist_cm: read.entry.waist_cm,
        arms_cm: read.entry.arms_cm,
        thigh_cm: read.entry.thigh_cm,
        calf_cm: read.entry.calf_cm,
        hips_cm: read.entry.hips_cm,
        navel_cm: read.entry.navel_cm,
      },
    },
    200,
  );
};
