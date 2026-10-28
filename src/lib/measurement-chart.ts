import { monthLabel, weekContaining } from "@/lib/journal-calendar";
import { measurementFields, measurementLimits } from "@/lib/measurement-input";
import { measurementMonth, monthWindow } from "@/lib/measurement-page";
import type { MeasurementField } from "@/types";

export const chartPeriods = ["week", "month", "year", "years"] as const;

export type ChartPeriod = (typeof chartPeriods)[number];

export const defaultChartPeriod: ChartPeriod = "month";

export const CHART_SELECTION_LIMIT = 15;

/** Sent on `window` by the list once its month settles. Detail: `MeasurementMonthDetail`. */
export const MEASUREMENT_MONTH_EVENT = "tm:measurements:month";

export interface MeasurementMonthDetail {
  month: string;
  /** `false` only when the user picked the month; the load and the post-hydration restore send `true`. */
  restored: boolean;
}

export interface ChartWindow {
  start: string;
  end: string;
}

/** Years mode: an inclusive span of calendar years, at most `YEARS_SPAN_LIMIT` long. */
export interface YearsRange {
  from: number;
  to: number;
}

export type ChartTickStyle = "day" | "day-year" | "month" | "year";

export const YEARS_SPAN_LIMIT = 5;

export interface ChartYAxis {
  domain: [number, number];
  ticks: number[];
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const AXIS_STEP = 5;
const ONE_TICK_PER_ENTRY_LIMIT = 8;
// A month axis labels each entry only when entry days sit this far apart; closer labels would collide.
const MONTH_ENTRY_TICK_MIN_DAYS = 4;
const CHART_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MEASURED_ON = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function parseChartPeriod(value: unknown): ChartPeriod {
  if (value === "week" || value === "month" || value === "year" || value === "years") {
    return value;
  }
  return defaultChartPeriod;
}

export function parseChartAnchor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = CHART_DAY.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return value;
}

