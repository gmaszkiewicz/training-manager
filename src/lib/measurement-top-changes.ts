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
  /** The short axis name: `Mon 3`, `3–9 Nov`, a month day's `12` (`""` when unlabelled), `Mar` or `2026`. */
  axisLabel: string;
  /** The full name for the tooltip and legend: `Mon 3 Nov`, `3–9 Nov`, `Thu 12 Nov`, `March` or `2026`. */
  label: string;
  /** Every requested field, 0 and `count` 0 where nothing matched. */
  values: Partial<Record<MeasurementField, SubPeriodValue>>;
}

/** How a Month window's axes split: one per calendar week (clipped to the month) or one per day. */
export type MonthAxis = "weeks" | "days";

export interface SubPeriodTotalsOptions {
  /** Month only; Week, Year and Years ignore it. Defaults to `"weeks"`. */
  monthAxis?: MonthAxis;
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
 * The sub-period a day falls in: the day in a week, its calendar week (Mon–Sun) clipped to its month in a month (or the
 * day itself with `"days"` month axes), its month in a year, its year in a span of years.
 */
function subPeriodKey(day: string, period: ChartPeriod, monthAxis: MonthAxis): string {
  if (period === "week" || (period === "month" && monthAxis === "days")) {
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
  monthAxis: MonthAxis,
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
  if (period === "week" || monthAxis === "days") {
    const weekday = SHORT_WEEKDAYS[new Date(ms).getUTCDay()];
    // A month's day axes carry the day number alone (`12`), so a month of bars stays uncrowded; `labelMonthDays` then
    // blanks the ones not named.
    const axisLabel = period === "week" ? `${weekday} ${dayNumber(first)}` : dayNumber(first);
    return { axisLabel, label: `${weekday} ${chartTickLabel(ms, "day")}` };
  }
  const lastLabel = chartTickLabel(measuredOnMs(last), "day");
  const label = first === last ? lastLabel : `${dayNumber(first)}–${lastLabel}`;
  return { axisLabel: label, label };
}

/** Every sub-period of the window, oldest first, with its first and last day. */
function windowSubPeriods(
  period: ChartPeriod,
  window: ChartWindow,
  monthAxis: MonthAxis,
): { key: string; first: string; last: string }[] {
  const start = measuredOnMs(window.start);
  const end = measuredOnMs(window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return [];
  }
  const subPeriods: { key: string; first: string; last: string }[] = [];
  const firstDay = Math.floor(start / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY;
  for (let index = 0, ms = firstDay; ms < end && index < MAX_WINDOW_DAYS; index += 1, ms += MILLISECONDS_PER_DAY) {
    const day = bucketKey(ms, "week");
    const key = subPeriodKey(day, period, monthAxis);
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
 * are skipped. With `monthAxis: "days"` a month has one row per day, axis-labelled by `labelMonthDays`.
 */
export function subPeriodTotals(
  entries: readonly DeltaEntry[],
  fields: readonly MeasurementField[],
  period: ChartPeriod,
  window: ChartWindow,
  direction: TopChangeDirection,
  options: SubPeriodTotalsOptions = {},
): SubPeriodRow[] {
  const monthAxis = options.monthAxis ?? "weeks";
  const requested = [...new Set(fields)];
  const sums = new Map<string, Partial<Record<MeasurementField, SubPeriodValue>>>();
  for (const entry of entries) {
    if (entry.deltas === null || !Number.isFinite(measuredOnMs(entry.measured_on))) {
      continue;
    }
    const key = subPeriodKey(entry.measured_on.replace(" ", "T").slice(0, 10), period, monthAxis);
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
  const rows = windowSubPeriods(period, window, monthAxis).map(({ key, first, last }) => {
    const sum = sums.get(key);
    const values: Partial<Record<MeasurementField, SubPeriodValue>> = {};
    for (const field of requested) {
      const value = sum?.[field];
      values[field] =
        value === undefined ? { difference: 0, count: 0 } : { ...value, difference: roundSum(value.difference) };
    }
    return { key, ...subPeriodLabels(key, first, last, period, monthAxis), values };
  });
  return period === "month" && monthAxis === "days" ? labelMonthDays(rows) : rows;
}

/** At least this many day axes of a month carry a label, so the radar stays readable with little progress. */
const MIN_LABELLED_DAYS = 6;

/**
 * The month's day rows with only the chart's labelled days keeping their `12` name as `axisLabel` (`""` for the
 * rest). A day is labelled when any of the rows' fields changed on it. While fewer than 6 are, evenly spread anchor
 * days are added — the first, the last, then the inner ones (1, 31, 7, 13, 19, 25 for 31 days) — skipping an anchor
 * next to a progress day so labels do not crowd. Apply it per chart: gains and losses separately.
 */
export function labelMonthDays(rows: readonly SubPeriodRow[]): SubPeriodRow[] {
  const labelled = new Set<number>();
  rows.forEach((row, index) => {
    if (Object.values(row.values).some((value) => value.count > 0)) {
      labelled.add(index);
    }
  });
  const progress = new Set(labelled);
  const steps = Math.min(MIN_LABELLED_DAYS, rows.length) - 1;
  const spread = Array.from({ length: steps + 1 }, (_, step) =>
    steps === 0 ? 0 : Math.round((step * (rows.length - 1)) / steps),
  );
  const anchors = [...spread.slice(0, 1), ...spread.slice(-1), ...spread.slice(1, -1)];
  // Anchors sit at least 4 days apart, so each progress day rules out at most one of them and 6 are always reached.
  for (const index of anchors) {
    if (labelled.size >= MIN_LABELLED_DAYS) {
      break;
    }
    if (!progress.has(index - 1) && !progress.has(index + 1)) {
      labelled.add(index);
    }
  }
  return rows.map((row, index) => ({ ...row, axisLabel: labelled.has(index) ? row.axisLabel : "" }));
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

/** About this many steps up the value axis, rounded to a 1, 2, 2.5 or 5 step. */
const VALUE_AXIS_STEPS = 4;

/** The value axis' ticks, 0 to the first round step at or above the pair's largest value, so a pair shares its axis. */
export function valueAxisTicks(scale: number): number[] {
  if (!Number.isFinite(scale) || scale <= 0) {
    return [0, 1];
  }
  const rough = scale / VALUE_AXIS_STEPS;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((multiple) => multiple * power >= rough) ?? 10) * power;
  const count = Math.ceil(scale / step - 1e-9);
  return Array.from({ length: count + 1 }, (_, index) => Number((index * step).toFixed(2)));
}

/** Bars take this share of a sub-period's slot; the rest is the gap between groups. */
export const BAR_GROUP_FILL = 0.8;
/** The gap between two bars of one group, in pixels. */
export const BAR_GAP = 1;
const MIN_BAR_SIZE = 4;
/** About the width of one `text-xs` character, and the room kept around an axis label, in pixels. */
const AXIS_CHARACTER_WIDTH = 7;
const AXIS_LABEL_PADDING = 8;

export interface TopChangeBarLayout {
  /** Every bar's width, the same in every chart and period. */
  barSize: number;
  /** The plot's width: the card's when the sub-periods fit, wider (scrolling) when they do not. */
  contentWidth: number;
}

/**
 * The bar charts' layout for a plot `plotWidth` pixels wide. Every bar is as wide as a circumference bar in a Last 5
 * years chart with all 7 circumferences, so a month of days keeps the bars a span of years has. Each sub-period's slot
 * fits its bars and its axis label, and the plot grows past the card when the slots need more room.
 */
export function topChangeBarLayout(
  plotWidth: number,
  rows: readonly Pick<SubPeriodRow, "axisLabel">[],
  fieldCount: number,
): TopChangeBarLayout {
  const width = Math.max(0, plotWidth);
  const allFields = circumferenceFields.length;
  const yearsSlot = (width / YEARS_SPAN_LIMIT) * BAR_GROUP_FILL;
  const barSize = Math.max(MIN_BAR_SIZE, Math.floor((yearsSlot - (allFields - 1) * BAR_GAP) / allFields));
  const bars = Math.max(1, fieldCount);
  const groupWidth = bars * barSize + (bars - 1) * BAR_GAP;
  const slotWidth = Math.max(
    groupWidth / BAR_GROUP_FILL,
    ...rows.map((row) => row.axisLabel.length * AXIS_CHARACTER_WIDTH + AXIS_LABEL_PADDING),
  );
  return { barSize, contentWidth: Math.max(width, Math.ceil(rows.length * slotWidth)) };
}

/**
 * Only the sub-periods in which any of the rows' fields changed, so a bar chart skips the empty days and months. A
 * span of years keeps every year, so Last 5 years always reads as the full span.
 */
export function changedSubPeriods(rows: readonly SubPeriodRow[], period: ChartPeriod): SubPeriodRow[] {
  if (period === "years") {
    return [...rows];
  }
  return rows.filter((row) => Object.values(row.values).some((value) => value.count > 0));
}
