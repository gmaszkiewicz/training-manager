import { monthName } from "@/lib/journal-calendar";
import {
  bucketKey,
  calendarWeek,
  chartTickLabel,
  measuredOnMs,
  type ChartPeriod,
  type ChartWindow,
  YEARS_SPAN_LIMIT,
} from "@/lib/measurement-chart";
import { circumferenceFields } from "@/lib/measurement-input";
import type { MeasurementField, MeasurementWithDeltas } from "@/types";

export type TopChangeDirection = "up" | "down";

/** An entry as the top changes read it: when it was measured and the list's deltas against its previous entry. */
type DeltaEntry = Pick<MeasurementWithDeltas, "measured_on" | "deltas">;

/** A field's gains (or drops) in a sub-period, added up: `count` list deltas summing to `difference`. */
export interface SubPeriodValue {
  difference: number;
  count: number;
}

/** One radar axis: a sub-period of the window with each requested field's summed gains (or drops). */
export interface SubPeriodRow {
  /** The sub-period's first day (`YYYY-MM-DD`), month (`YYYY-MM`) or year (`YYYY`). */
  key: string;
  /** The short axis name: `Mon 3`, `3–9 Nov`, `Mar` or `2026`. */
  axisLabel: string;
  /** The full name for the tooltip and legend: `Mon 3 Nov`, `3–9 Nov`, `March` or `2026`. */
  label: string;
  /** Every requested field, 0 and `count` 0 where nothing matched. */
  values: Partial<Record<MeasurementField, SubPeriodValue>>;
}

export { circumferenceFields };

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
// A window is at most a `YEARS_SPAN_LIMIT`-year span of days; this only stops a malformed window from looping on.
const MAX_WINDOW_DAYS = (YEARS_SPAN_LIMIT + 1) * 366;

/** Drops the float drift of adding tenths, e.g. 0.1 + 0.2. */
function roundSum(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The sub-period a day falls in: the day in a week, its calendar week (Mon–Sun) clipped to its month in a month, its
 * month in a year, its year in a span of years.
 */
function subPeriodKey(day: string, period: ChartPeriod): string {
  if (period === "week") {
    return day;
  }
  if (period === "month") {
    const monday = calendarWeek(day).first;
    const monthStart = `${day.slice(0, 7)}-01`;
    return monday < monthStart ? monthStart : monday;
  }
  if (period === "year") {
    return day.slice(0, 7);
  }
  return day.slice(0, 4);
}

function dayNumber(day: string): string {
  return String(Number(day.slice(8, 10)));
}

/** The short axis name and the full name of a sub-period running from `first` to `last` (inclusive days). */
function subPeriodLabels(
  key: string,
  first: string,
  last: string,
  period: ChartPeriod,
): Pick<SubPeriodRow, "axisLabel" | "label"> {
  if (period === "years") {
    return { axisLabel: key, label: key };
  }
  if (period === "year") {
    return {
      axisLabel: chartTickLabel(measuredOnMs(`${key}-01`), "month"),
      label: monthName(key),
    };
  }
  const ms = measuredOnMs(first);
  if (period === "week") {
    const weekday = SHORT_WEEKDAYS[new Date(ms).getUTCDay()];
    return { axisLabel: `${weekday} ${dayNumber(first)}`, label: `${weekday} ${chartTickLabel(ms, "day")}` };
  }
  const lastLabel = chartTickLabel(measuredOnMs(last), "day");
  const label = first === last ? lastLabel : `${dayNumber(first)}–${lastLabel}`;
  return { axisLabel: label, label };
}

/** Every sub-period of the window, oldest first, with its first and last day. */
function windowSubPeriods(period: ChartPeriod, window: ChartWindow): { key: string; first: string; last: string }[] {
  const start = measuredOnMs(window.start);
  const end = measuredOnMs(window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return [];
  }
  const subPeriods: { key: string; first: string; last: string }[] = [];
  const firstDay = Math.floor(start / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY;
  for (let index = 0, ms = firstDay; ms < end && index < MAX_WINDOW_DAYS; index += 1, ms += MILLISECONDS_PER_DAY) {
    const day = bucketKey(ms, "week");
    const key = subPeriodKey(day, period);
    const current = subPeriods.at(-1);
    if (current?.key === key) {
      current.last = day;
    } else {
      subPeriods.push({ key, first: day, last: day });
    }
  }
  return subPeriods;
}

/**
 * One row per sub-period of the window (a week's 7 days, a month's calendar weeks clipped to the month, a year's 12
 * months, each year of a span), in time order, with each requested field's summed `direction` deltas. Gains and drops
 * are summed separately, so +1 then −1 counts 1 each way. Entries outside the window, with no deltas or with no change
 * are skipped.
 */
export function subPeriodTotals(
  entries: readonly DeltaEntry[],
  fields: readonly MeasurementField[],
  period: ChartPeriod,
  window: ChartWindow,
  direction: TopChangeDirection,
): SubPeriodRow[] {
  const requested = [...new Set(fields)];
  const sums = new Map<string, Partial<Record<MeasurementField, SubPeriodValue>>>();
  for (const entry of entries) {
    if (entry.deltas === null || !Number.isFinite(measuredOnMs(entry.measured_on))) {
      continue;
    }
    const key = subPeriodKey(entry.measured_on.replace(" ", "T").slice(0, 10), period);
    const values = sums.get(key) ?? {};
    for (const field of requested) {
      const delta = entry.deltas[field];
      if (delta.direction === direction) {
        const sum = values[field] ?? { difference: 0, count: 0 };
        values[field] = { difference: sum.difference + delta.difference, count: sum.count + 1 };
      }
    }
    sums.set(key, values);
  }
  return windowSubPeriods(period, window).map(({ key, first, last }) => {
    const sum = sums.get(key);
    const values: Partial<Record<MeasurementField, SubPeriodValue>> = {};
    for (const field of requested) {
      const value = sum?.[field];
      values[field] =
        value === undefined ? { difference: 0, count: 0 } : { ...value, difference: roundSum(value.difference) };
    }
    return { key, ...subPeriodLabels(key, first, last, period), values };
  });
}

/** The sub-period with the field's largest sum; a tie goes to the later one; `null` when the field never changed. */
export function topSubPeriod(rows: readonly SubPeriodRow[], field: MeasurementField): SubPeriodRow | null {
  let top: SubPeriodRow | null = null;
  let topDifference = 0;
  for (const row of rows) {
    const value = row.values[field];
    if (value === undefined || value.count === 0) {
      continue;
    }
    if (top === null || value.difference >= topDifference) {
      top = row;
      topDifference = value.difference;
    }
  }
  return top;
}

/** The largest value of every series across the lists, so a gain and a loss chart share one radar scale; 0 when none. */
export function topChangeScale(...lists: (readonly SubPeriodRow[])[]): number {
  let scale = 0;
  for (const rows of lists) {
    for (const row of rows) {
      for (const value of Object.values(row.values)) {
        if (value.difference > scale) {
          scale = value.difference;
        }
      }
    }
  }
  return scale;
}
