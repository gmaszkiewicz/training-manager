import type { APIRoute } from "astro";

import { createMeasurementInputSchema } from "@/lib/measurement-input";
import { addMeasurement } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function measurementsError(context: Parameters<APIRoute>[0], message: string) {
  return context.redirect(`/measurements?error=${encodeURIComponent(message)}`);
}

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
  const parsed = createMeasurementInputSchema(new Date()).safeParse({
    measured_on: form.get("measured_on"),
    weight_kg: form.get("weight_kg"),
    chest_cm: form.get("chest_cm"),
    waist_cm: form.get("waist_cm"),
    arms_cm: form.get("arms_cm"),
    thigh_cm: form.get("thigh_cm"),
    calf_cm: form.get("calf_cm"),
    hips_cm: form.get("hips_cm"),
    navel_cm: form.get("navel_cm"),
    note: form.get("note"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Could not save the measurement";
    return measurementsError(context, message);
  }

  const saved = await addMeasurement(supabase, user.id, parsed.data);
  if (!saved.ok) {
    return measurementsError(context, "Could not save the measurement");
  }

  return context.redirect("/measurements");
};
