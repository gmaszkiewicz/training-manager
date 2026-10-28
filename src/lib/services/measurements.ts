import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import { chartWindow, type ChartPeriod, type ChartWindow } from "@/lib/measurement-chart";
import {
  deltasForVisiblePage,
  measurementMonth,
  measurementMonths,
  monthWindow,
  pageContaining,
  resolveMeasurementPage,
  utcToday,
  type PageSize,
} from "@/lib/measurement-page";
import type { MeasurementEntry, MeasurementField, MeasurementWithDeltas } from "@/types";

interface MeasurementInput {
  measured_on: string;
  weight_kg: number;
  chest_cm: number;
  waist_cm: number;
  arms_cm: number;
  thigh_cm: number;
  calf_cm: number;
  hips_cm: number;
  navel_cm: number;
  note: string | null;
}

const measurementColumns =
  "id, measured_on, created_at, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm, note";

const previousMeasurementColumns =
  "id, measured_on, weight_kg, chest_cm, waist_cm, arms_cm, thigh_cm, calf_cm, hips_cm, navel_cm";

type PreviousMeasurementEntry = Pick<MeasurementEntry, "id" | "measured_on" | MeasurementField>;

const MEASUREMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function quoteFilterValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function strictlyBeforeFilter(measuredOn: string, id: string): string {
  const measured = quoteFilterValue(measuredOn);
  const rowId = quoteFilterValue(id);
  return `measured_on.lt.${measured},and(measured_on.eq.${measured},id.lt.${rowId})`;
}

function strictlyAfterFilter(measuredOn: string, id: string): string {
  const measured = quoteFilterValue(measuredOn);
  const rowId = quoteFilterValue(id);
  return `measured_on.gt.${measured},and(measured_on.eq.${measured},id.gt.${rowId})`;
}

function oldestRow(rows: readonly MeasurementEntry[]): MeasurementEntry | null {
  let oldest: MeasurementEntry | null = null;
  for (const row of rows) {
    if (
      oldest === null ||
      row.measured_on < oldest.measured_on ||
      (row.measured_on === oldest.measured_on && row.id < oldest.id)
    ) {
      oldest = row;
    }
  }
  return oldest;
}

export async function getMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measurementId: string,
): Promise<{ ok: true; entry: MeasurementEntry | null } | { ok: false }> {
  if (!MEASUREMENT_ID.test(measurementId)) {
    return { ok: true, entry: null };
  }

  try {
    const { data, error } = await supabase
      .from("measurements")
      .select(measurementColumns)
      .eq("trainee_id", traineeId)
      .eq("id", measurementId)
      .maybeSingle();

    if (error) {
      return { ok: false };
    }

    return { ok: true, entry: data };
  } catch {
    return { ok: false };
  }
}

export async function readPreviousMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measuredOn: string,
): Promise<{ ok: true; entry: PreviousMeasurementEntry | null } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .select(previousMeasurementColumns)
      .eq("trainee_id", traineeId)
      .lt("measured_on", measuredOn)
      .order("measured_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    if (error) {
      return { ok: false };
    }

    const row = data[0] ?? null;
    return { ok: true, entry: row };
  } catch {
    return { ok: false };
  }
}

export async function readMinuteTaken(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measuredOn: string,
): Promise<{ ok: true; taken: boolean } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .select("id")
      .eq("trainee_id", traineeId)
      .eq("measured_on", measuredOn)
      .maybeSingle();

    if (error) {
      return { ok: false };
    }

    return { ok: true, taken: data !== null };
  } catch {
    return { ok: false };
  }
}

async function countNewerInMonth(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  start: string,
  end: string,
  measuredOn: string,
  id: string,
): Promise<{ ok: true; count: number } | { ok: false }> {
  const { count, error } = await supabase
    .from("measurements")
    .select("id", { count: "exact", head: true })
    .eq("trainee_id", traineeId)
    .gte("measured_on", start)
    .lt("measured_on", end)
    .or(strictlyAfterFilter(measuredOn, id));

  if (error || count === null) {
    return { ok: false };
  }

  return { ok: true, count };
}

async function selectPage(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  start: string,
  end: string,
  page: number,
  pageSize: PageSize,
): Promise<{ ok: true; rows: MeasurementEntry[]; count: number } | { ok: false }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("measurements")
    .select(measurementColumns, { count: "exact" })
    .eq("trainee_id", traineeId)
    .gte("measured_on", start)
    .lt("measured_on", end)
    .order("measured_on", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error || count === null) {
    return { ok: false };
  }

  return { ok: true, rows: data, count };
}

