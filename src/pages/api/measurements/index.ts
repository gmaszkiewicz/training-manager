import type { APIRoute } from "astro";
import { z } from "zod";

import { createMeasurementInputSchema } from "@/lib/measurement-input";
import type { PageSize } from "@/lib/measurement-page";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { addMeasurement, readMeasurementPage } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const PAGE = /^[1-9]\d{0,8}$/;

function measurementsError(context: Parameters<APIRoute>[0], message: string) {
  return context.redirect(`/measurements?error=${encodeURIComponent(message)}`);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function pageSizeFromQuery(value: "5" | "10" | "15"): PageSize {
  if (value === "5") {
    return 5;
  }
  if (value === "15") {
    return 15;
  }
  return 10;
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

  const url = new URL(context.request.url);
  const month = z.string().regex(MONTH).safeParse(url.searchParams.get("month"));
  const size = z.enum(["5", "10", "15"]).safeParse(url.searchParams.get("size"));
  if (!month.success || !size.success) {
    return json({ error: "Invalid month or size" }, 400);
  }
  const page = z.string().regex(PAGE).safeParse(url.searchParams.get("page"));
  if (!page.success) {
    return json({ error: "Invalid page" }, 400);
  }

  const role = await readProfileRole(supabase, user.id);
  if (role === null) {
    return json({ error: "Could not open your journal" }, 403);
  }

  let traineeId = user.id;
  if (role === "trainer") {
    const trainee = url.searchParams.get("trainee");
    if (trainee === null || !UUID_PATTERN.test(trainee)) {
      return json({ error: "Invalid trainee" }, 400);
    }
    traineeId = trainee;
  }

  const focus = url.searchParams.get("focus");
  const focusId = focus !== null && UUID_PATTERN.test(focus) ? focus : null;
  const read = await readMeasurementPage(supabase, traineeId, {
    month: month.data,
    page: Number(page.data),
    pageSize: pageSizeFromQuery(size.data),
    focusId,
    now: new Date(),
  });
  if (!read.ok) {
    return json({ error: "Could not load measurements" }, 500);
  }

  return json(
    {
      dates: read.dates,
      month: read.month,
      page: read.page,
      pageSize: read.pageSize,
      pageCount: read.pageCount,
      entries: read.entries,
    },
    200,
  );
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
    if (saved.reason === "duplicate") {
      return measurementsError(context, "A measurement at that date and time already exists.");
    }
    return measurementsError(context, "Could not save the measurement");
  }

  return context.redirect("/measurements");
};
