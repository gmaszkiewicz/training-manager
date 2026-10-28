import type { APIRoute } from "astro";
import { z } from "zod";

import { CHART_SELECTION_LIMIT, chartPeriods, parseChartAnchor, type ChartPeriod } from "@/lib/measurement-chart";
import { readProfileRole } from "@/lib/services/ensure-profile";
import { readMeasurementRange, readMeasurementsByIds } from "@/lib/services/measurements";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const periodQuery = z.object({
  period: z.enum(chartPeriods),
  anchor: z.string().refine((value) => parseChartAnchor(value) !== null),
});

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

type ChartQuery = { mode: "period"; period: ChartPeriod; anchor: string } | { mode: "ids"; ids: string[] };

function readChartQuery(url: URL): ChartQuery | null {
  const ids = url.searchParams.get("ids");
  const period = url.searchParams.get("period");
  const anchor = url.searchParams.get("anchor");
  if (ids !== null) {
    if (period !== null || anchor !== null) {
      return null;
    }
    const parsed = idsQuery.safeParse(ids);
    return parsed.success ? { mode: "ids", ids: parsed.data } : null;
  }
  const parsed = periodQuery.safeParse({ period, anchor });
  return parsed.success ? { mode: "period", period: parsed.data.period, anchor: parsed.data.anchor } : null;
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
    return json({ error: "Invalid period, anchor or ids" }, 400);
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
    now: new Date(),
  });
  if (!read.ok) {
    return json({ error: "Could not load measurements" }, 500);
  }
  return json({ entries: read.entries, window: read.window }, 200);
};