async function selectOlderRow(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  oldest: MeasurementEntry,
): Promise<{ ok: true; row: MeasurementEntry | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("measurements")
    .select(measurementColumns)
    .eq("trainee_id", traineeId)
    .or(strictlyBeforeFilter(oldest.measured_on, oldest.id))
    .order("measured_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false };
  }

  return { ok: true, row: data[0] ?? null };
}

export async function readMeasurementPage(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  input: {
    month: string;
    page: number;
    pageSize: PageSize;
    focusId: string | null;
    now: Date;
  },
): Promise<
  | {
      ok: true;
      dates: string[];
      month: string;
      page: number;
      pageSize: PageSize;
      pageCount: number;
      entries: MeasurementWithDeltas[];
    }
  | { ok: false }
> {
  try {
    const { data, error } = await supabase.rpc("measurement_months", { p_trainee_id: traineeId });
    if (error) {
      return { ok: false };
    }

    const months = data.map((row) => row.measured_month);
    const today = utcToday(input.now);
    const todayMonth = measurementMonth(today);
    let dates = measurementMonths(months, today);
    let month = dates.includes(input.month) ? input.month : todayMonth;
    let page = Number.isInteger(input.page) && input.page >= 1 ? input.page : 1;

    if (input.focusId !== null) {
      const focused = await getMeasurement(supabase, traineeId, input.focusId);
      if (!focused.ok) {
        return { ok: false };
      }
      if (focused.entry) {
        month = measurementMonth(focused.entry.measured_on);
        if (!dates.includes(month)) {
          dates = measurementMonths([...months, focused.entry.measured_on], today);
        }
        const focusedWindow = monthWindow(month);
        const newer = await countNewerInMonth(
          supabase,
          traineeId,
          focusedWindow.start,
          focusedWindow.end,
          focused.entry.measured_on,
          focused.entry.id,
        );
        if (!newer.ok) {
          return { ok: false };
        }
        page = pageContaining(newer.count, input.pageSize);
      }
    }

    const window = monthWindow(month);
    let selected = await selectPage(supabase, traineeId, window.start, window.end, page, input.pageSize);
    if (!selected.ok) {
      return { ok: false };
    }
    const resolved = resolveMeasurementPage(page, selected.count, input.pageSize);
    if (resolved.page !== page) {
      selected = await selectPage(supabase, traineeId, window.start, window.end, resolved.page, input.pageSize);
      if (!selected.ok) {
        return { ok: false };
      }
    }

    const oldest = oldestRow(selected.rows);
    let older: MeasurementEntry | null = null;
    if (oldest) {
      const olderResult = await selectOlderRow(supabase, traineeId, oldest);
      if (!olderResult.ok) {
        return { ok: false };
      }
      older = olderResult.row;
    }

    return {
      ok: true,
      dates,
      month,
      page: resolved.page,
      pageSize: input.pageSize,
      pageCount: resolved.pageCount,
      entries: deltasForVisiblePage(selected.rows, older),
    };
  } catch {
    return { ok: false };
  }
}

const RANGE_PAGE_ROWS = 1000;

