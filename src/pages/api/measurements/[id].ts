import type { APIRoute } from "astro";

import { createMeasurementInputSchema, DUPLICATE_MEASUREMENT_MESSAGE } from "@/lib/measurement-input";
import { updateMeasurement } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function measurementsError(context: Parameters<APIRoute>[0], message: string, editId?: string) {
  const error = encodeURIComponent(message);
  const query = editId === undefined ? `error=${error}` : `edit=${encodeURIComponent(editId)}&error=${error}`;
  return context.redirect(`/measurements?${query}`);
}

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function saveResponse(context: Parameters<APIRoute>[0], message: string, status: number, editId?: string) {
  if (wantsJson(context.request)) {
    return json({ error: message }, status);
  }
  return measurementsError(context, message, editId);
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const measurementId = context.params.id ?? "";

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return saveResponse(context, "Supabase is not configured", 500, measurementId);
  }

  if (!UUID_PATTERN.test(measurementId)) {
    return saveResponse(context, "Could not save the measurement", 400);
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
    return saveResponse(context, message, 400, measurementId);
  }

  const saved = await updateMeasurement(supabase, user.id, measurementId, parsed.data);
  if (!saved.ok) {
    if (saved.reason === "duplicate") {
      return saveResponse(context, DUPLICATE_MEASUREMENT_MESSAGE, 409, measurementId);
    }
    return saveResponse(context, "Could not save the measurement", 500, measurementId);
  }

  if (wantsJson(context.request)) {
    return json({ ok: true }, 200);
  }
  return context.redirect("/measurements");
};