function formatDay(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const paddedMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const paddedDay = String(date.getUTCDate()).padStart(2, "0");
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${paddedMonth}-${paddedDay}`;
}

function dayParts(day: string): { year: number; month: number; day: number } {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)), day: Number(day.slice(8, 10)) };
}

function addDays(day: string, delta: number): string {
  const parts = dayParts(day);
  return formatDay(parts.year, parts.month, parts.day + delta);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsClamped(day: string, delta: number): string {
  const parts = dayParts(day);
  const target = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  return formatDay(year, month, Math.min(parts.day, daysInMonth(year, month)));
}

function yearWindow(year: number): ChartWindow {
  return {
    start: `${String(year).padStart(4, "0")}-01-01T00:00:00`,
    end: `${String(year + 1).padStart(4, "0")}-01-01T00:00:00`,
  };
}

export function chartWindow(period: ChartPeriod, anchorDay: string, years: YearsRange | null): ChartWindow {
  if (period === "week") {
    const days = weekContaining(anchorDay);
    return { start: `${days[0]}T00:00:00`, end: `${addDays(days[6], 1)}T00:00:00` };
  }
  if (period === "month") {
    return monthWindow(measurementMonth(anchorDay));
  }
  const anchorYear = Number(anchorDay.slice(0, 4));
  if (period === "year" || years === null) {
    return yearWindow(anchorYear);
  }
  return { start: yearWindow(years.from).start, end: yearWindow(years.to).end };
}

export function isYearsRange(from: number, to: number): boolean {
  return (
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1000 &&
    to <= 9999 &&
    from <= to &&
    to - from < YEARS_SPAN_LIMIT
  );
}

/** Years mode always charts the last five calendar years, this year included. */
export function lastYearsRange(today: string): YearsRange {
  const year = Number(today.slice(0, 4));
  return { from: year - YEARS_SPAN_LIMIT + 1, to: year };
}

export interface ChartHeading {
  title: string;
  note: string | null;
}

const chartHeadings: Record<ChartPeriod, ChartHeading> = {
  week: { title: "Weekly progression", note: "Shows the last entry of each day" },
  month: { title: "Monthly progression", note: "Shows the last entry of each day" },
  year: { title: "Year progression", note: "Shows the last entry of each month" },
  years: { title: "Progress over the past 5 years", note: "Shows the last entry of each year" },
};

/** The tile's summary heading and the muted note under it. */
export function chartHeading(period: ChartPeriod): ChartHeading {
  return chartHeadings[period];
}

export function selectedChartHeading(count: number): ChartHeading {
  return { title: `Selected entries (${String(count)})`, note: null };
}

export interface ChartPreference {
  period: ChartPeriod;
  /** The day that picks the week, month or year; `null` when none was stored. */
  anchor: string | null;
}

/**
 * Reads a stored `period|YYYY-MM-DD`. Older values are a plain period or `period|from-to`; their missing or invalid
 * anchor reads as `null`.
 */
export function parseChartPreference(value: unknown): ChartPreference {
  if (typeof value !== "string") {
    return { period: defaultChartPeriod, anchor: null };
  }
  const [period, anchor] = value.split("|");
  return { period: parseChartPeriod(period), anchor: parseChartAnchor(anchor) };
}

export function chartPreferenceValue(preference: ChartPreference): string {
  return preference.anchor === null ? preference.period : `${preference.period}|${preference.anchor}`;
}

/** Characters of the widest label per tick style, plus room between labels, in pixels. */
const TICK_LABEL_CHARACTERS: Record<ChartTickStyle, number> = { day: 6, "day-year": 11, month: 3, year: 4 };
const TICK_CHARACTER_WIDTH = 7;
const TICK_LABEL_GAP = 12;

/** How many tick labels of `style` fit side by side across `plotWidth` pixels; at least one. */
export function maxTickLabels(plotWidth: number, style: ChartTickStyle): number {
  const labelWidth = TICK_LABEL_CHARACTERS[style] * TICK_CHARACTER_WIDTH + TICK_LABEL_GAP;
  return Math.max(1, Math.floor(plotWidth / labelWidth));
}

/** An evenly spaced subset of at most `maxCount` ticks: the first, then every `ceil(n / maxCount)`-th. */
export function thinTicks(ticks: readonly number[], maxCount: number): number[] {
  if (ticks.length <= maxCount) {
    return [...ticks];
  }
  const step = Math.ceil(ticks.length / Math.max(1, maxCount));
  return ticks.filter((_, index) => index % step === 0);
}

/** The key of the period that holds `anchorDay`: the Monday for a week, `YYYY-MM` for a month, `YYYY` for a year. */
export function chartPeriodKey(period: Exclude<ChartPeriod, "years">, anchorDay: string): string {
  if (period === "week") {
    return weekContaining(anchorDay)[0];
  }
  if (period === "month") {
    return measurementMonth(anchorDay);
  }
  return anchorDay.slice(0, 4);
}

export function chartKeyAnchor(period: Exclude<ChartPeriod, "years">, key: string, today: string): string {
  if (period === "week") {
    return key;
  }
  if (period === "month") {
    return monthAnchor(key, today);
  }
  return today.startsWith(key) ? today : `${key}-01-01`;
}

/** Distinct `YYYY-MM-DD` days, oldest first. */
export function entryDays(measuredOns: readonly string[]): string[] {
  const days = new Set<string>();
  for (const measuredOn of measuredOns) {
    const day = measuredOn.replace(" ", "T").slice(0, 10);
    if (parseChartAnchor(day) !== null) {
      days.add(day);
    }
  }
  return [...days].sort();
}

/** Keys of the periods that hold at least one entry day, oldest first. */
export function periodsWithEntries(period: Exclude<ChartPeriod, "years">, days: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const day of days) {
    keys.add(chartPeriodKey(period, day));
  }
  return [...keys].sort();
}

export function earlierPeriod(current: string, keys: readonly string[]): string | null {
  let earlier: string | null = null;
  for (const candidate of keys) {
    if (candidate < current && (earlier === null || candidate > earlier)) {
      earlier = candidate;
    }
  }
  return earlier;
}

export function laterPeriod(current: string, keys: readonly string[]): string | null {
  let later: string | null = null;
  for (const candidate of keys) {
    if (candidate > current && (later === null || candidate < later)) {
      later = candidate;
    }
  }
  return later;
}

export function stepAnchor(period: ChartPeriod, anchorDay: string, direction: -1 | 1): string {
  if (period === "week") {
    return addDays(anchorDay, 7 * direction);
  }
  if (period === "month") {
    return addMonthsClamped(anchorDay, direction);
  }
  if (period === "year") {
    return addMonthsClamped(anchorDay, 12 * direction);
  }
  return anchorDay;
}

function shortDay(day: string): string {
  const parts = dayParts(day);
  return `${String(parts.day)} ${SHORT_MONTHS[parts.month - 1]}`;
}

export function chartPeriodLabel(period: ChartPeriod, anchorDay: string): string {
  if (period === "week") {
    const days = weekContaining(anchorDay);
    const first = days[0];
    const last = days[6];
    const firstYear = first.slice(0, 4);
    const lastYear = last.slice(0, 4);
    if (firstYear === lastYear) {
      return `${shortDay(first)} – ${shortDay(last)} ${lastYear}`;
    }
    return `${shortDay(first)} ${firstYear} – ${shortDay(last)} ${lastYear}`;
  }
  if (period === "month") {
    return monthLabel(measurementMonth(anchorDay));
  }
  if (period === "year") {
    return anchorDay.slice(0, 4);
  }
  return "Last 5 years";
}

function numericDay(day: string): string {
  const parts = dayParts(day);
  return `${String(parts.day)}.${String(parts.month)}.${day.slice(2, 4)}`;
}

/** A label that fits the list's month button: a week drops its year, or turns numeric when it crosses years. */
export function compactChartPeriodLabel(period: ChartPeriod, anchorDay: string): string {
  if (period !== "week") {
    return chartPeriodLabel(period, anchorDay);
  }
  const days = weekContaining(anchorDay);
  const first = days[0];
  const last = days[6];
  if (first.slice(0, 4) === last.slice(0, 4)) {
    return `${shortDay(first)} – ${shortDay(last)}`;
  }
  return `${numericDay(first)} – ${numericDay(last)}`;
}

function bucketKey(ms: number, period: ChartPeriod): string {
  const date = new Date(ms);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  if (period === "years") {
    return year;
  }
  const month = `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  if (period === "year") {
    return month;
  }
  return `${month}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Keeps the latest entry of each bucket: a day for a week or month, a month for a year, a year for a span of years.
 * A tie goes to the later entry in the given order, and the survivors keep that order.
 */
export function latestPerBucket<T extends { measured_on: string }>(entries: readonly T[], period: ChartPeriod): T[] {
  const latest = new Map<string, { index: number; ms: number }>();
  entries.forEach((entry, index) => {
    const ms = measuredOnMs(entry.measured_on);
    if (!Number.isFinite(ms)) {
      return;
    }
    const key = bucketKey(ms, period);
    const current = latest.get(key);
    if (current === undefined || ms >= current.ms) {
      latest.set(key, { index, ms });
    }
  });
  const kept = new Set([...latest.values()].map((value) => value.index));
  return entries.filter((_, index) => kept.has(index));
}

function entriesSpreadOut(distinct: readonly number[], minDays: number): boolean {
  const days = [...new Set(distinct.map((point) => Math.floor(point / MILLISECONDS_PER_DAY)))];
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] - days[index - 1] < minDays) {
      return false;
    }
  }
  return true;
}

export function monthAnchor(month: string, today: string): string {
  if (measurementMonth(today) === month) {
    return today;
  }
  return `${month}-01`;
}

export function chartFieldColor(field: MeasurementField): string {
  const index = measurementFields.findIndex((definition) => definition.field === field);
  return `var(--chart-${String(index + 1)})`;
}

export function chartTickLabel(ms: number, style: ChartTickStyle): string {
  const date = new Date(ms);
  const month = SHORT_MONTHS[date.getUTCMonth()];
  const year = String(date.getUTCFullYear());
  if (style === "year") {
    return year;
  }
  if (style === "month") {
    return month;
  }
  const label = `${String(date.getUTCDate())} ${month}`;
  return style === "day-year" ? `${label} ${year}` : label;
}

/** "25 Oct 2026, 08:00" from wall-clock `measured_on`. */
export function chartDateTimeLabel(measuredOn: string): string {
  const ms = measuredOnMs(measuredOn);
  if (!Number.isFinite(ms)) {
    return measuredOn;
  }
  const date = new Date(ms);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${chartTickLabel(ms, "day-year")}, ${hours}:${minutes}`;
}

