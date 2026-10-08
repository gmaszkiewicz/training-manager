import type { APIRoute } from "astro";

import { createMeasurementInputSchema } from "@/lib/measurement-input";
import { updateMeasurement } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function measurementsError(context: Parameters<APIRoute>[0], message: string, editId?: string) {
  const error = encodeURIComponent(message);
  const query = editId === undefined ? `error=${error}` : `edit=${encodeURIComponent(editId)}&error=${error}`;
  return context.redirect(`/measurements?${query}`);
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const measurementId = context.params.id ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return measurementsError(context, "Supabase is not configured", measurementId);
  }

  if (!UUID_PATTERN.test(measurementId)) {
    return measurementsError(context, "Could not save the measurement");
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
    return measurementsError(context, message, measurementId);
  }

  const saved = await updateMeasurement(supabase, user.id, measurementId, parsed.data);
  if (!saved.ok) {
    if (saved.reason === "duplicate") {
      return measurementsError(context, "A measurement at that date and time already exists.", measurementId);
    }
    return measurementsError(context, "Could not save the measurement", measurementId);
  }

  return context.redirect("/measurements");
};
