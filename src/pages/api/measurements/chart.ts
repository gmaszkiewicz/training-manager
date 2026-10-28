import type { APIRoute } from "astro";
import { z } from "zod";

import {
  CHART_SELECTION_LIMIT,
  isYearsRange,
  parseChartAnchor,
  type ChartPeriod,
  type YearsRange,
} from "@/lib/measurement-chart";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { readMeasurementDays, readMeasurementRange, readMeasurementsByIds } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const periodQuery = z.object({
  period: z.enum(["week", "month", "year"]),
  anchor: z.string().refine((value) => parseChartAnchor(value) !== null),
});

const yearText = z
  .string()
  .regex(/^\d{4}$/)
  .transform(Number);

const yearsQuery = z.object({ from: yearText, to: yearText }).refine((range) => isYearsRange(range.from, range.to));

const idsQuery = z
  .string()
  .transform((value) => value.split(","))
  .pipe(z.array(z.string().regex(UUID_PATTERN)).min(1).max(CHART_SELECTION_LIMIT));

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

type ChartQuery =
  | { mode: "period"; period: ChartPeriod; anchor: string; years: YearsRange | null }
  | { mode: "ids"; ids: string[] }
  | { mode: "days" };

function readChartQuery(url: URL): ChartQuery | null {
  const days = url.searchParams.get("days");
  const ids = url.searchParams.get("ids");
  const period = url.searchParams.get("period");
  const anchor = url.searchParams.get("anchor");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (days !== null) {
    if (days !== "1" || ids !== null || period !== null || anchor !== null || from !== null || to !== null) {
      return null;
    }
    return { mode: "days" };
  }
  if (ids !== null) {
    if (period !== null || anchor !== null || from !== null || to !== null) {
      return null;
    }
    const parsed = idsQuery.safeParse(ids);
    return parsed.success ? { mode: "ids", ids: parsed.data } : null;
  }
  if (period === "years") {
    if (anchor !== null) {
      return null;
    }
    const parsed = yearsQuery.safeParse({ from, to });
    if (!parsed.success) {
      return null;
    }
    const years = { from: parsed.data.from, to: parsed.data.to };
    return { mode: "period", period: "years", anchor: `${String(years.from)}-01-01`, years };
  }
  if (from !== null || to !== null) {
    return null;
  }
  const parsed = periodQuery.safeParse({ period, anchor });
  return parsed.success
    ? { mode: "period", period: parsed.data.period, anchor: parsed.data.anchor, years: null }
    : null;
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
  const query = readChartQuery(url);
  if (query === null) {
    return json({ error: "Invalid period, anchor, years, ids or days" }, 400);
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

  if (query.mode === "days") {
    const read = await readMeasurementDays(supabase, traineeId);
    if (!read.ok) {
      return json({ error: "Could not load measurements" }, 500);
    }
    return json({ days: read.days }, 200);
  }

  if (query.mode === "ids") {
    const read = await readMeasurementsByIds(supabase, traineeId, query.ids);
    if (!read.ok) {
      return json({ error: "Could not load measurements" }, 500);
    }
    return json({ entries: read.entries, window: null }, 200);
  }

  const read = await readMeasurementRange(supabase, traineeId, {
    period: query.period,
    anchor: query.anchor,
    years: query.years,
  });
  if (!read.ok) {
    return json({ error: "Could not load measurements" }, 500);
  }
  return json({ entries: read.entries, window: read.window }, 200);
};