/** Adds the `measured_on` each entry's difference is against: the entry before it, or `older` for the first. */
export function linkPrevious<T extends { measured_on: string }>(
  oldestFirst: readonly T[],
  older: string | null,
): (T & { previous_measured_on: string | null })[] {
  return oldestFirst.map((entry, index) => ({
    ...entry,
    previous_measured_on: index === 0 ? older : oldestFirst[index - 1].measured_on,
  }));
}

export function chartTickStyle(period: ChartPeriod | "selected", spansYears: boolean): ChartTickStyle {
  if (period === "year") {
    return "month";
  }
  if (period === "years") {
    return "year";
  }
  return period === "selected" && spansYears ? "day-year" : "day";
}

/** Where a period plots an entry: the start of its day (week, month), month (year) or year (years), in UTC. */
export function bucketStartMs(ms: number, period: ChartPeriod): number {
  return floorToUnit(ms, bucketUnit(period));
}

function bucketUnit(period: ChartPeriod): TickUnit {
  if (period === "year") {
    return "month";
  }
  if (period === "years") {
    return "year";
  }
  return "day";
}

/**
 * A period spans its first to its last bucket start plus half a bucket each side, so the edge labels and points
 * clear the plot edges. Selected entries span their points and ticks.
 */
export function chartXDomain(
  points: readonly number[],
  window: ChartWindow | null,
  ticks: readonly number[],
  period: ChartPeriod | "selected",
): [number, number] | null {
  const values = [...points, ...ticks].filter((value) => Number.isFinite(value));
  if (window !== null && period !== "selected") {
    const unit = bucketUnit(period);
    const first = Math.min(floorToUnit(measuredOnMs(window.start), unit), ...values);
    const last = Math.max(floorToUnit(measuredOnMs(window.end) - 1, unit), ...values);
    const firstBucket = floorToUnit(first, unit);
    const lastBucket = floorToUnit(last, unit);
    return [
      first - (nextOfUnit(firstBucket, unit) - firstBucket) / 2,
      last + (nextOfUnit(lastBucket, unit) - lastBucket) / 2,
    ];
  }
  if (values.length === 0) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [min - MILLISECONDS_PER_DAY / 2, max + MILLISECONDS_PER_DAY / 2];
  }
  return [min, max];
}