async function selectRangeRows(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  window: ChartWindow,
): Promise<{ ok: true; rows: MeasurementEntry[] } | { ok: false }> {
  const rows: MeasurementEntry[] = [];
  for (let from = 0; ; from += RANGE_PAGE_ROWS) {
    const { data, error } = await supabase
      .from("measurements")
      .select(measurementColumns)
      .eq("trainee_id", traineeId)
      .gte("measured_on", window.start)
      .lt("measured_on", window.end)
      .order("measured_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + RANGE_PAGE_ROWS - 1);

    if (error) {
      return { ok: false };
    }

    rows.push(...data);
    if (data.length < RANGE_PAGE_ROWS) {
      return { ok: true, rows };
    }
  }
}

function oldestFirst(entries: MeasurementWithDeltas[]): MeasurementWithDeltas[] {
  return [...entries].sort((left, right) => {
    if (left.measured_on !== right.measured_on) {
      return left.measured_on < right.measured_on ? -1 : 1;
    }
    if (left.id === right.id) {
      return 0;
    }
    return left.id < right.id ? -1 : 1;
  });
}

export async function readMeasurementRange(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  input: { period: ChartPeriod; anchor: string; now: Date },
): Promise<{ ok: true; window: ChartWindow; entries: MeasurementWithDeltas[] } | { ok: false }> {
  try {
    let earliestMonth: string | null = null;
    if (input.period === "years") {
      const { data, error } = await supabase.rpc("measurement_months", { p_trainee_id: traineeId });
      if (error) {
        return { ok: false };
      }
      for (const row of data) {
        const month = measurementMonth(row.measured_month);
        if (earliestMonth === null || month < earliestMonth) {
          earliestMonth = month;
        }
      }
    }

    const window = chartWindow(input.period, input.anchor, earliestMonth, utcToday(input.now));
    const selected = await selectRangeRows(supabase, traineeId, window);
    if (!selected.ok) {
      return { ok: false };
    }

    const oldest = selected.rows[0] as MeasurementEntry | undefined;
    let older: MeasurementEntry | null = null;
    if (oldest) {
      const olderResult = await selectOlderRow(supabase, traineeId, oldest);
      if (!olderResult.ok) {
        return { ok: false };
      }
      older = olderResult.row;
    }

    return { ok: true, window, entries: oldestFirst(deltasForVisiblePage(selected.rows, older)) };
  } catch {
    return { ok: false };
  }
}

export async function readMeasurementsByIds(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  ids: readonly string[],
): Promise<{ ok: true; entries: MeasurementWithDeltas[] } | { ok: false }> {
  const validIds = [...new Set(ids.filter((id) => MEASUREMENT_ID.test(id)))];
  if (validIds.length === 0) {
    return { ok: true, entries: [] };
  }

  try {
    const { data, error } = await supabase
      .from("measurements")
      .select(measurementColumns)
      .eq("trainee_id", traineeId)
      .in("id", validIds);

    if (error) {
      return { ok: false };
    }

    const compared = await Promise.all(
      data.map(async (row) => {
        const older = await selectOlderRow(supabase, traineeId, row);
        if (!older.ok) {
          return null;
        }
        return deltasForVisiblePage([row], older.row)[0] ?? null;
      }),
    );

    const entries: MeasurementWithDeltas[] = [];
    for (const entry of compared) {
      if (entry === null) {
        return { ok: false };
      }
      entries.push(entry);
    }

    return { ok: true, entries: oldestFirst(entries) };
  } catch {
    return { ok: false };
  }
}

type MeasurementSaveResult = { ok: true } | { ok: false; reason?: "duplicate" };

function failedSave(error: { code: string }): MeasurementSaveResult {
  if (error.code === "23505") {
    return { ok: false, reason: "duplicate" };
  }
  return { ok: false };
}

export async function addMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  input: MeasurementInput,
): Promise<MeasurementSaveResult> {
  try {
    const { error } = await supabase.from("measurements").insert({
      trainee_id: traineeId,
      measured_on: input.measured_on,
      weight_kg: input.weight_kg,
      chest_cm: input.chest_cm,
      waist_cm: input.waist_cm,
      arms_cm: input.arms_cm,
      thigh_cm: input.thigh_cm,
      calf_cm: input.calf_cm,
      hips_cm: input.hips_cm,
      navel_cm: input.navel_cm,
      note: input.note,
    });

    if (error) {
      return failedSave(error);
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function updateMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measurementId: string,
  input: MeasurementInput,
): Promise<MeasurementSaveResult> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .update({
        measured_on: input.measured_on,
        weight_kg: input.weight_kg,
        chest_cm: input.chest_cm,
        waist_cm: input.waist_cm,
        arms_cm: input.arms_cm,
        thigh_cm: input.thigh_cm,
        calf_cm: input.calf_cm,
        hips_cm: input.hips_cm,
        navel_cm: input.navel_cm,
        note: input.note,
      })
      .eq("id", measurementId)
      .eq("trainee_id", traineeId)
      .select("id");

    if (error) {
      return failedSave(error);
    }

    if (data.length === 0) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteMeasurement(
  supabase: SupabaseClient<Database>,
  traineeId: string,
  measurementId: string,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const { data, error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", measurementId)
      .eq("trainee_id", traineeId)
      .select("id");

    if (error || data.length === 0) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