function floorToStep(value: number): number {
  return Math.floor(value / AXIS_STEP) * AXIS_STEP;
}

function ceilToStep(value: number): number {
  return Math.ceil(value / AXIS_STEP) * AXIS_STEP;
}

export function yAxis(values: readonly number[], field: MeasurementField): ChartYAxis | null {
  if (values.length === 0) {
    return null;
  }
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  const limits = measurementLimits[field];
  const lower = Math.max(floorToStep(min) - AXIS_STEP, floorToStep(limits.min));
  const upper = Math.min(ceilToStep(max) + AXIS_STEP, ceilToStep(limits.max));
  const ticks: number[] = [];
  for (let tick = lower; tick <= upper; tick += AXIS_STEP) {
    ticks.push(tick);
  }
  return { domain: [lower, upper], ticks };
}

export function measuredOnMs(measuredOn: string): number {
  const match = MEASURED_ON.exec(measuredOn);
  if (match === null) {
    return Number.NaN;
  }
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || "0"),
    Number(match[5] || "0"),
    Number(match[6] || "0"),
  );
}

type TickUnit = "day" | "monday" | "month" | "year";

function floorToUnit(ms: number, unit: TickUnit): number {
  const day = Math.floor(ms / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY;
  if (unit === "day") {
    return day;
  }
  if (unit === "monday") {
    const weekday = new Date(day).getUTCDay();
    return day - ((weekday + 6) % 7) * MILLISECONDS_PER_DAY;
  }
  const date = new Date(day);
  if (unit === "year") {
    return Date.UTC(date.getUTCFullYear(), 0, 1);
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function nextOfUnit(ms: number, unit: TickUnit): number {
  if (unit === "day") {
    return ms + MILLISECONDS_PER_DAY;
  }
  if (unit === "monday") {
    return ms + 7 * MILLISECONDS_PER_DAY;
  }
  const date = new Date(ms);
  if (unit === "year") {
    return Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function periodUnit(period: ChartPeriod): TickUnit {
  if (period === "week") {
    return "day";
  }
  if (period === "month") {
    return "monday";
  }
  if (period === "years") {
    return "year";
  }
  return "month";
}

function spanUnit(first: number, last: number): TickUnit {
  const span = last - first;
  if (span <= 7 * MILLISECONDS_PER_DAY) {
    return "day";
  }
  if (span <= 31 * MILLISECONDS_PER_DAY) {
    return "monday";
  }
  return "month";
}

export function xTicks(
  points: readonly number[],
  window: ChartWindow | null,
  period: ChartPeriod | "selected",
): number[] {
  const distinct = [...new Set(points.filter((point) => Number.isFinite(point)))].sort((left, right) => left - right);
  // A year always ticks every month and a span of years every January; shorter periods tick each entry while few.
  const calendarTicks = (period === "year" || period === "years") && window !== null;
  const crowdedMonth = period === "month" && window !== null && !entriesSpreadOut(distinct, MONTH_ENTRY_TICK_MIN_DAYS);
  if (!calendarTicks && !crowdedMonth && distinct.length <= ONE_TICK_PER_ENTRY_LIMIT) {
    return distinct;
  }
  const ticks: number[] = [];
  if (period !== "selected" && window !== null) {
    const unit = periodUnit(period);
    const start = measuredOnMs(window.start);
    const end = measuredOnMs(window.end);
    let tick = floorToUnit(start, unit);
    if (tick < start) {
      tick = nextOfUnit(tick, unit);
    }
    for (; tick < end; tick = nextOfUnit(tick, unit)) {
      ticks.push(tick);
    }
    return ticks;
  }
  if (distinct.length === 0) {
    return ticks;
  }
  const first = distinct[0];
  const last = distinct[distinct.length - 1];
  const unit = period === "selected" ? spanUnit(first, last) : periodUnit(period);
  for (let tick = floorToUnit(first, unit); tick <= last; tick = nextOfUnit(tick, unit)) {
    ticks.push(tick);
  }
  return ticks;
}

export function limitSelection(current: readonly string[], toAdd: readonly string[], limit: number): string[] {
  const selection: string[] = [];
  for (const id of current) {
    if (!selection.includes(id)) {
      selection.push(id);
    }
  }
  for (const id of toAdd) {
    if (selection.length >= limit) {
      break;
    }
    if (!selection.includes(id)) {
      selection.push(id);
    }
  }
  return selection;
}

export function reconcileSelection(ids: readonly string[], foundIds: readonly string[]): string[] {
  const found = new Set(foundIds);
  return ids.filter((id) => found.has(id));
}
